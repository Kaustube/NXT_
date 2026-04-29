-- =========================
-- E2E ENCRYPTION: PUBLIC KEYS
-- Store each user's ECDH public key so peers can encrypt messages to them.
-- The private key NEVER leaves the user's device (stored in localStorage only).
-- =========================

-- Add public_key column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'public_key'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN public_key TEXT;
  END IF;
END $$;

-- Users can read any profile's public key (needed to encrypt messages to them)
-- This is intentional — public keys are, by definition, public
DROP POLICY IF EXISTS "Public keys are readable by all authenticated users" ON public.profiles;
CREATE POLICY "Public keys are readable by all authenticated users"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Users can only update their own public key
DROP POLICY IF EXISTS "Users update own public key" ON public.profiles;
CREATE POLICY "Users update own public key"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

SELECT '✅ E2E public key column added to profiles' as status;
