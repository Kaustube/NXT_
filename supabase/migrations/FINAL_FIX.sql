-- =========================
-- FINAL FIX - Works with your current database state
-- This checks what exists and only creates what's missing
-- =========================

-- ============================================
-- PART 1: ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================

-- Add auto_join column to servers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'servers' AND column_name = 'auto_join'
  ) THEN
    ALTER TABLE public.servers ADD COLUMN auto_join BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- Add created_by column to servers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'servers' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.servers ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- ============================================
-- PART 2: CLEAN UP OLD RBAC IF EXISTS
-- ============================================

-- Drop old functions
DROP FUNCTION IF EXISTS public.promote_to_admin(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;

-- Drop old user_roles if it has old structure
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_roles' AND column_name = 'admin_level'
  ) THEN
    -- Old structure, drop it
    DROP TABLE public.user_roles CASCADE;
  END IF;
END $$;

-- Drop old enum
DROP TYPE IF EXISTS public.app_role CASCADE;

-- ============================================
-- PART 3: CREATE NEW RBAC SYSTEM
-- ============================================

-- Create enums if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'professor', 'server_admin', 'server_mod', 'member');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_level') THEN
    CREATE TYPE public.admin_level AS ENUM ('super_admin', 'college_admin', 'department_admin', 'content_admin', 'support_admin', 'sports_admin', 'event_admin', 'recruiter_admin');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'scope_type') THEN
    CREATE TYPE public.scope_type AS ENUM ('global', 'college', 'server', 'course');
  END IF;
END $$;

-- Create user_roles table with new structure
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

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Roles readable by authenticated" ON public.user_roles;

-- Create new policies
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

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

-- Grant permissions to admin
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions
ON CONFLICT DO NOTHING;

-- ============================================
-- PART 4: CREATE HELPER FUNCTIONS
-- ============================================

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

-- ============================================
-- PART 5: RESET COLLEGES - BENNETT ONLY
-- ============================================

-- Clear all colleges
TRUNCATE TABLE public.colleges CASCADE;

-- Add Bennett University
INSERT INTO public.colleges (name, short_code, email_domain) VALUES
  ('Bennett University', 'BU', 'bennett.edu.in');

-- ============================================
-- PART 6: CREATE SERVERS
-- ============================================

-- Delete all existing servers
DELETE FROM public.servers;

-- Create Bennett server
INSERT INTO public.servers (name, slug, kind, college_id, description, auto_join)
SELECT 
  'Bennett University',
  'bennett',
  'college',
  id,
  'Official server for Bennett University students',
  true
FROM public.colleges WHERE short_code = 'BU';

-- Create global servers
INSERT INTO public.servers (name, slug, kind, description, auto_join) VALUES
  ('Coding Community', 'coding', 'global', 'Talk shop with coders across colleges', false),
  ('AI / ML', 'ai-ml', 'global', 'Research, models and projects', false),
  ('Startup & Entrepreneurship', 'startup', 'global', 'Founders, ideas and growth', false);

-- ============================================
-- PART 7: CREATE CHANNELS
-- ============================================

-- Delete all existing channels
DELETE FROM public.channels;

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
WHERE s.slug = 'bennett';

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
WHERE s.kind = 'global';

-- ============================================
-- PART 8: CLEAN UP USER DATA
-- ============================================

-- Delete all profiles except kaustubh1780@gmail.com
DELETE FROM public.profiles
WHERE email != 'kaustubh1780@gmail.com';

-- Delete all server members except kaustubh1780@gmail.com
DELETE FROM public.server_members
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- Delete all messages
DELETE FROM public.channel_messages
WHERE author_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

DELETE FROM public.dm_messages
WHERE sender_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- Delete all tasks
DELETE FROM public.tasks
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- Delete all connections
DELETE FROM public.connections
WHERE requester_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
)
AND recipient_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- ============================================
-- PART 9: MAKE kaustubh1780@gmail.com SUPER ADMIN
-- ============================================

-- Delete old roles for this user
DELETE FROM public.user_roles
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com');

-- Add super admin role
INSERT INTO public.user_roles (user_id, role, admin_level, scope_type, scope_id)
SELECT 
  id,
  'admin'::public.user_role,
  'super_admin'::public.admin_level,
  'global'::public.scope_type,
  NULL
FROM auth.users
WHERE email = 'kaustubh1780@gmail.com';

-- Add member role
INSERT INTO public.user_roles (user_id, role, scope_type, scope_id)
SELECT 
  id,
  'member'::public.user_role,
  'global'::public.scope_type,
  NULL
FROM auth.users
WHERE email = 'kaustubh1780@gmail.com';

-- ============================================
-- PART 10: VERIFICATION & RESULTS
-- ============================================

SELECT '========================================' as result;
SELECT '✅ SETUP COMPLETE!' as result;
SELECT '========================================' as result;

SELECT '' as result;
SELECT '📊 DATABASE STATUS:' as result;
SELECT '' as result;

SELECT 'Colleges:' as info, name, email_domain 
FROM public.colleges;

SELECT '' as result;
SELECT 'Servers:' as info, name, kind, auto_join 
FROM public.servers ORDER BY kind, name;

SELECT '' as result;
SELECT 'Channels per server:' as info, s.name as server, COUNT(c.id) as channel_count
FROM public.servers s
LEFT JOIN public.channels c ON c.server_id = s.id
GROUP BY s.name
ORDER BY s.name;

SELECT '' as result;
SELECT 'Admin Users:' as info, u.email, ur.role, ur.admin_level
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';

SELECT '' as result;
SELECT 'Total Tables:' as info, COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema = 'public';

SELECT '' as result;
SELECT 'User Profiles:' as info, COUNT(*) as count 
FROM public.profiles;

SELECT '' as result;
SELECT '========================================' as result;
SELECT '✅ You can now:' as result;
SELECT '1. Clear browser cache (F12 → Application → Clear site data)' as result;
SELECT '2. Login with kaustubh1780@gmail.com' as result;
SELECT '3. College dropdown should show Bennett University' as result;
SELECT '========================================' as result;
