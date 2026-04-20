-- =========================
-- COLLEGE-SPECIFIC CONFIGURATIONS
-- Each college can have custom settings for LMS, Sports, etc.
-- =========================

-- College configuration
CREATE TABLE public.college_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL UNIQUE REFERENCES public.colleges(id) ON DELETE CASCADE,
  
  -- LMS Settings
  lms_enabled BOOLEAN NOT NULL DEFAULT true,
  allow_student_courses BOOLEAN NOT NULL DEFAULT true, -- Students can create courses
  course_approval_required BOOLEAN NOT NULL DEFAULT false,
  
  -- Sports Settings
  sports_enabled BOOLEAN NOT NULL DEFAULT true,
  sports_booking_advance_days INT NOT NULL DEFAULT 7, -- How many days in advance can book
  sports_cancellation_hours INT NOT NULL DEFAULT 2, -- Hours before slot to cancel
  
  -- Freelancing Settings
  freelancing_enabled BOOLEAN NOT NULL DEFAULT true,
  freelancing_college_only BOOLEAN NOT NULL DEFAULT false,
  
  -- Marketplace Settings
  marketplace_enabled BOOLEAN NOT NULL DEFAULT true,
  marketplace_moderation BOOLEAN NOT NULL DEFAULT false,
  
  -- Events Settings
  events_enabled BOOLEAN NOT NULL DEFAULT true,
  allow_student_events BOOLEAN NOT NULL DEFAULT false,
  
  -- General Settings
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  academic_year_start DATE,
  academic_year_end DATE,
  
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  custom_domain TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.college_config ENABLE ROW LEVEL SECURITY;

-- College departments
CREATE TABLE public.college_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  head_user_id UUID REFERENCES auth.users(id),
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (college_id, code)
);

CREATE INDEX idx_college_departments_college ON public.college_departments(college_id);
ALTER TABLE public.college_departments ENABLE ROW LEVEL SECURITY;

-- Add department to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.college_departments(id);

-- College-specific course categories
CREATE TABLE public.college_course_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  position INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (college_id, name)
);

CREATE INDEX idx_college_course_categories_college ON public.college_course_categories(college_id);
ALTER TABLE public.college_course_categories ENABLE ROW LEVEL SECURITY;

-- College academic calendar
CREATE TABLE public.college_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID NOT NULL REFERENCES public.colleges(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'semester_start', 'semester_end', 'exam', 'holiday', 'event'
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  all_day BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_college_calendar_college ON public.college_calendar(college_id);
CREATE INDEX idx_college_calendar_dates ON public.college_calendar(start_date, end_date);
ALTER TABLE public.college_calendar ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "College config readable by members"
  ON public.college_config FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.college_id = college_config.college_id
    ) OR
    public.is_any_admin(auth.uid())
  );

CREATE POLICY "Admins manage college config"
  ON public.college_config FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'college.config.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'college.config.manage'));

CREATE POLICY "Departments readable by college members"
  ON public.college_departments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.college_id = college_departments.college_id
    ) OR
    public.is_any_admin(auth.uid())
  );

CREATE POLICY "Admins manage departments"
  ON public.college_departments FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'college.config.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'college.config.manage'));

CREATE POLICY "Course categories readable by college members"
  ON public.college_course_categories FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.college_id = college_course_categories.college_id
    ) OR
    public.is_any_admin(auth.uid())
  );

CREATE POLICY "Calendar readable by college members"
  ON public.college_calendar FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.college_id = college_calendar.college_id
    ) OR
    public.is_any_admin(auth.uid())
  );

-- Triggers
CREATE TRIGGER trg_college_config_updated BEFORE UPDATE ON public.college_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add permissions
INSERT INTO public.permissions (name, description, category) VALUES
  ('college.config.manage', 'Manage college configuration', 'college'),
  ('college.department.manage', 'Manage departments', 'college'),
  ('college.calendar.manage', 'Manage academic calendar', 'college');

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions WHERE category = 'college';

-- Seed default configs for existing colleges
INSERT INTO public.college_config (college_id)
SELECT id FROM public.colleges
ON CONFLICT (college_id) DO NOTHING;

-- Seed departments for Bennett
DO $$$
DECLARE
  v_bennett_id UUID;
BEGIN
  SELECT id INTO v_bennett_id FROM public.colleges WHERE short_code = 'BU';
  
  IF v_bennett_id IS NOT NULL THEN
    INSERT INTO public.college_departments (college_id, name, code, description) VALUES
      (v_bennett_id, 'Computer Science & Engineering', 'CSE', 'Department of Computer Science and Engineering'),
      (v_bennett_id, 'Electronics & Communication', 'ECE', 'Department of Electronics and Communication Engineering'),
      (v_bennett_id, 'Mechanical Engineering', 'ME', 'Department of Mechanical Engineering'),
      (v_bennett_id, 'Business Administration', 'BBA', 'School of Business Administration'),
      (v_bennett_id, 'Law', 'LAW', 'School of Law'),
      (v_bennett_id, 'Liberal Arts', 'LA', 'School of Liberal Arts');
      
    INSERT INTO public.college_course_categories (college_id, name, description, position) VALUES
      (v_bennett_id, 'Core Engineering', 'Fundamental engineering courses', 1),
      (v_bennett_id, 'Programming', 'Software development and coding', 2),
      (v_bennett_id, 'Data Science & AI', 'Machine learning and data analytics', 3),
      (v_bennett_id, 'Business & Management', 'Business and entrepreneurship', 4),
      (v_bennett_id, 'Design', 'UI/UX and graphic design', 5),
      (v_bennett_id, 'Soft Skills', 'Communication and leadership', 6);
  END IF;
END $$;
