-- =========================
-- FINAL ENHANCEMENTS
-- Email verification for college access, Job Recruiter role, Enhanced marketplace
-- =========================

-- ============================================
-- 1. EMAIL VERIFICATION FOR COLLEGE ACCESS
-- ============================================

-- Add email verification requirement for college access
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS college_verified_at TIMESTAMPTZ;

-- Function to verify college email
CREATE OR REPLACE FUNCTION public.verify_college_email(p_user_id UUID, p_code TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email TEXT;
  v_domain TEXT;
  v_college_id UUID;
  v_college_domain TEXT;
BEGIN
  -- Get user email and college
  SELECT p.email, p.college_id INTO v_email, v_college_id
  FROM public.profiles p
  WHERE p.user_id = p_user_id;
  
  IF v_college_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get college domain
  SELECT email_domain INTO v_college_domain
  FROM public.colleges
  WHERE id = v_college_id;
  
  -- Extract domain from email
  v_domain := split_part(v_email, '@', 2);
  
  -- Verify domain matches
  IF v_domain != v_college_domain THEN
    RETURN false;
  END IF;
  
  -- Verify the code
  IF NOT public.verify_email_code(p_user_id, p_code) THEN
    RETURN false;
  END IF;
  
  -- Mark college as verified
  UPDATE public.profiles
  SET college_verified = true, college_verified_at = now()
  WHERE user_id = p_user_id;
  
  RETURN true;
END;
$$;

-- Update RLS for college servers to require verification
DROP POLICY IF EXISTS "Servers readable by authenticated" ON public.servers;
CREATE POLICY "Servers readable by authenticated"
  ON public.servers FOR SELECT TO authenticated
  USING (
    kind = 'global' OR -- Public servers visible to all
    (kind = 'college' AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.college_id = servers.college_id
      AND p.college_verified = true -- Must be verified
    )) OR
    (kind = 'group' AND (
      is_private = false OR
      EXISTS (
        SELECT 1 FROM public.server_members sm
        WHERE sm.server_id = servers.id
        AND sm.user_id = auth.uid()
      )
    )) OR
    public.is_any_admin(auth.uid())
  );

-- ============================================
-- 2. JOB RECRUITER ROLE & OPPORTUNITIES
-- ============================================

-- Add recruiter role
INSERT INTO public.permissions (name, description, category) VALUES
  ('opportunities.post', 'Post job opportunities', 'opportunities'),
  ('opportunities.manage', 'Manage all opportunities', 'opportunities'),
  ('opportunities.verify', 'Verify and approve opportunities', 'opportunities')
ON CONFLICT (name) DO NOTHING;

-- Create recruiter admin level
ALTER TYPE public.admin_level ADD VALUE IF NOT EXISTS 'recruiter_admin';

-- Assign permissions to recruiter admin
INSERT INTO public.admin_permissions_matrix (admin_level, permission_id, can_grant)
SELECT 'recruiter_admin', id, false FROM public.permissions 
WHERE name LIKE 'opportunities.%'
ON CONFLICT DO NOTHING;

