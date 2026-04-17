-- =========================
-- COLLEGE SERVER JOIN RESTRICTION
-- =========================
-- Drop the old open join policy and replace with one that checks college match

DROP POLICY IF EXISTS "Users join servers themselves" ON public.server_members;

CREATE POLICY "Users join servers with college check"
  ON public.server_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- Global servers: anyone can join
      (SELECT kind FROM public.servers WHERE id = server_id) = 'global'
      OR
      -- College servers: user's college_id must match the server's college_id
      (
        (SELECT kind FROM public.servers WHERE id = server_id) = 'college'
        AND
        (SELECT college_id FROM public.profiles WHERE user_id = auth.uid())
          = (SELECT college_id FROM public.servers WHERE id = server_id)
      )
    )
  );
