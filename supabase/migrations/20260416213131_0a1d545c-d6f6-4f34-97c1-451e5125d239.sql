
-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'member');
CREATE TYPE public.channel_type AS ENUM ('text', 'voice');
CREATE TYPE public.server_kind AS ENUM ('college', 'global');
CREATE TYPE public.listing_category AS ENUM ('buy', 'sell', 'rent');
CREATE TYPE public.connection_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.event_kind AS ENUM ('hackathon', 'codeathon', 'challenge');

-- =========================
-- UTILS
-- =========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================
-- COLLEGES
-- =========================
CREATE TABLE public.colleges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  short_code TEXT NOT NULL UNIQUE,
  email_domain TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.colleges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Colleges readable by authenticated"
  ON public.colleges FOR SELECT TO authenticated USING (true);

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  roll_number TEXT,
  college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
  avatar_url TEXT,
  bio TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- ROLES
-- =========================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Roles readable by authenticated"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

-- =========================
-- AUTO PROFILE TRIGGER
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email TEXT := NEW.email;
  v_domain TEXT := split_part(NEW.email, '@', 2);
  v_local TEXT := split_part(NEW.email, '@', 1);
  v_college UUID;
  v_display TEXT := COALESCE(NEW.raw_user_meta_data->>'display_name', v_local);
  v_username TEXT := COALESCE(NEW.raw_user_meta_data->>'username', v_local);
  v_roll TEXT := NEW.raw_user_meta_data->>'roll_number';
BEGIN
  SELECT id INTO v_college FROM public.colleges WHERE email_domain = v_domain;
  INSERT INTO public.profiles (user_id, display_name, username, email, college_id, roll_number)
  VALUES (NEW.id, v_display, v_username, v_email, v_college, v_roll)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- SERVERS
-- =========================
CREATE TABLE public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  kind server_kind NOT NULL,
  college_id UUID REFERENCES public.colleges(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Servers readable by authenticated"
  ON public.servers FOR SELECT TO authenticated USING (true);

CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type channel_type NOT NULL DEFAULT 'text',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Channels readable by authenticated"
  ON public.channels FOR SELECT TO authenticated USING (true);

CREATE TABLE public.server_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (server_id, user_id)
);
CREATE INDEX idx_server_members_user ON public.server_members(user_id);
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members readable by authenticated"
  ON public.server_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users join servers themselves"
  ON public.server_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users leave servers themselves"
  ON public.server_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- helper: is_server_member
CREATE OR REPLACE FUNCTION public.is_server_member(_user UUID, _server UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.server_members WHERE user_id = _user AND server_id = _server)
$$;

CREATE TABLE public.channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_channel_messages_channel_created ON public.channel_messages(channel_id, created_at);
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read channel messages"
  ON public.channel_messages FOR SELECT TO authenticated
  USING (public.is_server_member(auth.uid(), (SELECT server_id FROM public.channels WHERE id = channel_id)));
CREATE POLICY "Members post channel messages"
  ON public.channel_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id AND public.is_server_member(auth.uid(), (SELECT server_id FROM public.channels WHERE id = channel_id)));
CREATE POLICY "Authors edit own messages"
  ON public.channel_messages FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "Authors delete own messages"
  ON public.channel_messages FOR DELETE TO authenticated USING (auth.uid() = author_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
ALTER TABLE public.channel_messages REPLICA IDENTITY FULL;

-- =========================
-- DMs
-- =========================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b);
CREATE POLICY "Participants create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE TABLE public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_dm_messages_conv ON public.dm_messages(conversation_id, created_at);
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read dms"
  ON public.dm_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)));
CREATE POLICY "Participants send dms"
  ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (auth.uid() = c.user_a OR auth.uid() = c.user_b)));

ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER TABLE public.dm_messages REPLICA IDENTITY FULL;

