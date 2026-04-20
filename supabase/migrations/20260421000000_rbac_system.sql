-- =========================
-- ROLE-BASED ACCESS CONTROL (RBAC)
-- Multiple admin types with granular permissions
-- =========================

-- Extend role types
DROP TYPE IF EXISTS public.app_role CASCADE;
CREATE TYPE public.app_role AS ENUM (
  'admin',           -- Full system admin
  'professor',       -- LMS management
  'server_admin',    -- Server-specific admin
  'server_mod',      -- Server-specific moderator
  'member'           -- Regular user
);

-- Recreate user_roles table with new enum
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE public.user_roles ALTER COLUMN role TYPE TEXT;
DROP TABLE IF EXISTS public.user_roles CASCADE;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  scope_type TEXT, -- 'global', 'server', 'course'
  scope_id UUID,   -- server_id or course_id
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role, scope_type, scope_id)
);

CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_scope ON public.user_roles(scope_type, scope_id);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Updated has_role function with scope support
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role = _role
    AND (scope_type = 'global' OR scope_type IS NULL)
  )
$$;

-- Check if user has role in specific scope
CREATE OR REPLACE FUNCTION public.has_scoped_role(
  _user_id UUID, 
  _role app_role,
  _scope_type TEXT,
  _scope_id UUID
)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role = _role
    AND scope_type = _scope_type
    AND scope_id = _scope_id
  )
$$;

-- Check if user is admin of any type
CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND role IN ('admin', 'professor', 'server_admin')
  )
$$;

-- Permissions table for fine-grained control
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL, -- 'lms', 'server', 'user', 'content', etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Role-Permission mapping
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  UNIQUE (role, permission_id)
);

-- Insert default permissions
INSERT INTO public.permissions (name, description, category) VALUES
  -- LMS permissions
  ('lms.course.create', 'Create new courses', 'lms'),
  ('lms.course.edit', 'Edit course content', 'lms'),
  ('lms.course.delete', 'Delete courses', 'lms'),
  ('lms.course.publish', 'Publish/unpublish courses', 'lms'),
  ('lms.student.grade', 'Grade student submissions', 'lms'),
  ('lms.student.view', 'View student progress', 'lms'),
  
  -- Server permissions
  ('server.create', 'Create new servers', 'server'),
  ('server.edit', 'Edit server settings', 'server'),
  ('server.delete', 'Delete servers', 'server'),
  ('server.channel.manage', 'Manage channels', 'server'),
  ('server.member.kick', 'Kick members', 'server'),
  ('server.member.ban', 'Ban members', 'server'),
  ('server.message.delete', 'Delete any message', 'server'),
  ('server.message.pin', 'Pin messages', 'server'),
  
  -- User management
  ('user.view.all', 'View all user profiles', 'user'),
  ('user.edit.any', 'Edit any user profile', 'user'),
  ('user.role.assign', 'Assign roles to users', 'user'),
  ('user.ban', 'Ban users from platform', 'user'),
  
  -- Content moderation
  ('content.moderate', 'Moderate user content', 'content'),
  ('content.feature', 'Feature content on homepage', 'content'),
  
  -- System
  ('system.settings', 'Manage system settings', 'system'),
  ('system.analytics', 'View system analytics', 'system');

-- Assign permissions to roles
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions; -- Admin gets all permissions

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'professor', id FROM public.permissions WHERE category = 'lms';

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'server_admin', id FROM public.permissions WHERE category IN ('server', 'content');

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'server_mod', id FROM public.permissions 
WHERE name IN ('server.channel.manage', 'server.member.kick', 'server.message.delete', 'server.message.pin', 'content.moderate');

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(
  _user_id UUID,
  _permission_name TEXT
)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
    AND p.name = _permission_name
    AND (ur.scope_type = 'global' OR ur.scope_type IS NULL)
  )
$$;

-- Function to check scoped permission (e.g., server-specific)
CREATE OR REPLACE FUNCTION public.has_scoped_permission(
  _user_id UUID,
  _permission_name TEXT,
  _scope_type TEXT,
  _scope_id UUID
)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role = ur.role
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = _user_id
    AND p.name = _permission_name
    AND ur.scope_type = _scope_type
    AND ur.scope_id = _scope_id
  ) OR public.has_permission(_user_id, _permission_name) -- Global admins override
