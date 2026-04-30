-- Fix: promoting users in Admin panel failed RLS on user_roles.
-- Previous revision referenced public.app_role, which may not exist if the DB
-- used a different migration path (e.g. FINAL_FIX dropped app_role).
-- This policy only checks: acting user has a global admin row (role casts to 'admin').

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage user roles" ON public.user_roles;

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur_actor
      WHERE ur_actor.user_id = auth.uid()
        AND ur_actor.role::text = 'admin'
        AND (ur_actor.scope_type IS NULL OR ur_actor.scope_type = 'global')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur_actor
      WHERE ur_actor.user_id = auth.uid()
        AND ur_actor.role::text = 'admin'
        AND (ur_actor.scope_type IS NULL OR ur_actor.scope_type = 'global')
    )
  );
