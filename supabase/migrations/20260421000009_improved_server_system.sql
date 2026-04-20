-- =========================
-- IMPROVED SERVER SYSTEM
-- Auto-join college servers, public servers, and user-created group chats
-- =========================

-- Update server kinds
ALTER TABLE public.servers DROP CONSTRAINT IF EXISTS servers_kind_check;
ALTER TABLE public.servers ADD CONSTRAINT servers_kind_check 
  CHECK (kind IN ('college', 'global', 'group'));

-- Add creator and privacy settings
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS max_members INT;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS auto_join BOOLEAN NOT NULL DEFAULT false;

-- Create index on invite code
CREATE INDEX IF NOT EXISTS idx_servers_invite_code ON public.servers(invite_code);

-- Server invites
CREATE TABLE IF NOT EXISTS public.server_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_uses INT,
  uses INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_server_invites_server ON public.server_invites(server_id);
CREATE INDEX idx_server_invites_code ON public.server_invites(code);
ALTER TABLE public.server_invites ENABLE ROW LEVEL SECURITY;

-- Server member roles
ALTER TABLE public.server_members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';
ALTER TABLE public.server_members ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Add constraint for roles
ALTER TABLE public.server_members DROP CONSTRAINT IF EXISTS server_members_role_check;
ALTER TABLE public.server_members ADD CONSTRAINT server_members_role_check 
  CHECK (role IN ('owner', 'admin', 'moderator', 'member'));

-- Server join requests (for private servers)
CREATE TABLE IF NOT EXISTS public.server_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (server_id, user_id)
);

CREATE INDEX idx_server_join_requests_server ON public.server_join_requests(server_id);
CREATE INDEX idx_server_join_requests_user ON public.server_join_requests(user_id);
CREATE INDEX idx_server_join_requests_status ON public.server_join_requests(status);
ALTER TABLE public.server_join_requests ENABLE ROW LEVEL SECURITY;

-- Function to generate invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Function to auto-join college server on signup
CREATE OR REPLACE FUNCTION public.auto_join_college_server()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_college_id UUID;
  v_server_id UUID;
