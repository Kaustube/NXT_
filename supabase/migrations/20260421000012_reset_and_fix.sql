-- =========================
-- RESET AND FIX
-- 1. Keep only kaustubh1780@gmail.com
-- 2. Add Bennett University
-- 3. Enable email verification requirement
-- 4. Enforce one account per email
-- =========================

-- ============================================
-- 1. DELETE ALL USERS EXCEPT kaustubh1780@gmail.com
-- ============================================

-- Delete all profiles except kaustubh1780@gmail.com
DELETE FROM public.profiles
WHERE email != 'kaustubh1780@gmail.com';

-- Delete all user roles except kaustubh1780@gmail.com
DELETE FROM public.user_roles
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- Note: You'll need to manually delete users from auth.users in Supabase Dashboard
-- Go to Authentication → Users → Delete all except kaustubh1780@gmail.com

-- ============================================
-- 2. RESET COLLEGES - ADD ONLY BENNETT
-- ============================================

-- Clear all colleges
TRUNCATE TABLE public.colleges CASCADE;

-- Add only Bennett University
INSERT INTO public.colleges (name, short_code, email_domain) VALUES
  ('Bennett University', 'BU', 'bennett.edu.in');

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

-- Create channels for Bennett server
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

-- Create college config for Bennett
INSERT INTO public.college_config (college_id)
SELECT id FROM public.colleges WHERE short_code = 'BU'
ON CONFLICT (college_id) DO NOTHING;

-- ============================================
-- 3. ENFORCE EMAIL VERIFICATION DURING REGISTRATION
-- ============================================

-- Update Supabase Auth settings (you need to do this in Dashboard):
-- 1. Go to Authentication → Settings
-- 2. Enable "Confirm email" under Email Auth
-- 3. Set "Confirm email" to required

-- Add trigger to prevent unverified users from accessing features
CREATE OR REPLACE FUNCTION public.check_email_verified()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Check if email is verified
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = NEW.user_id 
    AND email_confirmed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Email must be verified before accessing this feature';
  END IF;
  RETURN NEW;
END;
$$;

-- Apply to critical tables (optional - can be enabled later)
-- DROP TRIGGER IF EXISTS check_verified_before_post ON public.channel_messages;
-- CREATE TRIGGER check_verified_before_post
--   BEFORE INSERT ON public.channel_messages
--   FOR EACH ROW EXECUTE FUNCTION public.check_email_verified();

-- ============================================
-- 4. ENFORCE ONE ACCOUNT PER EMAIL
-- ============================================

-- This is already enforced by Supabase Auth
-- But we can add a check in profiles table

-- Add unique constraint on email in profiles (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_email_unique'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  END IF;
END $$;

-- ============================================
-- 5. UPDATE GLOBAL SERVERS (Keep existing)
-- ============================================

-- Ensure global servers exist
INSERT INTO public.servers (name, slug, kind, description) VALUES
  ('Coding Community', 'coding', 'global', 'Talk shop with coders across colleges'),
  ('AI / ML', 'ai-ml', 'global', 'Research, models and projects'),
  ('Startup & Entrepreneurship', 'startup', 'global', 'Founders, ideas and growth')
ON CONFLICT (slug) DO NOTHING;

-- Create channels for global servers if they don't exist
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
-- 6. MAKE kaustubh1780@gmail.com SUPER ADMIN
-- ============================================

-- Promote kaustubh1780@gmail.com to super admin
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

-- ============================================
-- 7. CLEAN UP OLD DATA
-- ============================================

-- Clear old server members (will be recreated on login)
DELETE FROM public.server_members
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- Clear old messages
DELETE FROM public.channel_messages
WHERE author_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

DELETE FROM public.dm_messages
WHERE sender_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- Clear old tasks
DELETE FROM public.tasks
WHERE user_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- Clear old connections
DELETE FROM public.connections
WHERE requester_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
)
AND recipient_id NOT IN (
  SELECT id FROM auth.users WHERE email = 'kaustubh1780@gmail.com'
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Show what's left
SELECT 'Remaining Users:' as info;
SELECT email, email_confirmed_at FROM auth.users;

SELECT 'Colleges:' as info;
SELECT name, email_domain FROM public.colleges;

SELECT 'Servers:' as info;
SELECT name, kind FROM public.servers ORDER BY kind, name;

SELECT 'Admin Users:' as info;
SELECT u.email, ur.admin_level
FROM public.user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
