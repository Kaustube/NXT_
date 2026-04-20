-- =========================
-- MULTI-LEVEL ADMIN SYSTEM
-- Different admin levels with hierarchical permissions
-- =========================

-- Admin levels
CREATE TYPE public.admin_level AS ENUM (
  'super_admin',      -- Full system access, can manage other admins
  'college_admin',    -- College-wide administration
  'department_admin', -- Department-specific administration
  'content_admin',    -- Content management (courses, problems, etc.)
  'support_admin',    -- Support and moderation
  'sports_admin',     -- Sports facility management
  'event_admin'       -- Event management
);

-- Enhanced user roles with admin levels
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS admin_level admin_level;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS permissions_override JSONB DEFAULT '{}'::jsonb;

-- Admin activity log
CREATE TABLE public.admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT, -- 'user', 'course', 'problem', 'ticket', etc.
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_activity_log_admin ON public.admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_log_created ON public.admin_activity_log(created_at DESC);
CREATE INDEX idx_admin_activity_log_action ON public.admin_activity_log(action);
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;

-- Admin permissions matrix
CREATE TABLE public.admin_permissions_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_level admin_level NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  can_grant BOOLEAN NOT NULL DEFAULT false, -- Can this admin grant this permission to others?
  UNIQUE (admin_level, permission_id)
);

ALTER TABLE public.admin_permissions_matrix ENABLE ROW LEVEL SECURITY;

-- Admin teams/groups
CREATE TABLE public.admin_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
  lead_admin_id UUID REFERENCES auth.users(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_teams_college ON public.admin_teams(college_id);
ALTER TABLE public.admin_teams ENABLE ROW LEVEL SECURITY;

-- Admin team members
CREATE TABLE public.admin_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.admin_teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'lead', 'member'
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX idx_admin_team_members_team ON public.admin_team_members(team_id);
CREATE INDEX idx_admin_team_members_user ON public.admin_team_members(user_id);
ALTER TABLE public.admin_team_members ENABLE ROW LEVEL SECURITY;

-- Content moderation queue
CREATE TABLE public.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL, -- 'course', 'gig', 'listing', 'message', 'profile'
  content_id UUID NOT NULL,
  reported_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewing', 'approved', 'rejected', 'removed'
  assigned_to UUID REFERENCES auth.users(id),
  moderator_notes TEXT,
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_moderation_queue_status ON public.moderation_queue(status);
CREATE INDEX idx_moderation_queue_assigned ON public.moderation_queue(assigned_to);
CREATE INDEX idx_moderation_queue_priority ON public.moderation_queue(priority);
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

-- System settings (only super admins can modify)
CREATE TABLE public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'general', 'security', 'features', 'limits'
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Functions

-- Check if user has admin level
CREATE OR REPLACE FUNCTION public.has_admin_level(
  p_user_id UUID,
  p_admin_level admin_level
)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND admin_level = p_admin_level
  )
$$;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND admin_level = 'super_admin'
  )
$$;

-- Log admin action
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_admin_id UUID,
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.admin_activity_log (admin_id, action, target_type, target_id, details)
  VALUES (p_admin_id, p_action, p_target_type, p_target_id, p_details);
END;
$$;

-- Promote user to admin level
CREATE OR REPLACE FUNCTION public.promote_to_admin_level(
  p_email TEXT,
  p_admin_level admin_level,
  p_scope_type TEXT DEFAULT 'global',
  p_scope_id UUID DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = p_email;
  IF v_uid IS NULL THEN
    RETURN 'User not found: ' || p_email;
  END IF;
  
  -- Insert or update role
  INSERT INTO public.user_roles (user_id, role, admin_level, scope_type, scope_id)
  VALUES (v_uid, 'admin', p_admin_level, p_scope_type, p_scope_id)
  ON CONFLICT (user_id, role, scope_type, scope_id) 
  DO UPDATE SET admin_level = p_admin_level;
  
  RETURN 'Promoted ' || p_email || ' to ' || p_admin_level::text;
END;
$$;

-- RLS Policies

CREATE POLICY "Admins view activity log"
  ON public.admin_activity_log FOR SELECT TO authenticated
  USING (
    auth.uid() = admin_id OR
    public.is_super_admin(auth.uid())
  );

CREATE POLICY "System logs admin actions"
  ON public.admin_activity_log FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = admin_id);

