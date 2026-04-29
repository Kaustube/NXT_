-- =========================
-- CAMPUS SERVICES
-- Laundry, gate pickup, mess feedback, lost & found, cab sharing, printing
-- =========================

CREATE TABLE IF NOT EXISTS public.service_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  college_id    UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
  service_type  TEXT NOT NULL,  -- 'laundry' | 'gate_pickup' | 'printing' | 'cab_share' | 'lost_found' | 'mess_feedback' | 'maintenance'
  status        TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  title         TEXT NOT NULL,
  description   TEXT,
  metadata      JSONB DEFAULT '{}',  -- service-specific fields
  scheduled_at  TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Cab sharing has a separate participants table
CREATE TABLE IF NOT EXISTS public.cab_share_participants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID REFERENCES public.service_requests(id) ON DELETE CASCADE NOT NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(request_id, user_id)
);

-- RLS
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cab_share_participants ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests + cab shares from their college
DROP POLICY IF EXISTS "Users see own requests" ON public.service_requests;
CREATE POLICY "Users see own requests" ON public.service_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR service_type = 'cab_share'
    OR service_type = 'lost_found'
  );

DROP POLICY IF EXISTS "Users create own requests" ON public.service_requests;
CREATE POLICY "Users create own requests" ON public.service_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own requests" ON public.service_requests;
CREATE POLICY "Users update own requests" ON public.service_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage all requests" ON public.service_requests;
CREATE POLICY "Admins manage all requests" ON public.service_requests
  FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

DROP POLICY IF EXISTS "Cab participants visible" ON public.cab_share_participants;
CREATE POLICY "Cab participants visible" ON public.cab_share_participants
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users join cab" ON public.cab_share_participants;
CREATE POLICY "Users join cab" ON public.cab_share_participants
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users leave cab" ON public.cab_share_participants;
CREATE POLICY "Users leave cab" ON public.cab_share_participants
  FOR DELETE TO authenticated USING (user_id = auth.uid());

SELECT '✅ Campus services tables created' as status;
