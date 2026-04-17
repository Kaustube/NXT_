-- Add profile_visibility column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'public'
  CHECK (profile_visibility IN ('public', 'private'));

-- Update RLS: private profiles only visible to connections or by username search
-- We keep the existing broad SELECT policy but filter in the app layer.
-- The DB policy stays open (authenticated can read) but the app respects visibility.
-- For true DB-level enforcement we add a helper function:

CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer UUID, _target UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    -- Always can view own profile
    _viewer = _target
    OR
    -- Public profiles visible to all
    (SELECT profile_visibility FROM public.profiles WHERE user_id = _target) = 'public'
    OR
    -- Private profiles visible to accepted connections
    EXISTS (
      SELECT 1 FROM public.connections
      WHERE status = 'accepted'
        AND (
          (requester_id = _viewer AND recipient_id = _target)
          OR (recipient_id = _viewer AND requester_id = _target)
        )
    );
$$;
