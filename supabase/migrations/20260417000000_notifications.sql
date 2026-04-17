-- Ensure the trigger helper exists (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================
-- NOTIFICATION TYPE ENUM
-- =========================
CREATE TYPE public.notification_type AS ENUM ('dm', 'channel_message', 'friend_request', 'friend_accepted');

-- =========================
-- NOTIFICATIONS TABLE
-- =========================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ref_id TEXT,          -- conversation_id, channel_id, or connection_id
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_read ON public.notifications(user_id, read, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System inserts notifications"
  ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- =========================
-- NOTIFICATION PREFERENCES
-- =========================
CREATE TABLE public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_volume INT NOT NULL DEFAULT 80 CHECK (sound_volume BETWEEN 0 AND 100),
  dm_notifications BOOLEAN NOT NULL DEFAULT true,
  channel_notifications BOOLEAN NOT NULL DEFAULT true,
  friend_notifications BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own prefs"
  ON public.notification_preferences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own prefs"
  ON public.notification_preferences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own prefs"
  ON public.notification_preferences FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_notif_prefs_updated BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- TRIGGER: DM notification
-- =========================
CREATE OR REPLACE FUNCTION public.notify_on_dm()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_other UUID;
  v_sender_name TEXT;
BEGIN
  -- find the other participant
  SELECT CASE WHEN user_a = NEW.sender_id THEN user_b ELSE user_a END
    INTO v_other
    FROM public.conversations WHERE id = NEW.conversation_id;

  -- get sender display name
  SELECT display_name INTO v_sender_name FROM public.profiles WHERE user_id = NEW.sender_id;

  -- insert notification for the recipient (not the sender)
  IF v_other IS NOT NULL AND v_other <> NEW.sender_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, actor_id, ref_id)
    VALUES (
      v_other,
      'dm',
      COALESCE(v_sender_name, 'Someone') || ' sent you a message',
      LEFT(NEW.content, 120),
      NEW.sender_id,
      NEW.conversation_id::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_dm
  AFTER INSERT ON public.dm_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_dm();

-- =========================
-- TRIGGER: Channel message notification
-- =========================
CREATE OR REPLACE FUNCTION public.notify_on_channel_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_server_id UUID;
  v_channel_name TEXT;
  v_server_name TEXT;
  v_author_name TEXT;
  v_member RECORD;
BEGIN
  SELECT ch.server_id, ch.name INTO v_server_id, v_channel_name
    FROM public.channels ch WHERE ch.id = NEW.channel_id;

  SELECT s.name INTO v_server_name FROM public.servers s WHERE s.id = v_server_id;
  SELECT display_name INTO v_author_name FROM public.profiles WHERE user_id = NEW.author_id;

  -- notify all server members except the author
  FOR v_member IN
    SELECT user_id FROM public.server_members
    WHERE server_id = v_server_id AND user_id <> NEW.author_id
  LOOP
    INSERT INTO public.notifications (user_id, type, title, body, actor_id, ref_id)
    VALUES (
      v_member.user_id,
      'channel_message',
      COALESCE(v_author_name, 'Someone') || ' in #' || v_channel_name,
      LEFT(NEW.content, 120),
      NEW.author_id,
      NEW.channel_id::TEXT
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_channel_message
  AFTER INSERT ON public.channel_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_channel_message();

-- =========================
-- TRIGGER: Friend request / accepted
-- =========================
CREATE OR REPLACE FUNCTION public.notify_on_connection()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_requester_name TEXT;
  v_recipient_name TEXT;
BEGIN
  SELECT display_name INTO v_requester_name FROM public.profiles WHERE user_id = NEW.requester_id;
  SELECT display_name INTO v_recipient_name FROM public.profiles WHERE user_id = NEW.recipient_id;

  IF TG_OP = 'INSERT' THEN
    -- new friend request → notify recipient
    INSERT INTO public.notifications (user_id, type, title, body, actor_id, ref_id)
    VALUES (
      NEW.recipient_id,
      'friend_request',
      COALESCE(v_requester_name, 'Someone') || ' sent you a friend request',
      NULL,
      NEW.requester_id,
      NEW.id::TEXT
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- accepted → notify requester
    INSERT INTO public.notifications (user_id, type, title, body, actor_id, ref_id)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      COALESCE(v_recipient_name, 'Someone') || ' accepted your friend request',
      NULL,
      NEW.recipient_id,
      NEW.id::TEXT
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_connection
  AFTER INSERT OR UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_connection();
