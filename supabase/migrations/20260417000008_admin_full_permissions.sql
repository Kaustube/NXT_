-- =========================
-- FULL ADMIN PERMISSIONS
-- Admins can read, write, update, delete everything
-- =========================

-- PROFILES
CREATE POLICY "Admins manage profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CONNECTIONS
CREATE POLICY "Admins manage connections"
  ON public.connections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CONVERSATIONS
CREATE POLICY "Admins read all conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- DM MESSAGES
CREATE POLICY "Admins read all dm messages"
  ON public.dm_messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete dm messages"
  ON public.dm_messages FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- CHANNEL MESSAGES
CREATE POLICY "Admins manage channel messages"
  ON public.channel_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SERVERS
DROP POLICY IF EXISTS "Admins manage servers" ON public.servers;
CREATE POLICY "Admins manage servers"
  ON public.servers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CHANNELS
DROP POLICY IF EXISTS "Admins manage channels" ON public.channels;
CREATE POLICY "Admins manage channels"
  ON public.channels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SERVER MEMBERS
CREATE POLICY "Admins manage server members"
  ON public.server_members FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- EVENTS
CREATE POLICY "Admins manage events"
  ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- EVENT REGISTRATIONS
CREATE POLICY "Admins manage event registrations"
  ON public.event_registrations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- LISTINGS (marketplace)
CREATE POLICY "Admins manage listings"
  ON public.listings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TASKS
CREATE POLICY "Admins read all tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- CODING CHALLENGES
DROP POLICY IF EXISTS "Admins manage challenges" ON public.coding_challenges;
CREATE POLICY "Admins manage challenges"
  ON public.coding_challenges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CHALLENGE SUBMISSIONS
CREATE POLICY "Admins read all submissions"
  ON public.challenge_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- SPORTS BOOKINGS
DROP POLICY IF EXISTS "Admins read all bookings" ON public.sports_bookings;
CREATE POLICY "Admins manage sports bookings"
  ON public.sports_bookings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- USER STREAKS
CREATE POLICY "Admins manage streaks"
  ON public.user_streaks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Admins read all notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications"
  ON public.notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- NOTIFICATION PREFERENCES
CREATE POLICY "Admins read all notification prefs"
  ON public.notification_preferences FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- USER ROLES (admins can promote/demote others)
CREATE POLICY "Admins manage user roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- COLLEGES (admins can add new colleges)
CREATE POLICY "Admins manage colleges"
  ON public.colleges FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- COURSE MATERIALS
CREATE POLICY "Admins manage course materials"
  ON public.course_materials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CHALLENGE ATTACHMENTS
CREATE POLICY "Admins manage challenge attachments"
  ON public.challenge_attachments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
