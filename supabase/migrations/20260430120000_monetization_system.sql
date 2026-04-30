-- =========================
-- MONETIZATION & PLATFORM FEE SYSTEM
-- Introduce finance_admin, monetization requests, and boost features
-- =========================

-- 1. Add finance_admin to admin_level enum
ALTER TYPE public.admin_level ADD VALUE IF NOT EXISTS 'finance_admin';
COMMIT;

-- 2. Modify events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS ticket_price NUMERIC(10, 2) DEFAULT 0.00;

-- 3. Modify listings table (Marketplace)
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS boost_until TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_campus_featured BOOLEAN NOT NULL DEFAULT false;

-- 4. Modify servers table (Clubs)
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS is_promoted BOOLEAN NOT NULL DEFAULT false;

-- 5. Modify channel_messages (Feed) for sponsored posts
ALTER TABLE public.channel_messages ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN NOT NULL DEFAULT false;

-- 6. Monetization Requests Table
CREATE TYPE public.monetization_module AS ENUM ('event', 'listing', 'post', 'club', 'resource', 'business');
CREATE TYPE public.monetization_status AS ENUM ('pending', 'pricing_set', 'paid', 'active', 'rejected', 'expired');

CREATE TABLE public.monetization_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_type public.monetization_module NOT NULL,
  target_id UUID NOT NULL, -- The ID of the event, listing, server, etc.
  boost_type TEXT NOT NULL, -- e.g., 'featured', 'urgent_sale', 'pinned'
  status public.monetization_status NOT NULL DEFAULT 'pending',
  fee_amount NUMERIC(10, 2),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_monetization_requests_requester ON public.monetization_requests(requester_id);
CREATE INDEX idx_monetization_requests_status ON public.monetization_requests(status);
CREATE INDEX idx_monetization_requests_module ON public.monetization_requests(module_type, target_id);

ALTER TABLE public.monetization_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users can view own monetization requests"
  ON public.monetization_requests FOR SELECT TO authenticated
  USING (auth.uid() = requester_id);

-- Users can insert their own requests
CREATE POLICY "Users can insert own monetization requests"
  ON public.monetization_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Admins (finance_admin or super_admin) can see all requests
CREATE POLICY "Admins can view all monetization requests"
  ON public.monetization_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND (ur.admin_level = 'super_admin' OR ur.admin_level = 'finance_admin' OR ur.role = 'admin')
    )
  );

-- Admins can update requests
CREATE POLICY "Admins can update monetization requests"
  ON public.monetization_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND (ur.admin_level = 'super_admin' OR ur.admin_level = 'finance_admin' OR ur.role = 'admin')
    )
  );

-- Trigger to update updated_at
CREATE TRIGGER trg_monetization_requests_updated
  BEFORE UPDATE ON public.monetization_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
