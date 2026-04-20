-- =========================
-- LIVE SPORTS BOOKING SYSTEM
-- Real-time slot management with auto-expiry
-- =========================

-- Enhanced sports facilities
CREATE TABLE public.sports_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'court', 'field', 'gym', 'pool', etc.
  capacity INT NOT NULL DEFAULT 1,
  description TEXT,
  image_url TEXT,
  amenities TEXT[] DEFAULT '{}',
  rules TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sports_facilities_college ON public.sports_facilities(college_id);
ALTER TABLE public.sports_facilities ENABLE ROW LEVEL SECURITY;

-- Time slots configuration per facility
CREATE TABLE public.facility_time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.sports_facilities(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  max_bookings INT NOT NULL DEFAULT 1, -- How many concurrent bookings allowed
  price NUMERIC(10,2) DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (facility_id, day_of_week, start_time)
);

CREATE INDEX idx_facility_time_slots_facility ON public.facility_time_slots(facility_id);
ALTER TABLE public.facility_time_slots ENABLE ROW LEVEL SECURITY;

-- Enhanced bookings with real-time status
DROP TABLE IF EXISTS public.sports_bookings CASCADE;
CREATE TABLE public.sports_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.sports_facilities(id) ON DELETE CASCADE,
  time_slot_id UUID NOT NULL REFERENCES public.facility_time_slots(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'completed', 'cancelled', 'no_show'
  participants TEXT[] DEFAULT '{}', -- Additional participant user IDs
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (booking_date >= CURRENT_DATE),
  UNIQUE (facility_id, booking_date, start_time, user_id)
);

CREATE INDEX idx_sports_bookings_facility ON public.sports_bookings(facility_id);
CREATE INDEX idx_sports_bookings_user ON public.sports_bookings(user_id);
CREATE INDEX idx_sports_bookings_date ON public.sports_bookings(booking_date);
CREATE INDEX idx_sports_bookings_status ON public.sports_bookings(status);
ALTER TABLE public.sports_bookings ENABLE ROW LEVEL SECURITY;

-- Function to check slot availability
CREATE OR REPLACE FUNCTION public.is_slot_available(
  p_facility_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_time_slot_id UUID
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
  v_max_bookings INT;
  v_current_bookings INT;
  v_slot_end_time TIME;
BEGIN
  -- Check if slot is in the past
  IF p_date < CURRENT_DATE THEN
    RETURN false;
  END IF;
  
  IF p_date = CURRENT_DATE AND p_start_time < CURRENT_TIME THEN
    RETURN false;
  END IF;
  
  -- Get max bookings allowed
  SELECT max_bookings INTO v_max_bookings
  FROM public.facility_time_slots
  WHERE id = p_time_slot_id AND active = true;
  
  IF v_max_bookings IS NULL THEN
    RETURN false;
  END IF;
  
  -- Count current bookings
  SELECT COUNT(*) INTO v_current_bookings
  FROM public.sports_bookings
  WHERE facility_id = p_facility_id
  AND booking_date = p_date
  AND start_time = p_start_time
  AND status = 'confirmed';
  
  RETURN v_current_bookings < v_max_bookings;
END;
$$;

-- Function to auto-complete past bookings
CREATE OR REPLACE FUNCTION public.auto_complete_past_bookings()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.sports_bookings
  SET status = 'completed', updated_at = now()
  WHERE status = 'confirmed'
  AND (
    booking_date < CURRENT_DATE OR
    (booking_date = CURRENT_DATE AND end_time < CURRENT_TIME)
  );
END;
$$;

-- Booking history for analytics
CREATE TABLE public.sports_booking_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES public.sports_facilities(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  duration_minutes INT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sports_booking_history_user ON public.sports_booking_history(user_id);
ALTER TABLE public.sports_booking_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Facilities readable by college members"
  ON public.sports_facilities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.college_id = sports_facilities.college_id
    ) OR
    public.is_any_admin(auth.uid())
  );

CREATE POLICY "Admins manage facilities"
  ON public.sports_facilities FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'sports.facility.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'sports.facility.manage'));

CREATE POLICY "Time slots readable by college members"
  ON public.facility_time_slots FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sports_facilities f
      JOIN public.profiles p ON p.college_id = f.college_id
      WHERE f.id = facility_id AND p.user_id = auth.uid()
    ) OR
    public.is_any_admin(auth.uid())
  );