-- Enhanced opportunities table
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS listing_type TEXT NOT NULL DEFAULT 'marketplace';
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS job_type TEXT; -- 'internship', 'full-time', 'part-time', 'freelance'
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS company_logo TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS salary_min NUMERIC(10,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS salary_max NUMERIC(10,2);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS application_url TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS deadline DATE;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS requirements TEXT[];
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS posted_by_recruiter BOOLEAN NOT NULL DEFAULT false;

-- Add constraint for listing types
ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_listing_type_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_listing_type_check 
  CHECK (listing_type IN ('marketplace', 'job', 'internship', 'freelance_project'));

-- Function to promote to recruiter
CREATE OR REPLACE FUNCTION public.promote_to_recruiter(p_email TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = p_email;
  IF v_uid IS NULL THEN
    RETURN 'User not found: ' || p_email;
  END IF;
  
  INSERT INTO public.user_roles (user_id, role, admin_level, scope_type)
  VALUES (v_uid, 'admin', 'recruiter_admin', 'global')
  ON CONFLICT (user_id, role, scope_type, scope_id) 
  DO UPDATE SET admin_level = 'recruiter_admin';
  
  RETURN 'Promoted ' || p_email || ' to recruiter admin';
END;
$$;

-- RLS for opportunities
DROP POLICY IF EXISTS "Listings readable by authenticated" ON public.listings;
CREATE POLICY "Listings readable by authenticated"
  ON public.listings FOR SELECT TO authenticated
  USING (
    active = true AND
    (
      listing_type = 'marketplace' OR
      (listing_type IN ('job', 'internship') AND verified = true) OR
      seller_id = auth.uid() OR
      public.has_permission(auth.uid(), 'opportunities.manage')
    )
  );

DROP POLICY IF EXISTS "Seller creates listings" ON public.listings;
CREATE POLICY "Users create listings"
  ON public.listings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = seller_id AND
    (
      listing_type = 'marketplace' OR
      listing_type = 'freelance_project' OR
      (listing_type IN ('job', 'internship') AND public.has_permission(auth.uid(), 'opportunities.post'))
    )
  );

DROP POLICY IF EXISTS "Seller updates listings" ON public.listings;
CREATE POLICY "Users update own listings"
  ON public.listings FOR UPDATE TO authenticated
  USING (
    auth.uid() = seller_id OR
    public.has_permission(auth.uid(), 'opportunities.manage')
  );

-- ============================================
-- 3. ENHANCED MARKETPLACE
-- ============================================

-- Add quantity and auto-removal
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS quantity INT NOT NULL DEFAULT 1;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS quantity_available INT NOT NULL DEFAULT 1;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS auto_remove_when_sold BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS sold_count INT NOT NULL DEFAULT 0;

-- Marketplace transactions
CREATE TABLE IF NOT EXISTS public.marketplace_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  price NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
  transaction_type TEXT NOT NULL, -- 'buy', 'rent'
  rental_start_date DATE,
  rental_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_marketplace_transactions_listing ON public.marketplace_transactions(listing_id);
CREATE INDEX idx_marketplace_transactions_seller ON public.marketplace_transactions(seller_id);
CREATE INDEX idx_marketplace_transactions_buyer ON public.marketplace_transactions(buyer_id);
ALTER TABLE public.marketplace_transactions ENABLE ROW LEVEL SECURITY;

-- Function to mark item as sold/rented
CREATE OR REPLACE FUNCTION public.mark_listing_sold(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_quantity INT DEFAULT 1
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_seller_id UUID;
  v_price NUMERIC(10,2);
  v_category listing_category;
  v_auto_remove BOOLEAN;
  v_quantity_available INT;
BEGIN
  -- Get listing details
  SELECT seller_id, price, category, auto_remove_when_sold, quantity_available
  INTO v_seller_id, v_price, v_category, v_auto_remove, v_quantity_available
  FROM public.listings
  WHERE id = p_listing_id;
  
  -- Check if enough quantity available
  IF v_quantity_available < p_quantity THEN
    RAISE EXCEPTION 'Not enough quantity available';
  END IF;
  
  -- Create transaction
  INSERT INTO public.marketplace_transactions (
    listing_id, seller_id, buyer_id, quantity, price,
    status, transaction_type
  ) VALUES (
    p_listing_id, v_seller_id, p_buyer_id, p_quantity, v_price,
    'completed', v_category::text
  );
  
  -- Update listing
  UPDATE public.listings
  SET 
    quantity_available = quantity_available - p_quantity,
    sold_count = sold_count + p_quantity,
    active = CASE 
      WHEN auto_remove_when_sold AND (quantity_available - p_quantity) <= 0 THEN false
      ELSE active
    END,
    updated_at = now()
  WHERE id = p_listing_id;
END;
$$;

-- RLS for transactions
CREATE POLICY "Users view own transactions"
  ON public.marketplace_transactions FOR SELECT TO authenticated
  USING (
    auth.uid() = seller_id OR
    auth.uid() = buyer_id OR
    public.is_any_admin(auth.uid())
  );

CREATE POLICY "Users create transactions"
  ON public.marketplace_transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- ============================================
-- 4. FREELANCE PROJECT SHOWCASE
-- ============================================

-- Add project showcase fields to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS project_demo_url TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS project_github_url TEXT;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS project_tech_stack TEXT[];
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS project_screenshots TEXT[];
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_for_sale BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_open_source BOOLEAN NOT NULL DEFAULT false;

-- Project likes/favorites
CREATE TABLE IF NOT EXISTS public.listing_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, user_id)
);

CREATE INDEX idx_listing_favorites_listing ON public.listing_favorites(listing_id);
CREATE INDEX idx_listing_favorites_user ON public.listing_favorites(user_id);
ALTER TABLE public.listing_favorites ENABLE ROW LEVEL SECURITY;

-- Add favorite count to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS favorite_count INT NOT NULL DEFAULT 0;

