-- =========================
-- SOCIAL MEDIA LINKS
-- Students can add their social handles to their profile
-- =========================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'social_links'
  ) THEN
    ALTER TABLE public.profiles
    ADD COLUMN social_links JSONB DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- social_links format:
-- [{ "platform": "instagram", "url": "https://instagram.com/username", "username": "username" }]

SELECT '✅ Social links column added to profiles' as status;
