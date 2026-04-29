-- =========================
-- PROFILE PICTURES & SERVER ICONS
-- Add support for custom profile pictures and server icons
-- =========================

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('avatars', 'avatars', true),
  ('server-icons', 'server-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for server icons
DROP POLICY IF EXISTS "Server icons are publicly accessible" ON storage.objects;
CREATE POLICY "Server icons are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'server-icons');

DROP POLICY IF EXISTS "Admins can upload server icons" ON storage.objects;
CREATE POLICY "Admins can upload server icons"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'server-icons' AND
    public.is_any_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update server icons" ON storage.objects;
CREATE POLICY "Admins can update server icons"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'server-icons' AND
    public.is_any_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can delete server icons" ON storage.objects;
CREATE POLICY "Admins can delete server icons"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'server-icons' AND
    public.is_any_admin(auth.uid())
  );

-- Add icon_url column to servers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'servers' AND column_name = 'icon_url'
  ) THEN
    ALTER TABLE public.servers ADD COLUMN icon_url TEXT;
  END IF;
END $$;

-- Add banner_url column to servers for cover images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'servers' AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE public.servers ADD COLUMN banner_url TEXT;
  END IF;
END $$;

-- Add banner_url column to profiles for cover images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN banner_url TEXT;
  END IF;
END $$;

-- Add theme_color column to profiles for personalization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'theme_color'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN theme_color TEXT DEFAULT '#6366f1';
  END IF;
END $$;

-- Add theme_color column to servers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'servers' AND column_name = 'theme_color'
  ) THEN
    ALTER TABLE public.servers ADD COLUMN theme_color TEXT DEFAULT '#6366f1';
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ Profile pictures and server icons enabled!' as status;
SELECT 'Storage buckets created:' as info;
SELECT '- avatars (for profile pictures)' as feature
UNION ALL SELECT '- server-icons (for server icons)'
UNION ALL SELECT 'New columns added:'
UNION ALL SELECT '- servers.icon_url'
UNION ALL SELECT '- servers.banner_url'
UNION ALL SELECT '- servers.theme_color'
UNION ALL SELECT '- profiles.banner_url'
UNION ALL SELECT '- profiles.theme_color';

