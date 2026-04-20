-- =========================
-- FREELANCING & GIG PLATFORM
-- Students can offer services and find work
-- =========================

CREATE TYPE public.gig_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.proposal_status AS ENUM ('pending', 'accepted', 'rejected');

-- Freelance services/gigs posted by students
CREATE TABLE public.freelance_gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poster_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'web-dev', 'design', 'writing', 'tutoring', etc.
  budget_min NUMERIC(10,2),
  budget_max NUMERIC(10,2),
  deadline TIMESTAMPTZ,
  status gig_status NOT NULL DEFAULT 'open',
  college_only BOOLEAN NOT NULL DEFAULT false,
  college_id UUID REFERENCES public.colleges(id),
  skills_required TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_freelance_gigs_poster ON public.freelance_gigs(poster_id);
CREATE INDEX idx_freelance_gigs_status ON public.freelance_gigs(status);
CREATE INDEX idx_freelance_gigs_category ON public.freelance_gigs(category);

ALTER TABLE public.freelance_gigs ENABLE ROW LEVEL SECURITY;

-- Proposals for gigs
CREATE TABLE public.gig_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.freelance_gigs(id) ON DELETE CASCADE,
  freelancer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cover_letter TEXT NOT NULL,
  proposed_budget NUMERIC(10,2) NOT NULL,
  estimated_days INT,
  status proposal_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gig_id, freelancer_id)
);

CREATE INDEX idx_gig_proposals_gig ON public.gig_proposals(gig_id);
CREATE INDEX idx_gig_proposals_freelancer ON public.gig_proposals(freelancer_id);

ALTER TABLE public.gig_proposals ENABLE ROW LEVEL SECURITY;

-- Freelancer profiles (extended profile info)
CREATE TABLE public.freelancer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT, -- e.g., "Full-Stack Developer"
  hourly_rate NUMERIC(10,2),
  portfolio_url TEXT,
  github_url TEXT,
  linkedin_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  completed_gigs INT NOT NULL DEFAULT 0,
  rating NUMERIC(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.freelancer_profiles ENABLE ROW LEVEL SECURITY;

-- Gig reviews (after completion)
CREATE TABLE public.gig_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id UUID NOT NULL REFERENCES public.freelance_gigs(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gig_id, reviewer_id, reviewee_id)
);

CREATE INDEX idx_gig_reviews_reviewee ON public.gig_reviews(reviewee_id);
ALTER TABLE public.gig_reviews ENABLE ROW LEVEL SECURITY;

-- =========================
-- HELP & SUPPORT SYSTEM
-- =========================

CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.ticket_category AS ENUM ('technical', 'account', 'course', 'payment', 'other');

-- Support tickets
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category ticket_category NOT NULL,
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_assigned ON public.support_tickets(assigned_to);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Ticket messages/replies
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_staff BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages(ticket_id);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- FAQ system
CREATE TABLE public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  position INT NOT NULL DEFAULT 0,
  helpful_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_faq_category ON public.faq_items(category);
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- =========================
-- RLS POLICIES - FREELANCING
-- =========================

CREATE POLICY "Gigs readable by authenticated"
  ON public.freelance_gigs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users create gigs"
  ON public.freelance_gigs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = poster_id);

CREATE POLICY "Poster updates own gigs"
  ON public.freelance_gigs FOR UPDATE TO authenticated
  USING (auth.uid() = poster_id);

CREATE POLICY "Poster deletes own gigs"
  ON public.freelance_gigs FOR DELETE TO authenticated
  USING (auth.uid() = poster_id);

-- Proposals
CREATE POLICY "Proposals readable by involved parties"
  ON public.gig_proposals FOR SELECT TO authenticated
  USING (
    auth.uid() = freelancer_id OR
    EXISTS (
      SELECT 1 FROM public.freelance_gigs
      WHERE id = gig_id AND poster_id = auth.uid()
    )
  );