-- Function to toggle favorite
CREATE OR REPLACE FUNCTION public.toggle_listing_favorite(p_listing_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Check if already favorited
  SELECT EXISTS (
    SELECT 1 FROM public.listing_favorites
    WHERE listing_id = p_listing_id AND user_id = auth.uid()
  ) INTO v_exists;
  
  IF v_exists THEN
    -- Remove favorite
    DELETE FROM public.listing_favorites
    WHERE listing_id = p_listing_id AND user_id = auth.uid();
    
    UPDATE public.listings
    SET favorite_count = GREATEST(0, favorite_count - 1)
    WHERE id = p_listing_id;
    
    RETURN false;
  ELSE
    -- Add favorite
    INSERT INTO public.listing_favorites (listing_id, user_id)
    VALUES (p_listing_id, auth.uid());
    
    UPDATE public.listings
    SET favorite_count = favorite_count + 1
    WHERE id = p_listing_id;
    
    RETURN true;
  END IF;
END;
$$;

-- RLS for favorites
CREATE POLICY "Users view all favorites"
  ON public.listing_favorites FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users manage own favorites"
  ON public.listing_favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 5. VIEWS FOR EASY QUERYING
-- ============================================

-- View for job opportunities
CREATE OR REPLACE VIEW public.job_opportunities AS
SELECT 
  l.*,
  p.display_name as poster_name,
  p.avatar_url as poster_avatar,
  c.name as college_name
FROM public.listings l
JOIN public.profiles p ON p.user_id = l.seller_id
LEFT JOIN public.colleges c ON c.id = l.college_id
WHERE l.listing_type IN ('job', 'internship')
AND l.verified = true
AND l.active = true
AND (l.deadline IS NULL OR l.deadline >= CURRENT_DATE);

-- View for freelance projects
CREATE OR REPLACE VIEW public.freelance_projects AS
SELECT 
  l.*,
  p.display_name as creator_name,
  p.avatar_url as creator_avatar,
  p.username as creator_username
FROM public.listings l
JOIN public.profiles p ON p.user_id = l.seller_id
WHERE l.listing_type = 'freelance_project'
AND l.active = true;

-- View for marketplace items
CREATE OR REPLACE VIEW public.marketplace_items AS
SELECT 
  l.*,
  p.display_name as seller_name,
  p.avatar_url as seller_avatar,
  c.name as college_name
FROM public.listings l
JOIN public.profiles p ON p.user_id = l.seller_id
LEFT JOIN public.colleges c ON c.id = l.college_id
WHERE l.listing_type = 'marketplace'
AND l.active = true
AND l.quantity_available > 0;

-- Grant access to views
GRANT SELECT ON public.job_opportunities TO authenticated;
GRANT SELECT ON public.freelance_projects TO authenticated;
GRANT SELECT ON public.marketplace_items TO authenticated;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Trigger to auto-remove listing when quantity reaches 0
CREATE OR REPLACE FUNCTION public.auto_remove_sold_listing()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.quantity_available <= 0 AND NEW.auto_remove_when_sold THEN
    NEW.active := false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_remove_sold_listing
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  WHEN (OLD.quantity_available > 0 AND NEW.quantity_available <= 0)
  EXECUTE FUNCTION public.auto_remove_sold_listing();

-- ============================================
-- 7. SEED DATA
-- ============================================

-- Sample job opportunities (for testing)
INSERT INTO public.listings (
  seller_id, title, description, listing_type, job_type,
  company_name, location, salary_min, salary_max,
  requirements, deadline, verified, posted_by_recruiter, active
)
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'Software Engineer Intern',
  'Join our team as a software engineering intern. Work on real projects with experienced mentors.',
  'internship',
  'internship',
  'Tech Corp',
  'Bangalore, India',
  15000,
  25000,
  ARRAY['Python', 'JavaScript', 'React', 'Node.js'],
  CURRENT_DATE + 90,
  true,
  true,
  true
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

-- Sample freelance project
INSERT INTO public.listings (
  seller_id, title, description, listing_type,
  project_tech_stack, project_github_url,
  is_open_source, price, active
)
SELECT 
  (SELECT id FROM auth.users LIMIT 1),
  'E-Commerce Platform',
  'Full-stack e-commerce platform built with MERN stack. Features include user authentication, product catalog, shopping cart, and payment integration.',
  'freelance_project',
  ARRAY['MongoDB', 'Express', 'React', 'Node.js', 'Stripe'],
  'https://github.com/example/ecommerce',
  true,
  0,
  true
WHERE EXISTS (SELECT 1 FROM auth.users LIMIT 1)
ON CONFLICT DO NOTHING;

-- ============================================
-- 8. CLEANUP & OPTIMIZATION
-- ============================================

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_listings_type_active ON public.listings(listing_type, active);
CREATE INDEX IF NOT EXISTS idx_listings_verified ON public.listings(verified) WHERE listing_type IN ('job', 'internship');
CREATE INDEX IF NOT EXISTS idx_listings_deadline ON public.listings(deadline) WHERE deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_quantity ON public.listings(quantity_available) WHERE listing_type = 'marketplace';

-- Update existing listings to have default values
UPDATE public.listings
SET 
  listing_type = 'marketplace',
  quantity = 1,
  quantity_available = 1,
  auto_remove_when_sold = true
WHERE listing_type IS NULL;