CREATE POLICY "Admins manage time slots"
  ON public.facility_time_slots FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'sports.facility.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'sports.facility.manage'));

CREATE POLICY "Users view own bookings"
  ON public.sports_bookings FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    public.has_permission(auth.uid(), 'sports.booking.view_all')
  );

CREATE POLICY "Users create bookings"
  ON public.sports_bookings FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    public.is_slot_available(facility_id, booking_date, start_time, time_slot_id)
  );

CREATE POLICY "Users cancel own bookings"
  ON public.sports_bookings FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id OR
    public.has_permission(auth.uid(), 'sports.booking.manage')
  );

CREATE POLICY "Users view own booking history"
  ON public.sports_booking_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER trg_sports_bookings_updated BEFORE UPDATE ON public.sports_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add sports permissions
INSERT INTO public.permissions (name, description, category) VALUES
  ('sports.facility.manage', 'Manage sports facilities', 'sports'),
  ('sports.booking.view_all', 'View all bookings', 'sports'),
  ('sports.booking.manage', 'Manage any booking', 'sports');

-- Assign to roles
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions WHERE category = 'sports';

-- Seed data for Bennett University
DO $$$
DECLARE
  v_bennett_id UUID;
  v_basketball_id UUID;
  v_tennis_id UUID;
  v_gym_id UUID;
BEGIN
  SELECT id INTO v_bennett_id FROM public.colleges WHERE short_code = 'BU';
  
  IF v_bennett_id IS NOT NULL THEN
    -- Basketball Court
    INSERT INTO public.sports_facilities (college_id, name, type, capacity, description, amenities)
    VALUES (
      v_bennett_id,
      'Basketball Court A',
      'court',
      10,
      'Indoor basketball court with professional flooring',
      ARRAY['Changing rooms', 'Water fountain', 'First aid', 'Lighting']
    ) RETURNING id INTO v_basketball_id;
    
    -- Tennis Court
    INSERT INTO public.sports_facilities (college_id, name, type, capacity, description, amenities)
    VALUES (
      v_bennett_id,
      'Tennis Court 1',
      'court',
      4,
      'Outdoor tennis court with synthetic surface',
      ARRAY['Equipment rental', 'Seating', 'Lighting']
    ) RETURNING id INTO v_tennis_id;
    
    -- Gym
    INSERT INTO public.sports_facilities (college_id, name, type, capacity, description, amenities)
    VALUES (
      v_bennett_id,
      'Fitness Center',
      'gym',
      30,
      'Fully equipped gym with cardio and strength training equipment',
      ARRAY['Lockers', 'Showers', 'Trainers', 'AC', 'Music system']
    ) RETURNING id INTO v_gym_id;
    
    -- Time slots for basketball (weekdays)
    FOR i IN 0..4 LOOP -- Monday to Friday
      INSERT INTO public.facility_time_slots (facility_id, day_of_week, start_time, end_time, duration_minutes, max_bookings)
      VALUES
        (v_basketball_id, i, '06:00', '07:00', 60, 1),
        (v_basketball_id, i, '07:00', '08:00', 60, 1),
        (v_basketball_id, i, '16:00', '17:00', 60, 1),
        (v_basketball_id, i, '17:00', '18:00', 60, 1),
        (v_basketball_id, i, '18:00', '19:00', 60, 1),
        (v_basketball_id, i, '19:00', '20:00', 60, 1);
    END LOOP;
    
    -- Time slots for tennis
    FOR i IN 0..6 LOOP -- All week
      INSERT INTO public.facility_time_slots (facility_id, day_of_week, start_time, end_time, duration_minutes, max_bookings)
      VALUES
        (v_tennis_id, i, '06:00', '07:00', 60, 2),
        (v_tennis_id, i, '07:00', '08:00', 60, 2),
        (v_tennis_id, i, '16:00', '17:00', 60, 2),
        (v_tennis_id, i, '17:00', '18:00', 60, 2),
        (v_tennis_id, i, '18:00', '19:00', 60, 2);
    END LOOP;
    
    -- Time slots for gym (all day)
    FOR i IN 0..6 LOOP
      FOR h IN 6..21 LOOP
        INSERT INTO public.facility_time_slots (facility_id, day_of_week, start_time, end_time, duration_minutes, max_bookings)
        VALUES (v_gym_id, i, (h || ':00')::TIME, ((h+1) || ':00')::TIME, 60, 30);
      END LOOP;
    END LOOP;
  END IF;
END $$;
