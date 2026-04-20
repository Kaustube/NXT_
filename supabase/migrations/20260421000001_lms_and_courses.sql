-- =========================
-- LMS & USER-GENERATED COURSES
-- Professors and students can create courses
-- =========================

-- Course categories
CREATE TYPE public.course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.course_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Courses table (enhanced)
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  instructor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
  category TEXT NOT NULL, -- 'programming', 'design', 'business', 'skill', etc.
  level course_level NOT NULL DEFAULT 'beginner',
  status course_status NOT NULL DEFAULT 'draft',
  thumbnail_url TEXT,
  is_official BOOLEAN NOT NULL DEFAULT false, -- Official college course vs user-generated
  price NUMERIC(10,2) DEFAULT 0, -- 0 for free courses
  enrolled_count INT NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_courses_instructor ON public.courses(instructor_id);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_courses_category ON public.courses(category);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Course modules/sections
CREATE TABLE public.course_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_modules_course ON public.course_modules(course_id);
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;

-- Course lessons
CREATE TABLE public.course_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT, -- Markdown content
  video_url TEXT,
  duration_minutes INT,
  position INT NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false, -- Free preview lessons
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_course_lessons_module ON public.course_lessons(module_id);
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

-- Course enrollments
CREATE TABLE public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  progress INT NOT NULL DEFAULT 0, -- Percentage 0-100
  completed BOOLEAN NOT NULL DEFAULT false,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (course_id, user_id)
);

CREATE INDEX idx_course_enrollments_user ON public.course_enrollments(user_id);
CREATE INDEX idx_course_enrollments_course ON public.course_enrollments(course_id);
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Lesson progress tracking
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX idx_lesson_progress_user ON public.lesson_progress(user_id);
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Course reviews
CREATE TABLE public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (course_id, user_id)
);

CREATE INDEX idx_course_reviews_course ON public.course_reviews(course_id);
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;

-- Assignments
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  max_score INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_assignments_course ON public.assignments(course_id);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Assignment submissions
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  file_url TEXT,
  score INT,
  feedback TEXT,
  graded_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at TIMESTAMPTZ,
  UNIQUE (assignment_id, user_id)
);

CREATE INDEX idx_assignment_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX idx_assignment_submissions_user ON public.assignment_submissions(user_id);
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- =========================
-- RLS POLICIES
-- =========================

-- Courses: Published courses visible to all, drafts only to instructor/admins
CREATE POLICY "Published courses readable by all"
  ON public.courses FOR SELECT TO authenticated
  USING (
    status = 'published' OR
    instructor_id = auth.uid() OR
    public.has_permission(auth.uid(), 'lms.course.edit')
  );

CREATE POLICY "Instructors create courses"
  ON public.courses FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = instructor_id);

CREATE POLICY "Instructors and admins edit courses"
  ON public.courses FOR UPDATE TO authenticated
  USING (
    instructor_id = auth.uid() OR
    public.has_permission(auth.uid(), 'lms.course.edit')
  );

CREATE POLICY "Instructors and admins delete courses"
  ON public.courses FOR DELETE TO authenticated
  USING (
    instructor_id = auth.uid() OR
    public.has_permission(auth.uid(), 'lms.course.delete')
  );

-- Course modules: visible if course is visible
CREATE POLICY "Modules readable with course"
  ON public.course_modules FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
      AND (
        c.status = 'published' OR
        c.instructor_id = auth.uid() OR
        public.has_permission(auth.uid(), 'lms.course.edit')
      )
    )
  );

CREATE POLICY "Instructors manage modules"
  ON public.course_modules FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
      AND (
        c.instructor_id = auth.uid() OR
        public.has_permission(auth.uid(), 'lms.course.edit')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
      AND (
        c.instructor_id = auth.uid() OR
        public.has_permission(auth.uid(), 'lms.course.edit')
      )
    )
  );