$$;

-- Updated promote_to_admin function
CREATE OR REPLACE FUNCTION public.promote_to_admin(p_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = p_email;
  IF v_uid IS NULL THEN
    RETURN 'User not found: ' || p_email;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role, scope_type)
  VALUES (v_uid, 'admin', 'global')
  ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;
  
  RETURN 'Promoted ' || p_email || ' to admin';
END;
$$;

-- Function to promote user to professor
CREATE OR REPLACE FUNCTION public.promote_to_professor(p_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = p_email;
  IF v_uid IS NULL THEN
    RETURN 'User not found: ' || p_email;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role, scope_type)
  VALUES (v_uid, 'professor', 'global')
  ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;
  
  RETURN 'Promoted ' || p_email || ' to professor';
END;
$$;

-- Function to assign server admin/mod
CREATE OR REPLACE FUNCTION public.assign_server_role(
  p_email TEXT,
  p_server_id UUID,
  p_role app_role
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID;
BEGIN
  IF p_role NOT IN ('server_admin', 'server_mod') THEN
    RETURN 'Invalid role. Use server_admin or server_mod';
  END IF;
  
  SELECT id INTO v_uid FROM auth.users WHERE email = p_email;
  IF v_uid IS NULL THEN
    RETURN 'User not found: ' || p_email;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role, scope_type, scope_id)
  VALUES (v_uid, p_role, 'server', p_server_id)
  ON CONFLICT (user_id, role, scope_type, scope_id) DO NOTHING;
  
  RETURN 'Assigned ' || p_role || ' role to ' || p_email || ' for server ' || p_server_id;
END;
$$;

-- RLS Policies for new tables
CREATE POLICY "Roles readable by authenticated"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'user.role.assign'))
  WITH CHECK (public.has_permission(auth.uid(), 'user.role.assign'));

CREATE POLICY "Permissions readable by authenticated"
  ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Role permissions readable by authenticated"
  ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Update existing policies to use new permission system
-- Servers: admins and server admins can manage
DROP POLICY IF EXISTS "Admins manage servers" ON public.servers;
CREATE POLICY "Authorized users manage servers"
  ON public.servers FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'server.edit') OR
    public.has_scoped_permission(auth.uid(), 'server.edit', 'server', id)
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'server.create') OR
    public.has_scoped_permission(auth.uid(), 'server.edit', 'server', id)
  );

-- Channels: server admins and mods can manage
DROP POLICY IF EXISTS "Admins manage channels" ON public.channels;
CREATE POLICY "Authorized users manage channels"
  ON public.channels FOR ALL TO authenticated
  USING (
    public.has_permission(auth.uid(), 'server.channel.manage') OR
    public.has_scoped_permission(auth.uid(), 'server.channel.manage', 'server', server_id)
  )
  WITH CHECK (
    public.has_permission(auth.uid(), 'server.channel.manage') OR
    public.has_scoped_permission(auth.uid(), 'server.channel.manage', 'server', server_id)
  );

-- Channel messages: mods can delete any message
DROP POLICY IF EXISTS "Admins manage channel messages" ON public.channel_messages;
CREATE POLICY "Mods delete channel messages"
  ON public.channel_messages FOR DELETE TO authenticated
  USING (
    auth.uid() = author_id OR
    public.has_permission(auth.uid(), 'server.message.delete') OR
    public.has_scoped_permission(auth.uid(), 'server.message.delete', 'server', 
      (SELECT server_id FROM public.channels WHERE id = channel_id)
    )
  );

-- Migrate existing admin roles
INSERT INTO public.user_roles (user_id, role, scope_type)
SELECT user_id, 'admin'::app_role, 'global'
FROM public.user_roles
WHERE role::text = 'admin'
ON CONFLICT DO NOTHING;

-- Ensure all users have member role
INSERT INTO public.user_roles (user_id, role, scope_type)
SELECT id, 'member'::app_role, 'global'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.users.id AND role = 'member'
)
ON CONFLICT DO NOTHING;
