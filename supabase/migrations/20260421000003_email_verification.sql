-- =========================
-- EMAIL VERIFICATION SYSTEM
-- Proper email verification with codes
-- =========================

-- Email verification tracking
CREATE TABLE public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX idx_email_verifications_user ON public.email_verifications(user_id);
CREATE INDEX idx_email_verifications_code ON public.email_verifications(code);
CREATE INDEX idx_email_verifications_expires ON public.email_verifications(expires_at);

ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;

-- Add email_verified flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Function to generate verification code
CREATE OR REPLACE FUNCTION public.generate_verification_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  code TEXT;
BEGIN
  -- Generate 6-digit code
  code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  RETURN code;
END;
$$;

-- Function to create verification code for user
CREATE OR REPLACE FUNCTION public.create_verification_code(p_user_id UUID, p_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT;
BEGIN
  -- Generate code
  v_code := public.generate_verification_code();
  
  -- Insert verification record (expires in 15 minutes)
  INSERT INTO public.email_verifications (user_id, email, code, expires_at)
  VALUES (p_user_id, p_email, v_code, now() + interval '15 minutes');
  
  RETURN v_code;
END;
$$;

-- Function to verify code
CREATE OR REPLACE FUNCTION public.verify_email_code(p_user_id UUID, p_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_verification RECORD;
BEGIN
  -- Find valid verification
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
  
  -- Mark as verified
  UPDATE public.email_verifications
  SET verified = true, verified_at = now()
  WHERE id = v_verification.id;
  
  -- Update profile
  UPDATE public.profiles
  SET email_verified = true, email_verified_at = now()
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;

-- Function to check if user email is verified
CREATE OR REPLACE FUNCTION public.is_email_verified(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT email_verified FROM public.profiles WHERE user_id = p_user_id),
    false
  )
$$;

-- Function to resend verification code (with rate limiting)
CREATE OR REPLACE FUNCTION public.resend_verification_code(p_user_id UUID, p_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_last_sent TIMESTAMPTZ;
  v_code TEXT;
BEGIN
  -- Check last sent time (rate limit: 1 per minute)
  SELECT created_at INTO v_last_sent
  FROM public.email_verifications
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_last_sent IS NOT NULL AND v_last_sent > now() - interval '1 minute' THEN
    RAISE EXCEPTION 'Please wait before requesting another code';
  END IF;
  
  -- Create new code
  v_code := public.create_verification_code(p_user_id, p_email);
  
  RETURN v_code;
END;
$$;

-- RLS Policies
CREATE POLICY "Users view own verifications"
  ON public.email_verifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System creates verifications"
  ON public.email_verifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Trigger to send verification email on signup
CREATE OR REPLACE FUNCTION public.send_verification_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT;
BEGIN
  -- Create verification code
  v_code := public.create_verification_code(NEW.id, NEW.email);
  
  -- In production, this would trigger an email via edge function
  -- For now, we just log it
  RAISE NOTICE 'Verification code for %: %', NEW.email, v_code;
  
  RETURN NEW;
END;
$$;

-- Note: This trigger is optional - you may want to handle verification in your app logic
-- CREATE TRIGGER on_user_signup_verification
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.send_verification_on_signup();

-- Clean up expired verifications (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_verifications()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.email_verifications
  WHERE expires_at < now() - interval '1 day';
END;
$$;
