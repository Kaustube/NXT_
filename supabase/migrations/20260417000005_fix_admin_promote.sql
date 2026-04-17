-- Fix promote_to_admin to properly access auth.users
CREATE OR REPLACE FUNCTION public.promote_to_admin(p_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public AS $$
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
  RETURN 'Promoted ' || p_email || ' to admin (' || v_uid || ')';
END;
$$;

-- Also grant execute to authenticated users so it can be called from the app if needed
GRANT EXECUTE ON FUNCTION public.promote_to_admin(TEXT) TO service_role;
