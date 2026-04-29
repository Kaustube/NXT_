-- =========================
-- LMS GROUPS & BATCHES SYSTEM
-- Bennett University specific: 1 Group = 4 Batches
-- Groups have different lecturers, Batches have different lab teachers
-- =========================

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Group 1", "Group A"
  year INTEGER NOT NULL, -- 1, 2, 3, 4
  department TEXT NOT NULL, -- CSE, BBA, etc.
  lecturer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(college_id, name, year, department)
);

-- Create batches table
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, -- e.g., "Batch 1", "Batch A"
  lab_teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, name)
);

-- Add group_id and batch_id to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add group_id and batch_id to courses (courses can be group/batch specific)
-- Only if courses table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'courses'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'courses' AND column_name = 'group_id'
    ) THEN
      ALTER TABLE public.courses ADD COLUMN group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'courses' AND column_name = 'batch_id'
    ) THEN
      ALTER TABLE public.courses ADD COLUMN batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Function to detect year from Bennett email
CREATE OR REPLACE FUNCTION public.detect_bennett_year(email TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  year_code TEXT;
BEGIN
  -- Extract year code from email (S24, S25, M24, E23, etc.)
  year_code := substring(email FROM '^[A-Z](\d{2})');
  
  IF year_code IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Convert to actual year
  -- S24 = 2024 admission = 2nd year in 2026
  -- S25 = 2025 admission = 1st year in 2026
  -- M24 = 2024 admission = 2nd year in 2026
  -- E23 = 2023 admission = 3rd year in 2026
  
  CASE 
    WHEN year_code = '25' THEN RETURN 1; -- 1st year
    WHEN year_code = '24' THEN RETURN 2; -- 2nd year
    WHEN year_code = '23' THEN RETURN 3; -- 3rd year
    WHEN year_code = '22' THEN RETURN 4; -- 4th year
    ELSE RETURN NULL;
  END CASE;
END;
$$;

-- Function to detect department from Bennett email
CREATE OR REPLACE FUNCTION public.detect_bennett_department(email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  dept_code TEXT;
BEGIN
  -- Extract department code from email (CSEU, BBAU, etc.)
  dept_code := substring(email FROM '^[A-Z]\d{2}([A-Z]+)');
  
  IF dept_code IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Map department codes
  CASE dept_code
    WHEN 'CSEU' THEN RETURN 'CSE';
    WHEN 'BBAU' THEN RETURN 'BBA';
    WHEN 'ECEU' THEN RETURN 'ECE';
    WHEN 'MEEU' THEN RETURN 'MECH';
    WHEN 'CEEU' THEN RETURN 'CIVIL';
    ELSE RETURN dept_code;
  END CASE;
END;
$$;

-- RLS Policies for groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Groups readable by college members" ON public.groups;
CREATE POLICY "Groups readable by college members" ON public.groups
  FOR SELECT TO authenticated
  USING (
    college_id IN (
      SELECT college_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage groups" ON public.groups;
CREATE POLICY "Admins manage groups" ON public.groups
  FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- RLS Policies for batches
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Batches readable by group members" ON public.batches;
CREATE POLICY "Batches readable by group members" ON public.batches
  FOR SELECT TO authenticated
  USING (
    group_id IN (
      SELECT group_id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins manage batches" ON public.batches;
CREATE POLICY "Admins manage batches" ON public.batches
  FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- Create default groups and batches for Bennett University
DO $$
DECLARE
  bennett_id UUID;
  group_1_id UUID;
  group_2_id UUID;
BEGIN
  -- Get Bennett University ID
  SELECT id INTO bennett_id FROM public.colleges WHERE email_domain = 'bennett.edu.in' LIMIT 1;
  
  IF bennett_id IS NOT NULL THEN
    -- Create Group 1 for CSE 2nd year
    INSERT INTO public.groups (college_id, name, year, department)
    VALUES (bennett_id, 'Group 1', 2, 'CSE')
    ON CONFLICT (college_id, name, year, department) DO NOTHING
    RETURNING id INTO group_1_id;
    
    -- Create Group 2 for CSE 2nd year
    INSERT INTO public.groups (college_id, name, year, department)
    VALUES (bennett_id, 'Group 2', 2, 'CSE')
    ON CONFLICT (college_id, name, year, department) DO NOTHING
    RETURNING id INTO group_2_id;
    
    -- Create 4 batches for Group 1
    IF group_1_id IS NOT NULL THEN
      INSERT INTO public.batches (group_id, name)
      VALUES 
        (group_1_id, 'Batch 1'),
        (group_1_id, 'Batch 2'),
        (group_1_id, 'Batch 3'),
        (group_1_id, 'Batch 4')
      ON CONFLICT (group_id, name) DO NOTHING;
    END IF;
    
    -- Create 4 batches for Group 2
    IF group_2_id IS NOT NULL THEN
      INSERT INTO public.batches (group_id, name)
      VALUES 
        (group_2_id, 'Batch 1'),
        (group_2_id, 'Batch 2'),
        (group_2_id, 'Batch 3'),
        (group_2_id, 'Batch 4')
      ON CONFLICT (group_id, name) DO NOTHING;
    END IF;
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

SELECT '✅ LMS Groups & Batches system created!' as status;
SELECT 'Features added:' as info;
SELECT '- Groups table (1 group per year/dept)' as feature
UNION ALL SELECT '- Batches table (4 batches per group)'
UNION ALL SELECT '- Auto-detect year from email'
UNION ALL SELECT '- Auto-detect department from email'
UNION ALL SELECT '- Group/batch assignment for students'
UNION ALL SELECT '- Course group/batch filtering';

