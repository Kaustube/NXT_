-- Only the Edge Function (service_role) may mint codes. Users may only verify their own code.
REVOKE ALL ON FUNCTION public.create_verification_code(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resend_verification_code(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_verification_code(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.resend_verification_code(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.verify_email_code(p_user_id UUID, p_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_verification RECORD;
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  SELECT * INTO v_verification
  FROM public.email_verifications
  WHERE user_id = p_user_id
    AND code = p_code
    AND verified = false
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_verification IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.email_verifications
  SET verified = true, verified_at = now()
  WHERE id = v_verification.id;

  UPDATE public.profiles
  SET email_verified = true, email_verified_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_email_code(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_email_code(uuid, text) TO authenticated;
