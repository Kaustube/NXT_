-- =========================
-- PROMOTE A USER TO ADMIN
-- =========================
-- Run this in SQL Editor replacing the email with your admin account email:
--
--   SELECT promote_to_admin('you@bennett.edu.in');
--
CREATE OR REPLACE FUNCTION public.promote_to_admin(p_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = p_email;
  IF v_uid IS NULL THEN
    RETURN 'User not found: ' || p_email;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_uid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN 'Promoted ' || p_email || ' to admin';
END;
$$;

-- Allow admins to read all profiles (already covered by existing policy)
-- Allow admins to manage servers
CREATE POLICY "Admins manage servers"
  ON public.servers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage channels
CREATE POLICY "Admins manage channels"
  ON public.channels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage coding challenges
CREATE POLICY "Admins manage challenges"
  ON public.coding_challenges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to manage sports bookings
CREATE POLICY "Admins read all bookings"
  ON public.sports_bookings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all notifications
CREATE POLICY "Admins read all notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to read all connections
CREATE POLICY "Admins read all connections"
  ON public.connections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
