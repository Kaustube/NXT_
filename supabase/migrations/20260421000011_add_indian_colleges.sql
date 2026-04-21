-- =========================
-- ADD 10 INDIAN COLLEGES
-- Replace the existing 3 colleges with 10 major Indian colleges
-- =========================

-- Clear existing colleges (this will cascade to related data)
-- WARNING: This will remove Bennett, IIT Delhi, and DU
-- Only run this if you want to replace them
TRUNCATE TABLE public.colleges CASCADE;

-- Insert 10 major Indian colleges
INSERT INTO public.colleges (name, short_code, email_domain) VALUES
  ('Indian Institute of Technology Delhi', 'IITD', 'iitd.ac.in'),
  ('Indian Institute of Technology Bombay', 'IITB', 'iitb.ac.in'),
  ('Indian Institute of Technology Madras', 'IITM', 'iitm.ac.in'),
  ('Indian Institute of Technology Kanpur', 'IITK', 'iitk.ac.in'),
  ('Indian Institute of Technology Kharagpur', 'IITKgp', 'iitkgp.ac.in'),
  ('Birla Institute of Technology and Science Pilani', 'BITS', 'pilani.bits-pilani.ac.in'),
  ('National Institute of Technology Trichy', 'NITT', 'nitt.edu'),
  ('Delhi Technological University', 'DTU', 'dtu.ac.in'),
  ('Vellore Institute of Technology', 'VIT', 'vit.ac.in'),
  ('Manipal Institute of Technology', 'MIT', 'manipal.edu');

-- Create college servers for each
INSERT INTO public.servers (name, slug, kind, college_id, description, auto_join)
SELECT 
  c.name,
  c.short_code,
  'college',
  c.id,
  'Official server for ' || c.name || ' students',
  true
FROM public.colleges c;

-- Create default channels for each college server
INSERT INTO public.channels (server_id, name, type, position)
SELECT s.id, c.name, c.type::channel_type, c.pos 
FROM public.servers s
CROSS JOIN (VALUES
  ('general', 'text', 0),
  ('announcements', 'text', 1),
  ('academics', 'text', 2),
  ('projects', 'text', 3),
  ('placements', 'text', 4),
  ('sports', 'text', 5),
  ('events', 'text', 6),
  ('random', 'text', 7)
) AS c(name, type, pos)
WHERE s.kind = 'college';

-- Create college configurations for each
INSERT INTO public.college_config (college_id)
SELECT id FROM public.colleges
ON CONFLICT (college_id) DO NOTHING;

-- Note: Global servers (Coding Community, AI/ML, Startup) remain unchanged
