-- Ensure helper exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================
-- COURSE MATERIALS
-- =========================
CREATE TABLE public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id TEXT NOT NULL,          -- e.g. "CSET244"
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL,          -- mime type
  material_type TEXT NOT NULL DEFAULT 'notes', -- notes | slides | video | assignment | other
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materials readable by authenticated"
  ON public.course_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users upload materials"
  ON public.course_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Uploader deletes own materials"
  ON public.course_materials FOR DELETE TO authenticated USING (auth.uid() = uploaded_by);

-- =========================
-- CHALLENGE ATTACHMENTS
-- =========================
CREATE TABLE public.challenge_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.coding_challenges(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.challenge_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Attachments readable by authenticated"
  ON public.challenge_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users add attachments"
  ON public.challenge_attachments FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Uploader deletes own attachments"
  ON public.challenge_attachments FOR DELETE TO authenticated USING (auth.uid() = uploaded_by);