-- =========================
-- TASKS
-- =========================
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads tasks" ON public.tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates tasks" ON public.tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner deletes tasks" ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- LISTINGS (Marketplace)
-- =========================
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  category listing_category NOT NULL DEFAULT 'sell',
  college_id UUID REFERENCES public.colleges(id) ON DELETE SET NULL,
  college_only BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listings readable by authenticated"
  ON public.listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Seller creates listings"
  ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Seller updates listings"
  ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Seller deletes listings"
  ON public.listings FOR DELETE TO authenticated USING (auth.uid() = seller_id);
CREATE TRIGGER trg_listings_updated BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- EVENTS
-- =========================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  kind event_kind NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events readable by authenticated"
  ON public.events FOR SELECT TO authenticated USING (true);

CREATE TABLE public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Registrations readable by authenticated"
  ON public.event_registrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Self register"
  ON public.event_registrations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Self unregister"
  ON public.event_registrations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================
-- CONNECTIONS
-- =========================
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status connection_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, recipient_id),
  CHECK (requester_id <> recipient_id)
);
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own connections"
  ON public.connections FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE POLICY "Send connection requests"
  ON public.connections FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Recipient updates status"
  ON public.connections FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id OR auth.uid() = requester_id);
CREATE POLICY "Either side deletes"
  ON public.connections FOR DELETE TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = recipient_id);
CREATE TRIGGER trg_connections_updated BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- SEED: colleges
-- =========================
INSERT INTO public.colleges (name, short_code, email_domain) VALUES
  ('Bennett University', 'BU', 'bennett.edu.in'),
  ('IIT Delhi', 'IITD', 'iitd.ac.in'),
  ('Delhi University', 'DU', 'du.ac.in');

-- =========================
-- SEED: servers + channels
-- =========================
WITH bu AS (SELECT id FROM public.colleges WHERE short_code='BU'),
     iitd AS (SELECT id FROM public.colleges WHERE short_code='IITD'),
     du AS (SELECT id FROM public.colleges WHERE short_code='DU')
INSERT INTO public.servers (name, slug, kind, college_id, description) VALUES
  ('Bennett University', 'bennett', 'college', (SELECT id FROM bu), 'Community for Bennett students'),
  ('IIT Delhi', 'iitd', 'college', (SELECT id FROM iitd), 'Community for IIT Delhi students'),
  ('Delhi University', 'du', 'college', (SELECT id FROM du), 'Community for DU students'),
  ('Coding Community', 'coding', 'global', NULL, 'Talk shop with coders across colleges'),
  ('AI / ML', 'ai-ml', 'global', NULL, 'Research, models and projects'),
  ('Startup & Entrepreneurship', 'startup', 'global', NULL, 'Founders, ideas and growth');

INSERT INTO public.channels (server_id, name, type, position)
SELECT s.id, c.name, c.type::channel_type, c.pos FROM public.servers s
CROSS JOIN (VALUES
  ('general', 'text', 0),
  ('announcements', 'text', 1),
  ('sports', 'text', 2),
  ('projects', 'text', 3),
  ('random', 'text', 4),
  ('help', 'text', 5),
  ('voice-lounge', 'voice', 6)
) AS c(name, type, pos);

-- =========================
-- SEED: events
-- =========================
INSERT INTO public.events (title, description, kind, starts_at, location) VALUES
  ('Inter-College Hackathon', '24 hour hackathon across Bennett, IITD and DU. Build, ship, present.', 'hackathon', now() + interval '7 days', 'Online'),
  ('NXT Codeathon: DSA Sprint', 'Three rounds of competitive programming, top 10 advance.', 'codeathon', now() + interval '3 days', 'Online'),
  ('Daily Practice Challenge', 'New problem every day at 8 PM. Streaks count.', 'challenge', now() + interval '1 day', 'Online'),
  ('AI/ML Project Jam', 'Pair up and ship a small ML project in one weekend.', 'hackathon', now() + interval '14 days', 'Online'),
  ('Frontend Speedrun', 'Recreate a UI from a screenshot in 90 minutes.', 'codeathon', now() + interval '5 days', 'Online');
