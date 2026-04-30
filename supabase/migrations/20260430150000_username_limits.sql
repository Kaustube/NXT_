-- Add username change tracking to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'username_change_count'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN username_change_count INT DEFAULT 0;
  END IF;
END $$;

SELECT '✅ Username change tracking added' as status;
