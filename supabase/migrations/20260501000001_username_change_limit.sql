-- Add username_change_count to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username_change_count'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username_change_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- Reset count for existing users (they get a fresh start)
UPDATE public.profiles SET username_change_count = 0 WHERE username_change_count IS NULL;

SELECT '✅ Username change limit column added (max 3 changes per user)' as status;
