-- ==========================================
-- SPORTS VENUES & DYNAMIC BOOKING SYSTEM
-- ==========================================

-- 1. Sports Venues table (replaces hardcoded COLLEGE_COURTS + NEARBY_TURFS)
CREATE TABLE IF NOT EXISTS public.sports_venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    sport TEXT NOT NULL,                             -- 'badminton', 'football', 'cricket', 'gym', etc.
    emoji TEXT DEFAULT '🏆',
    location_text TEXT NOT NULL,
    maps_url TEXT,                                   -- Google Maps link
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    price_per_hour TEXT,                             -- e.g. '₹400/hr' or NULL for free
    college_id UUID REFERENCES public.colleges(id), -- NULL = external/public
    booking_type TEXT NOT NULL DEFAULT 'slotted',   -- 'open' | 'slotted'
    owner_id UUID REFERENCES auth.users(id),         -- turf owner / admin who listed it
    is_approved BOOLEAN DEFAULT NULL,               -- NULL=pending, true=live, false=rejected
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sports_venues_college ON public.sports_venues(college_id);
CREATE INDEX IF NOT EXISTS idx_sports_venues_approved ON public.sports_venues(is_approved);

-- 2. Sports Slots table (for slot-based venues — admin creates slots)
CREATE TABLE IF NOT EXISTS public.sports_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.sports_venues(id) ON DELETE CASCADE,
    slot_time TEXT NOT NULL,                         -- e.g. '5:00 PM'
    max_bookings INT NOT NULL DEFAULT 1,             -- how many can book this slot
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sports_slots_venue ON public.sports_slots(venue_id);

-- 3. Update existing sports_bookings to support both slot-based and open bookings
ALTER TABLE public.sports_bookings ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES public.sports_venues(id);
ALTER TABLE public.sports_bookings ADD COLUMN IF NOT EXISTS slot_id UUID REFERENCES public.sports_slots(id);

-- 4. Add location fields to opportunities table
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS location_text TEXT;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS maps_url TEXT;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 5. RLS Policies
ALTER TABLE public.sports_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_slots ENABLE ROW LEVEL SECURITY;

-- Venues: anyone can view approved venues
CREATE POLICY "Anyone can view approved venues"
    ON public.sports_venues FOR SELECT
    USING (is_approved = true AND is_active = true);

-- Owners can view their own pending venues
CREATE POLICY "Owners can view own venues"
    ON public.sports_venues FOR SELECT
    USING (auth.uid() = owner_id);

-- Authenticated users can submit venues (goes pending)
CREATE POLICY "Auth users can submit venues"
    ON public.sports_venues FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Slots: anyone can read slots for approved venues
CREATE POLICY "Anyone can read slots"
    ON public.sports_slots FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sports_venues sv
            WHERE sv.id = venue_id AND sv.is_approved = true
        )
    );

-- Helper: get booking counts per slot per date
CREATE OR REPLACE FUNCTION get_slot_booking_counts(p_venue_id UUID, p_date TEXT)
RETURNS TABLE(slot_id UUID, slot_time TEXT, max_bookings INT, booked_count BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.id,
        ss.slot_time,
        ss.max_bookings,
        COUNT(sb.id) as booked_count
    FROM public.sports_slots ss
    LEFT JOIN public.sports_bookings sb 
        ON sb.slot_id = ss.id 
        AND sb.booking_date = p_date 
        AND sb.status != 'cancelled'
    WHERE ss.venue_id = p_venue_id AND ss.is_active = true
    GROUP BY ss.id, ss.slot_time, ss.max_bookings
    ORDER BY ss.slot_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