BEGIN
  -- Get user's college
  SELECT college_id INTO v_college_id
  FROM public.profiles
  WHERE user_id = NEW.id;
  
  IF v_college_id IS NOT NULL THEN
    -- Find college server
    SELECT id INTO v_server_id
    FROM public.servers
    WHERE kind = 'college' 
    AND college_id = v_college_id
    AND auto_join = true
    LIMIT 1;
    
    IF v_server_id IS NOT NULL THEN
      -- Auto-join the server
      INSERT INTO public.server_members (server_id, user_id, role)
      VALUES (v_server_id, NEW.id, 'member')
      ON CONFLICT (server_id, user_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-join (only if not exists)
DROP TRIGGER IF EXISTS trg_auto_join_college_server ON auth.users;
CREATE TRIGGER trg_auto_join_college_server
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_join_college_server();

-- Function to create group chat
CREATE OR REPLACE FUNCTION public.create_group_chat(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_is_private BOOLEAN DEFAULT false,
  p_max_members INT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_server_id UUID;
  v_slug TEXT;
  v_invite_code TEXT;
BEGIN
  -- Generate slug
  v_slug := lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);
  
  -- Generate invite code if private
  IF p_is_private THEN
    v_invite_code := public.generate_invite_code();
  END IF;
  
  -- Create server
  INSERT INTO public.servers (
    name, slug, kind, created_by, is_private, 
    max_members, invite_code, description
  )
  VALUES (
    p_name, v_slug, 'group', auth.uid(), p_is_private,
    p_max_members, v_invite_code, p_description
  )
  RETURNING id INTO v_server_id;
  
  -- Add creator as owner
  INSERT INTO public.server_members (server_id, user_id, role)
  VALUES (v_server_id, auth.uid(), 'owner');
  
  -- Create default channel
  INSERT INTO public.channels (server_id, name, type, position)
  VALUES (v_server_id, 'general', 'text', 0);
  
  RETURN v_server_id;
END;
$$;

-- Function to join server with invite code
CREATE OR REPLACE FUNCTION public.join_server_with_invite(p_invite_code TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_server_id UUID;
  v_invite_id UUID;
  v_max_uses INT;
  v_current_uses INT;
  v_expires_at TIMESTAMPTZ;
  v_max_members INT;
  v_current_members INT;
BEGIN
  -- Find invite
  SELECT id, server_id, max_uses, uses, expires_at
  INTO v_invite_id, v_server_id, v_max_uses, v_current_uses, v_expires_at
  FROM public.server_invites
  WHERE code = p_invite_code;
  
  IF v_invite_id IS NULL THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;
  
  -- Check if expired
  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'Invite code has expired';
  END IF;
  
  -- Check max uses
  IF v_max_uses IS NOT NULL AND v_current_uses >= v_max_uses THEN
    RAISE EXCEPTION 'Invite code has reached maximum uses';
  END IF;
  
  -- Check server max members
  SELECT max_members INTO v_max_members
  FROM public.servers
  WHERE id = v_server_id;
  
  IF v_max_members IS NOT NULL THEN
    SELECT COUNT(*) INTO v_current_members
    FROM public.server_members
    WHERE server_id = v_server_id;
    
    IF v_current_members >= v_max_members THEN
      RAISE EXCEPTION 'Server has reached maximum members';
    END IF;
  END IF;
  
  -- Join server
  INSERT INTO public.server_members (server_id, user_id, role)
  VALUES (v_server_id, auth.uid(), 'member')
  ON CONFLICT (server_id, user_id) DO NOTHING;
  
  -- Increment invite uses
  UPDATE public.server_invites
  SET uses = uses + 1
  WHERE id = v_invite_id;
  
  RETURN v_server_id;
END;
$$;

-- Function to create server invite
CREATE OR REPLACE FUNCTION public.create_server_invite(
  p_server_id UUID,
  p_max_uses INT DEFAULT NULL,
  p_expires_in_hours INT DEFAULT NULL
)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Check if user is admin/owner
  IF NOT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = p_server_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only server admins can create invites';
  END IF;
  
  -- Generate code
  v_code := public.generate_invite_code();
  
  -- Calculate expiry
  IF p_expires_in_hours IS NOT NULL THEN
    v_expires_at := now() + (p_expires_in_hours || ' hours')::interval;
  END IF;
  
  -- Create invite
  INSERT INTO public.server_invites (
    server_id, code, created_by, max_uses, expires_at
  )
  VALUES (
    p_server_id, v_code, auth.uid(), p_max_uses, v_expires_at
  );
  
  RETURN v_code;
END;
$$;

-- Function to request to join private server
CREATE OR REPLACE FUNCTION public.request_join_server(
  p_server_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Check if server is private
  IF NOT EXISTS (
    SELECT 1 FROM public.servers
    WHERE id = p_server_id AND is_private = true
  ) THEN
    RAISE EXCEPTION 'Server is not private';
  END IF;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = p_server_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Already a member of this server';
  END IF;
  
  -- Create request
  INSERT INTO public.server_join_requests (server_id, user_id, message)
  VALUES (p_server_id, auth.uid(), p_message)
  ON CONFLICT (server_id, user_id) 
  DO UPDATE SET message = p_message, status = 'pending', created_at = now()
  RETURNING id INTO v_request_id;
  
  RETURN v_request_id;
END;
$$;

-- Function to approve/reject join request
CREATE OR REPLACE FUNCTION public.review_join_request(
  p_request_id UUID,
  p_approve BOOLEAN
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_server_id UUID;
  v_user_id UUID;
BEGIN
  -- Get request details
  SELECT server_id, user_id INTO v_server_id, v_user_id
  FROM public.server_join_requests
  WHERE id = p_request_id;
  
  -- Check if reviewer is admin/owner
  IF NOT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE server_id = v_server_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Only server admins can review requests';
  END IF;
  
  -- Update request
  UPDATE public.server_join_requests
  SET 
    status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  WHERE id = p_request_id;
  
  -- If approved, add to server
  IF p_approve THEN
    INSERT INTO public.server_members (server_id, user_id, role)
    VALUES (v_server_id, v_user_id, 'member')
    ON CONFLICT (server_id, user_id) DO NOTHING;
  END IF;
END;
$$;

-- Update RLS policies

-- Servers: Show college servers only to college members, public servers to all, group chats to members
DROP POLICY IF EXISTS "Servers readable by authenticated" ON public.servers;
CREATE POLICY "Servers readable by authenticated"
  ON public.servers FOR SELECT TO authenticated
  USING (
    kind = 'global' OR -- Public servers visible to all
    (kind = 'college' AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND p.college_id = servers.college_id
    )) OR
    (kind = 'group' AND (
      is_private = false OR -- Public groups visible to all
      EXISTS ( -- Private groups only to members
        SELECT 1 FROM public.server_members sm
        WHERE sm.server_id = servers.id
        AND sm.user_id = auth.uid()
      )
    )) OR
    public.is_any_admin(auth.uid())
  );

-- Users can create group chats
CREATE POLICY "Users create group chats"
  ON public.servers FOR INSERT TO authenticated
  WITH CHECK (
    kind = 'group' AND
    created_by = auth.uid()
  );

-- Owners and admins can update their servers
CREATE POLICY "Server admins update servers"
  ON public.servers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = servers.id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'admin')
    ) OR
    public.is_any_admin(auth.uid())
  );

-- Owners can delete their group chats
CREATE POLICY "Owners delete group chats"
  ON public.servers FOR DELETE TO authenticated
  USING (
    kind = 'group' AND
    created_by = auth.uid()
  );

-- Server invites policies
CREATE POLICY "Server members view invites"
  ON public.server_invites FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_invites.server_id
      AND sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Server admins create invites"
  ON public.server_invites FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_invites.server_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'admin')
    )
  );

-- Join requests policies
CREATE POLICY "Users view own join requests"
  ON public.server_join_requests FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_join_requests.server_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users create join requests"
  ON public.server_join_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Server admins update join requests"
  ON public.server_join_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.server_members sm
      WHERE sm.server_id = server_join_requests.server_id
      AND sm.user_id = auth.uid()
      AND sm.role IN ('owner', 'admin')
    )
  );

-- Update existing college servers to have auto_join enabled
UPDATE public.servers
SET auto_join = true
WHERE kind = 'college';

-- Add permissions for server management
INSERT INTO public.permissions (name, description, category) VALUES
  ('server.create', 'Create servers', 'server'),
  ('server.manage_invites', 'Manage server invites', 'server'),
  ('server.manage_requests', 'Manage join requests', 'server')
ON CONFLICT (name) DO NOTHING;

-- Assign to roles
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions WHERE name LIKE 'server.%'
ON CONFLICT DO NOTHING;

-- Create view for user's servers
CREATE OR REPLACE VIEW public.user_servers AS
SELECT 
  s.*,
  sm.role as user_role,
  sm.joined_at,
  (SELECT COUNT(*) FROM public.server_members WHERE server_id = s.id) as member_count,
  (SELECT COUNT(*) FROM public.channels WHERE server_id = s.id) as channel_count
FROM public.servers s
JOIN public.server_members sm ON sm.server_id = s.id
WHERE sm.user_id = auth.uid();

-- Grant access to view
GRANT SELECT ON public.user_servers TO authenticated;