-- Course lessons: free lessons visible to all, others require enrollment
CREATE POLICY "Lessons readable by enrolled or free"
  ON public.course_lessons FOR SELECT TO authenticated
  USING (
    is_free OR
    EXISTS (
      SELECT 1 FROM public.course_modules cm
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cm.id = module_id
      AND (
        c.instructor_id = auth.uid() OR
        public.has_permission(auth.uid(), 'lms.course.edit') OR
        EXISTS (
          SELECT 1 FROM public.course_enrollments ce
          WHERE ce.course_id = c.id AND ce.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Instructors manage lessons"
  ON public.course_lessons FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.course_modules cm
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cm.id = module_id
      AND (
        c.instructor_id = auth.uid() OR
        public.has_permission(auth.uid(), 'lms.course.edit')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.course_modules cm
      JOIN public.courses c ON c.id = cm.course_id
      WHERE cm.id = module_id
      AND (
        c.instructor_id = auth.uid() OR
        public.has_permission(auth.uid(), 'lms.course.edit')
      )
    )
  );

-- Enrollments: users can enroll themselves
CREATE POLICY "Users view own enrollments"
  ON public.course_enrollments FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_permission(auth.uid(), 'lms.student.view')
  );

CREATE POLICY "Users enroll themselves"
  ON public.course_enrollments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own enrollment progress"
  ON public.course_enrollments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Lesson progress
CREATE POLICY "Users manage own lesson progress"
  ON public.lesson_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reviews: enrolled users can review
CREATE POLICY "Reviews readable by all"
  ON public.course_reviews FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Enrolled users create reviews"
  ON public.course_reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.course_enrollments
      WHERE course_id = course_reviews.course_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users update own reviews"
  ON public.course_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own reviews"
  ON public.course_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Assignments
CREATE POLICY "Assignments readable by enrolled"
  ON public.assignments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
      AND (
        c.instructor_id = auth.uid() OR
        public.has_permission(auth.uid(), 'lms.course.edit') OR
        EXISTS (
          SELECT 1 FROM public.course_enrollments ce
          WHERE ce.course_id = c.id AND ce.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Instructors manage assignments"
  ON public.assignments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
      AND (
        c.instructor_id = auth.uid() OR
        public.has_permission(auth.uid(), 'lms.course.edit')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.courses c
      WHERE c.id = course_id
      AND (
        c.instructor_id = auth.uid() OR
        public.has_permission(auth.uid(), 'lms.course.edit')
      )
    )
  );

-- Assignment submissions
CREATE POLICY "Users view own submissions"
  ON public.assignment_submissions FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    public.has_permission(auth.uid(), 'lms.student.view') OR
    EXISTS (
      SELECT 1 FROM public.assignments a
      JOIN public.courses c ON c.id = a.course_id
      WHERE a.id = assignment_id
      AND c.instructor_id = auth.uid()
    )
  );

CREATE POLICY "Users submit assignments"
  ON public.assignment_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own submissions"
  ON public.assignment_submissions FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id OR
    public.has_permission(auth.uid(), 'lms.student.grade')
  );

-- =========================
-- TRIGGERS
-- =========================

CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_lessons_updated BEFORE UPDATE ON public.course_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.course_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update course rating when review is added/updated
CREATE OR REPLACE FUNCTION public.update_course_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.courses
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM public.course_reviews
    WHERE course_id = NEW.course_id
  )
  WHERE id = NEW.course_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_course_rating
  AFTER INSERT OR UPDATE ON public.course_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_course_rating();

-- Function to update enrollment count
CREATE OR REPLACE FUNCTION public.update_enrollment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.courses
    SET enrolled_count = enrolled_count + 1
    WHERE id = NEW.course_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.courses
    SET enrolled_count = GREATEST(0, enrolled_count - 1)
    WHERE id = OLD.course_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_enrollment_count
  AFTER INSERT OR DELETE ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_enrollment_count();
