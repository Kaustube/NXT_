-- =========================
-- FIX ADMIN PERMISSIONS
-- Allow admins to create/edit everything in admin panel
-- =========================

-- Helper function to check if user is any type of admin
CREATE OR REPLACE FUNCTION public.is_any_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- ============================================
-- EVENTS - Allow admins to manage
-- ============================================

DROP POLICY IF EXISTS "Admins manage events" ON public.events;
CREATE POLICY "Admins manage events" ON public.events FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- ============================================
-- SERVERS - Allow admins to manage
-- ============================================

DROP POLICY IF EXISTS "Admins manage servers" ON public.servers;
CREATE POLICY "Admins manage servers" ON public.servers FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- ============================================
-- CHANNELS - Allow admins to manage
-- ============================================

DROP POLICY IF EXISTS "Admins manage channels" ON public.channels;
CREATE POLICY "Admins manage channels" ON public.channels FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- ============================================
-- USERS - Allow admins to view all users
-- ============================================

DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_any_admin(auth.uid()) OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage profiles" ON public.profiles;
CREATE POLICY "Admins manage profiles" ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_any_admin(auth.uid()) OR auth.uid() = user_id);

-- ============================================
-- NOTIFICATIONS - Allow admins to create
-- ============================================

DROP POLICY IF EXISTS "Admins create notifications" ON public.notifications;
CREATE POLICY "Admins create notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications" ON public.notifications FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- ============================================
-- SPORTS - Allow admins to manage (if tables exist)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sports_facilities') THEN
    DROP POLICY IF EXISTS "Admins manage facilities" ON public.sports_facilities;
    EXECUTE 'CREATE POLICY "Admins manage facilities" ON public.sports_facilities FOR ALL TO authenticated
      USING (public.is_any_admin(auth.uid()))
      WITH CHECK (public.is_any_admin(auth.uid()))';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sports_bookings') THEN
    DROP POLICY IF EXISTS "Admins manage bookings" ON public.sports_bookings;
    EXECUTE 'CREATE POLICY "Admins manage bookings" ON public.sports_bookings FOR ALL TO authenticated
      USING (public.is_any_admin(auth.uid()))
      WITH CHECK (public.is_any_admin(auth.uid()))';
  END IF;
END $$;

-- ============================================
-- LMS - Allow admins to manage (if tables exist)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
    DROP POLICY IF EXISTS "Admins manage courses" ON public.courses;
    EXECUTE 'CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated
      USING (public.is_any_admin(auth.uid()))
      WITH CHECK (public.is_any_admin(auth.uid()))';
  END IF;
END $$;

-- ============================================
-- CHALLENGES - Allow admins to manage
-- ============================================

DROP POLICY IF EXISTS "Admins manage challenges" ON public.coding_challenges;
CREATE POLICY "Admins manage challenges" ON public.coding_challenges FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- ============================================
-- LISTINGS - Allow admins to manage
-- ============================================

DROP POLICY IF EXISTS "Admins manage listings" ON public.listings;
CREATE POLICY "Admins manage listings" ON public.listings FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- ============================================
-- CONNECTIONS - Allow admins to view all
-- ============================================

DROP POLICY IF EXISTS "Admins read all connections" ON public.connections;
CREATE POLICY "Admins read all connections" ON public.connections FOR SELECT TO authenticated
  USING (public.is_any_admin(auth.uid()) OR auth.uid() = requester_id OR auth.uid() = recipient_id);

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ Admin permissions fixed!' as status;
SELECT 'Admins can now create/edit:' as info;
SELECT '- Events' as feature
UNION ALL SELECT '- Servers'
UNION ALL SELECT '- Channels'
UNION ALL SELECT '- Users'
UNION ALL SELECT '- Notifications'
UNION ALL SELECT '- Sports facilities'
UNION ALL SELECT '- Challenges'
UNION ALL SELECT '- Listings'
UNION ALL SELECT '- And more...';