CREATE POLICY "Freelancers create proposals"
  ON public.gig_proposals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = freelancer_id);

CREATE POLICY "Freelancers update own proposals"
  ON public.gig_proposals FOR UPDATE TO authenticated
  USING (
    auth.uid() = freelancer_id OR
    EXISTS (
      SELECT 1 FROM public.freelance_gigs
      WHERE id = gig_id AND poster_id = auth.uid()
    )
  );

-- Freelancer profiles
CREATE POLICY "Profiles readable by all"
  ON public.freelancer_profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users manage own freelancer profile"
  ON public.freelancer_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Gig reviews
CREATE POLICY "Reviews readable by all"
  ON public.gig_reviews FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Involved parties create reviews"
  ON public.gig_reviews FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
      SELECT 1 FROM public.freelance_gigs g
      WHERE g.id = gig_id
      AND (g.poster_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.gig_proposals p
        WHERE p.gig_id = g.id
        AND p.freelancer_id = auth.uid()
        AND p.status = 'accepted'
      ))
    )
  );

-- =========================
-- RLS POLICIES - SUPPORT
-- =========================

CREATE POLICY "Users view own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id OR
    auth.uid() = assigned_to OR
    public.is_any_admin(auth.uid())
  );

CREATE POLICY "Users create tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and staff update tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id OR
    auth.uid() = assigned_to OR
    public.is_any_admin(auth.uid())
  );

-- Ticket messages
CREATE POLICY "Participants view ticket messages"
  ON public.ticket_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
      AND (
        t.user_id = auth.uid() OR
        t.assigned_to = auth.uid() OR
        public.is_any_admin(auth.uid())
      )
    )
  );

CREATE POLICY "Participants send ticket messages"
  ON public.ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
      AND (
        t.user_id = auth.uid() OR
        t.assigned_to = auth.uid() OR
        public.is_any_admin(auth.uid())
      )
    )
  );

-- FAQ
CREATE POLICY "FAQ readable by all"
  ON public.faq_items FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins manage FAQ"
  ON public.faq_items FOR ALL TO authenticated
  USING (public.is_any_admin(auth.uid()))
  WITH CHECK (public.is_any_admin(auth.uid()));

-- =========================
-- TRIGGERS
-- =========================

CREATE TRIGGER trg_freelance_gigs_updated BEFORE UPDATE ON public.freelance_gigs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_gig_proposals_updated BEFORE UPDATE ON public.gig_proposals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_freelancer_profiles_updated BEFORE UPDATE ON public.freelancer_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_support_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_faq_updated BEFORE UPDATE ON public.faq_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update freelancer rating when review is added
CREATE OR REPLACE FUNCTION public.update_freelancer_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.freelancer_profiles
  SET rating = (
    SELECT ROUND(AVG(rating)::numeric, 2)
    FROM public.gig_reviews
    WHERE reviewee_id = NEW.reviewee_id
  )
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_freelancer_rating
  AFTER INSERT OR UPDATE ON public.gig_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_freelancer_rating();

-- =========================
-- SEED DATA
-- =========================

-- Sample FAQ items
INSERT INTO public.faq_items (category, question, answer, position) VALUES
  ('getting-started', 'How do I join my college server?', 'Sign up with your college email address and you''ll automatically be added to your college server.', 1),
  ('getting-started', 'How do I enroll in a course?', 'Browse courses in the LMS section, click on a course, and hit the "Enroll" button.', 2),
  ('account', 'How do I reset my password?', 'Click "Forgot password?" on the login page and follow the instructions sent to your email.', 1),
  ('account', 'Can I change my username?', 'Yes, go to your profile settings and update your username.', 2),
  ('freelancing', 'How do I start freelancing?', 'Create a freelancer profile in the Opportunities section, then browse and apply to gigs.', 1),
  ('freelancing', 'How do payments work?', 'Payments are handled directly between clients and freelancers. We recommend using secure payment methods.', 2);
