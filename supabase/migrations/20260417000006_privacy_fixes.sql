-- =========================
-- RESTRICT server_members visibility
-- Only members of a server can see who else is in it
-- =========================
DROP POLICY IF EXISTS "Members readable by authenticated" ON public.server_members;

CREATE POLICY "Members see own server memberships"
  ON public.server_members FOR SELECT TO authenticated
  USING (
    -- You can always see your own memberships
    user_id = auth.uid()
    OR
    -- You can see other members only if you are also a member of that server
    EXISTS (
      SELECT 1 FROM public.server_members sm2
      WHERE sm2.server_id = server_members.server_id
        AND sm2.user_id = auth.uid()
    )
  );