CREATE POLICY "Admins view permissions matrix"
  ON public.admin_permissions_matrix FOR SELECT TO authenticated
  USING (public.is_any_admin(auth.uid()));

CREATE POLICY "Super admins manage permissions matrix"
  ON public.admin_permissions_matrix FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Admins view teams"
  ON public.admin_teams FOR SELECT TO authenticated
  USING (public.is_any_admin(auth.uid()));

CREATE POLICY "Super admins manage teams"
  ON public.admin_teams FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Team members view their teams"
  ON public.admin_team_members FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    public.is_super_admin(auth.uid())
  );

CREATE POLICY "Admins view moderation queue"
  ON public.moderation_queue FOR SELECT TO authenticated
  USING (
    public.has_permission(auth.uid(), 'content.moderate') OR
    auth.uid() = assigned_to
  );

CREATE POLICY "Admins manage moderation queue"
  ON public.moderation_queue FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'content.moderate'))
  WITH CHECK (public.has_permission(auth.uid(), 'content.moderate'));

CREATE POLICY "Super admins view system settings"
  ON public.system_settings FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins manage system settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Triggers
CREATE TRIGGER trg_moderation_queue_updated BEFORE UPDATE ON public.moderation_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed admin permissions matrix
INSERT INTO public.admin_permissions_matrix (admin_level, permission_id, can_grant)
SELECT 'super_admin', id, true FROM public.permissions; -- Super admin gets all permissions and can grant them

INSERT INTO public.admin_permissions_matrix (admin_level, permission_id, can_grant)
SELECT 'college_admin', id, false FROM public.permissions 
WHERE category IN ('college', 'user', 'content', 'sports', 'server');

INSERT INTO public.admin_permissions_matrix (admin_level, permission_id, can_grant)
SELECT 'content_admin', id, false FROM public.permissions 
WHERE category IN ('lms', 'content');

INSERT INTO public.admin_permissions_matrix (admin_level, permission_id, can_grant)
SELECT 'support_admin', id, false FROM public.permissions 
WHERE name LIKE '%moderate%' OR name LIKE '%ticket%';

INSERT INTO public.admin_permissions_matrix (admin_level, permission_id, can_grant)
SELECT 'sports_admin', id, false FROM public.permissions 
WHERE category = 'sports';

INSERT INTO public.admin_permissions_matrix (admin_level, permission_id, can_grant)
SELECT 'event_admin', id, false FROM public.permissions 
WHERE name LIKE '%event%';

-- Seed system settings
INSERT INTO public.system_settings (key, value, description, category) VALUES
  ('platform_name', '"NXT Campus"'::jsonb, 'Platform name', 'general'),
  ('maintenance_mode', 'false'::jsonb, 'Enable maintenance mode', 'general'),
  ('registration_enabled', 'true'::jsonb, 'Allow new user registration', 'security'),
  ('max_file_upload_mb', '50'::jsonb, 'Maximum file upload size in MB', 'limits'),
  ('daily_problem_enabled', 'true'::jsonb, 'Enable daily coding problem', 'features'),
  ('gamification_enabled', 'true'::jsonb, 'Enable XP and badges', 'features'),
  ('ai_chatbot_enabled', 'true'::jsonb, 'Enable AI chatbot', 'features');

-- Add new permissions for admin management
INSERT INTO public.permissions (name, description, category) VALUES
  ('admin.manage', 'Manage other administrators', 'admin'),
  ('admin.view_logs', 'View admin activity logs', 'admin'),
  ('system.settings', 'Manage system settings', 'system'),
  ('moderation.manage', 'Manage moderation queue', 'moderation');

-- Assign to super admin
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions WHERE category IN ('admin', 'system', 'moderation');
