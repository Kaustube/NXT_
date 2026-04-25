-- Add "No College" option and restrict features for non-college users

-- Add a special "No College" entry
INSERT INTO public.colleges (id, name, short_code, email_domain) VALUES
  ('00000000-0000-0000-0000-000000000000', 'No College / Independent', 'NONE', 'none')
ON CONFLICT (id) DO UPDATE SET name = 'No College / Independent';

-- Add column to profiles to track if user has college access
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS has_college_access BOOLEAN NOT NULL DEFAULT false;

-- Update existing profiles with college to have access
UPDATE public.profiles SET has_college_access = true WHERE college_id IS NOT NULL AND college_id != '00000000-0000-0000-0000-000000000000';

-- Function to check college access
CREATE OR REPLACE FUNCTION public.has_college_access(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT has_college_access FROM public.profiles WHERE user_id = _user_id),
    false
  )
$$;

-- Update server visibility policy
DROP POLICY IF EXISTS "Servers readable by authenticated" ON public.servers;
CREATE POLICY "Servers readable by authenticated" ON public.servers FOR SELECT TO authenticated
USING (
  kind = 'global' OR -- Public servers visible to all
  (kind = 'college' AND public.has_college_access(auth.uid())) OR -- College servers only if has access
  (kind = 'group' AND (
    is_private = false OR
    EXISTS (SELECT 1 FROM public.server_members sm WHERE sm.server_id = servers.id AND sm.user_id = auth.uid())
  ))
);

-- Restrict LMS access (if courses table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
    DROP POLICY IF EXISTS "Users view published courses" ON public.courses;
    CREATE POLICY "Users view published courses" ON public.courses FOR SELECT TO authenticated
    USING (
      status = 'published' AND
      (is_public = true OR public.has_college_access(auth.uid()))
    );
  END IF;
END $$;

-- Restrict sports booking access (if sports_facilities table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sports_facilities') THEN
    DROP POLICY IF EXISTS "Users view facilities" ON public.sports_facilities;
    CREATE POLICY "Users view facilities" ON public.sports_facilities FOR SELECT TO authenticated
    USING (public.has_college_access(auth.uid()));
    
    DROP POLICY IF EXISTS "Users create bookings" ON public.sports_bookings;
    CREATE POLICY "Users create bookings" ON public.sports_bookings FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND public.has_college_access(auth.uid()));
  END IF;
END $$;

-- Update handle_new_user to set has_college_access
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email TEXT := NEW.email;
  v_domain TEXT := split_part(NEW.email, '@', 2);
  v_local TEXT := split_part(NEW.email, '@', 1);
  v_college UUID;
  v_display TEXT := COALESCE(NEW.raw_user_meta_data->>'display_name', v_local);
  v_username TEXT := COALESCE(NEW.raw_user_meta_data->>'username', v_local);
  v_roll TEXT := NEW.raw_user_meta_data->>'roll_number';
  v_has_access BOOLEAN := false;
BEGIN
  SELECT id INTO v_college FROM public.colleges WHERE email_domain = v_domain;
  
  -- Set has_college_access to true if college found and not "No College"
  IF v_college IS NOT NULL AND v_college != '00000000-0000-0000-0000-000000000000' THEN
    v_has_access := true;
  END IF;
  
  INSERT INTO public.profiles (user_id, display_name, username, email, college_id, roll_number, has_college_access)
  VALUES (NEW.id, v_display, v_username, v_email, v_college, v_roll, v_has_access)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Verify
SELECT 'Setup complete!' as status;
SELECT name, short_code FROM colleges ORDER BY name;
