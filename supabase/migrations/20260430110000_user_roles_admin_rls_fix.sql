-- Fix: promoting users in Admin panel failed with
-- "new row violates row-level security policy for table user_roles"
-- because "Admins manage roles" only allowed has_permission(..., 'user.role.assign'),
-- which can fail if role_permissions / enum joins do not match live data.
-- Restore reliable access for anyone with a global admin role (same idea as legacy has_role(admin)).

DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins manage user roles" ON public.user_roles;

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_super_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'user.role.assign')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.is_super_admin(auth.uid())
    OR public.has_permission(auth.uid(), 'user.role.assign')
  );
