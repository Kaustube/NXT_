-- ==========================================
-- PARTNER REGISTRATION & OPPORTUNITIES SYSTEM
-- ==========================================

-- 0. Add approval flags to events (user-submitted content moderation)
-- is_approved: null = pending, true = approved, false = rejected
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT NULL;

-- Only show approved (or admin-created, which default to NULL treated as approved by the query) events publicly.
-- The frontend filters: is_approved IS NOT FALSE (shows NULL + TRUE, hides explicit FALSE)
-- Admin-created events in AdminEvents.tsx insert with no is_approved → NULL → shown by default.
-- User-submitted events via SubmitContentDialog insert with is_approved = false → hidden until admin flips it.

-- 1. Extend profiles with Partner fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_partner BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approved_services TEXT[] DEFAULT '{}'::TEXT[];


-- 2. Partner Applications Table
CREATE TABLE IF NOT EXISTS public.partner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    phone_number TEXT,
    description TEXT,
    requested_services TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_partner_apps_user ON public.partner_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_partner_apps_status ON public.partner_applications(status);

-- 3. Opportunities Table (Jobs & Internships)
CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'job', 'internship'
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT,
    salary_stipend TEXT,
    duration TEXT, -- mostly for internships
    deadline TEXT,
    requirements JSONB DEFAULT '[]'::JSONB,
    description TEXT,
    apply_link TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_type ON public.opportunities(type);
CREATE INDEX IF NOT EXISTS idx_opportunities_active ON public.opportunities(is_active);

-- Enable RLS
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Partner Applications Policies
CREATE POLICY "Users can view their own applications"
    ON public.partner_applications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own applications"
    ON public.partner_applications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
    ON public.partner_applications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

CREATE POLICY "Admins can update applications"
    ON public.partner_applications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- Opportunities Policies
CREATE POLICY "Anyone can view active opportunities"
    ON public.opportunities FOR SELECT
    USING (is_active = true);

CREATE POLICY "Providers can view their own opportunities"
    ON public.opportunities FOR SELECT
    USING (auth.uid() = provider_id);

CREATE POLICY "Providers can insert opportunities"
    ON public.opportunities FOR INSERT
    WITH CHECK (
        auth.uid() = provider_id 
        AND EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() AND p.is_partner = true
        )
    );

CREATE POLICY "Providers can update their own opportunities"
    ON public.opportunities FOR UPDATE
    USING (auth.uid() = provider_id);

CREATE POLICY "Providers can delete their own opportunities"
    ON public.opportunities FOR DELETE
    USING (auth.uid() = provider_id);

-- Admin functions to approve partner
CREATE OR REPLACE FUNCTION approve_partner_application(p_application_id UUID, p_admin_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
    v_services TEXT[];
BEGIN
    -- Get application details
    SELECT user_id, requested_services INTO v_user_id, v_services
    FROM public.partner_applications
    WHERE id = p_application_id AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pending application not found';
    END IF;

    -- Update application status
    UPDATE public.partner_applications
    SET status = 'approved',
        resolved_at = now(),
        resolved_by = p_admin_id
    WHERE id = p_application_id;

    -- Update user profile
    UPDATE public.profiles
    SET is_partner = true,
        approved_services = ARRAY(
            SELECT DISTINCT unnest(approved_services || v_services)
        )
    WHERE user_id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
