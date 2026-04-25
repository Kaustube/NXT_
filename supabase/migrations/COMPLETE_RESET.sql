-- =========================
-- COMPLETE RESET AND SETUP
-- This file will work regardless of your current database state
-- Run this ONE file to set everything up
-- =========================

-- ============================================
-- PART 1: CLEAN UP OLD STRUCTURE
-- ============================================

-- Drop old functions that might conflict
DROP FUNCTION IF EXISTS public.promote_to_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;

-- Drop old user_roles if it exists with old structure
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.user_roles_backup_20260420 CASCADE;

-- Drop old enums
DROP TYPE IF EXISTS public.app_role CASCADE;

-- ============================================
-- PART 2: CREATE NEW RBAC SYSTEM
-- ============================================

-- Create new enums
CREATE TYPE public.user_role AS ENUM ('admin', 'professor', 'server_admin', 'server_mod', 'member');
CREATE TYPE public.admin_level AS ENUM ('super_admin', 'college_admin', 'department_admin', 'content_admin', 'support_admin', 'sports_admin', 'event_admin', 'recruiter_admin');
CREATE TYPE public.scope_type AS ENUM ('global', 'college', 'server', 'course');

-- Create new user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'member',
  admin_level admin_level,
  scope_type scope_type NOT NULL DEFAULT 'global',
  scope_id UUID,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_scope ON public.user_roles(scope_type, scope_id);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert basic permissions
INSERT INTO public.permissions (name, description, category) VALUES
  ('users.read', 'View user profiles', 'user'),
  ('users.manage', 'Manage users', 'user'),
  ('servers.manage', 'Manage servers', 'server'),
  ('content.manage', 'Manage content', 'content')
ON CONFLICT (name) DO NOTHING;

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE (role, permission_id)
);

-- Grant permissions to admin role
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- Create helper functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id AND p.name = _permission
  )
$$;

CREATE OR REPLACE FUNCTION public.promote_to_admin_level(p_email TEXT, p_level admin_level)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = p_email;
  IF v_uid IS NULL THEN
    RETURN 'User not found: ' || p_email;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role, admin_level, scope_type)
  VALUES (v_uid, 'admin', p_level, 'global')
  ON CONFLICT (user_id, role, scope_type, scope_id) 
  DO UPDATE SET admin_level = p_level;
  
  RETURN 'Promoted ' || p_email || ' to ' || p_level::text;
END;
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- PART 3: RESET COLLEGES - BENNETT ONLY
-- ============================================

-- Clear all colleges
TRUNCATE TABLE public.colleges CASCADE;

-- Add only Bennett University
INSERT INTO public.colleges (name, short_code, email_domain) VALUES
  ('Bennett University', 'BU', 'bennett.edu.in');

-- ============================================
-- PART 4: CREATE SERVERS
-- ============================================

-- Create Bennett server
INSERT INTO public.servers (name, slug, kind, college_id, description, auto_join)
SELECT 
  'Bennett University',
  'bennett',
  'college',
  id,
  'Official server for Bennett University students',
  true
FROM public.colleges WHERE short_code = 'BU'
ON CONFLICT (slug) DO NOTHING;

-- Create global servers
INSERT INTO public.servers (name, slug, kind, description) VALUES
  ('Coding Community', 'coding', 'global', 'Talk shop with coders across colleges'),
  ('AI / ML', 'ai-ml', 'global', 'Research, models and projects'),
  ('Startup & Entrepreneurship', 'startup', 'global', 'Founders, ideas and growth')
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- PART 5: CREATE CHANNELS
-- ============================================

-- Channels for Bennett server
INSERT INTO public.channels (server_id, name, type, position)
SELECT s.id, c.name, c.type::channel_type, c.pos 
FROM public.servers s
CROSS JOIN (VALUES
  ('general', 'text', 0),
  ('announcements', 'text', 1),
  ('academics', 'text', 2),
  ('projects', 'text', 3),
  ('placements', 'text', 4),
  ('sports', 'text', 5),
  ('events', 'text', 6),
  ('random', 'text', 7)
) AS c(name, type, pos)
WHERE s.slug = 'bennett'
ON CONFLICT DO NOTHING;

-- Channels for global servers
INSERT INTO public.channels (server_id, name, type, position)
SELECT s.id, c.name, c.type::channel_type, c.pos 
FROM public.servers s
CROSS JOIN (VALUES
  ('general', 'text', 0),
  ('resources', 'text', 1),
  ('showcase', 'text', 2),
  ('help', 'text', 3)
) AS c(name, type, pos)
WHERE s.kind = 'global'
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 6: CLEAN UP USER DATA
-- ============================================

-- Delete all profiles except kaustubh1780@gmail.com
DELETE FROM public.profiles
WHERE email != 'kaustubh1780@gmail.com';

-- Delete all server members except kaustubh1780@gmail.com
DELETE FROM public.server_members
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- Delete all messages except from kaustubh1780@gmail.com
DELETE FROM public.channel_messages
WHERE author_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

DELETE FROM public.dm_messages
WHERE sender_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- Delete all tasks except kaustubh1780@gmail.com's
DELETE FROM public.tasks
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- Delete all connections except kaustubh1780@gmail.com's
DELETE FROM public.connections
WHERE requester_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
)
AND recipient_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- ============================================
-- PART 7: MAKE kaustubh1780@gmail.com SUPER ADMIN
-- ============================================

-- Promote to super admin
INSERT INTO public.user_roles (user_id, role, admin_level, scope_type, scope_id)
SELECT 
  id,
  'admin'::public.user_role,
  'super_admin'::public.admin_level,
  'global'::public.scope_type,
  NULL
FROM auth.users
WHERE email = 'kaustubh1780@gmail.com'
ON CONFLICT (user_id, role, scope_type, scope_id) 
DO UPDATE SET admin_level = 'super_admin'::public.admin_level;

-- Also add member role
INSERT INTO public.user_roles (user_id, role, scope_type, scope_id)
SELECT 
  id,
  'member'::public.user_role,
  'global'::public.scope_type,
  NULL
FROM auth.users
WHERE email = 'kaustubh1780@gmail.com'
ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;

-- ============================================
-- PART 8: VERIFICATION
-- ============================================

-- Show results
SELECT '=== SETUP COMPLETE ===' as status;

SELECT 'Colleges:' as info;
SELECT name, email_domain FROM public.colleges;

SELECT 'Servers:' as info;
SELECT name, kind FROM public.servers ORDER BY kind, name;

SELECT 'Admin Users:' as info;
SELECT u.email, ur.role, ur.admin_level
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';

SELECT 'Total Tables:' as info;
SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public';
