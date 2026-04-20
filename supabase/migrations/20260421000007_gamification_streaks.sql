-- =========================
-- ENHANCED GAMIFICATION & STREAKS
-- XP, Levels, Badges, Achievements, Leaderboards
-- =========================

-- Enhanced user streaks
DROP TABLE IF EXISTS public.user_streaks CASCADE;
CREATE TABLE public.user_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Overall streak
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_activity_date DATE,
  
  -- Activity-specific streaks
  coding_streak INT NOT NULL DEFAULT 0,
  learning_streak INT NOT NULL DEFAULT 0,
  sports_streak INT NOT NULL DEFAULT 0,
  
  -- Total activities
  total_logins INT NOT NULL DEFAULT 0,
  total_problems_solved INT NOT NULL DEFAULT 0,
  total_courses_completed INT NOT NULL DEFAULT 0,
  total_lessons_completed INT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_streaks_user ON public.user_streaks(user_id);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

-- XP and Levels
CREATE TABLE public.user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  
  total_xp INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 1,
  xp_to_next_level INT NOT NULL DEFAULT 100,
  
  -- XP breakdown
  coding_xp INT NOT NULL DEFAULT 0,
  learning_xp INT NOT NULL DEFAULT 0,
  social_xp INT NOT NULL DEFAULT 0,
  sports_xp INT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_xp_user ON public.user_xp(user_id);
CREATE INDEX idx_user_xp_level ON public.user_xp(level DESC, total_xp DESC);
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

-- XP transactions log
CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  category TEXT NOT NULL, -- 'coding', 'learning', 'social', 'sports'
  reference_id UUID, -- ID of related entity (problem, course, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_xp_transactions_user ON public.xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created ON public.xp_transactions(created_at DESC);
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

-- Badges
CREATE TABLE public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL, -- 'coding', 'learning', 'social', 'sports', 'special'
  rarity TEXT NOT NULL DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  criteria JSONB NOT NULL, -- Conditions to earn badge
  xp_reward INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_badges_category ON public.badges(category);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- User badges
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Achievements
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL,
  
  -- Progress tracking
  target_value INT NOT NULL, -- e.g., solve 100 problems
  progress_type TEXT NOT NULL, -- 'count', 'streak', 'score'
  
  xp_reward INT NOT NULL DEFAULT 0,
  badge_id UUID REFERENCES public.badges(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_achievements_category ON public.achievements(category);
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

-- User achievement progress
CREATE TABLE public.user_achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  current_value INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievement_progress_user ON public.user_achievement_progress(user_id);
ALTER TABLE public.user_achievement_progress ENABLE ROW LEVEL SECURITY;

-- Leaderboards
CREATE TABLE public.leaderboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL, -- 'xp', 'problems_solved', 'streak', 'course_completion'
  scope TEXT NOT NULL DEFAULT 'global', -- 'global', 'college', 'department'
  time_period TEXT NOT NULL DEFAULT 'all_time', -- 'all_time', 'monthly', 'weekly', 'daily'
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;

-- Daily activity log
CREATE TABLE public.user_daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  
  -- Activity counts
  problems_solved INT NOT NULL DEFAULT 0,
  lessons_completed INT NOT NULL DEFAULT 0,
  messages_sent INT NOT NULL DEFAULT 0,
  sports_bookings INT NOT NULL DEFAULT 0,
  
  -- Time spent (minutes)
  time_spent_learning INT NOT NULL DEFAULT 0,
  time_spent_coding INT NOT NULL DEFAULT 0,
  
  -- XP earned today
  xp_earned INT NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, activity_date)
);

CREATE INDEX idx_user_daily_activity_user ON public.user_daily_activity(user_id);
CREATE INDEX idx_user_daily_activity_date ON public.user_daily_activity(activity_date DESC);
ALTER TABLE public.user_daily_activity ENABLE ROW LEVEL SECURITY;

-- Functions

-- Award XP to user
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_amount INT,
  p_reason TEXT,
  p_category TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_new_total INT;
  v_current_level INT;
  v_xp_to_next INT;
BEGIN
  -- Insert XP transaction
  INSERT INTO public.xp_transactions (user_id, amount, reason, category, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_category, p_reference_id);
  
  -- Update user XP
  INSERT INTO public.user_xp (user_id, total_xp)
  VALUES (p_user_id, p_amount)
  ON CONFLICT (user_id) DO UPDATE
  SET 
    total_xp = user_xp.total_xp + p_amount,
    coding_xp = CASE WHEN p_category = 'coding' THEN user_xp.coding_xp + p_amount ELSE user_xp.coding_xp END,
    learning_xp = CASE WHEN p_category = 'learning' THEN user_xp.learning_xp + p_amount ELSE user_xp.learning_xp END,
    social_xp = CASE WHEN p_category = 'social' THEN user_xp.social_xp + p_amount ELSE user_xp.social_xp END,
    sports_xp = CASE WHEN p_category = 'sports' THEN user_xp.sports_xp + p_amount ELSE user_xp.sports_xp END,
    updated_at = now()
  RETURNING total_xp, level, xp_to_next_level INTO v_new_total, v_current_level, v_xp_to_next;
  
  -- Check for level up
  WHILE v_new_total >= v_xp_to_next LOOP
    v_current_level := v_current_level + 1;
    v_xp_to_next := v_xp_to_next + (v_current_level * 100); -- Each level requires 100 more XP
    
    UPDATE public.user_xp
    SET level = v_current_level, xp_to_next_level = v_xp_to_next
    WHERE user_id = p_user_id;
  END LOOP;
END;
$$;

-- Update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_activity DATE;
  v_current_streak INT;
BEGIN
  SELECT last_activity_date, current_streak INTO v_last_activity, v_current_streak
  FROM public.user_streaks
  WHERE user_id = p_user_id;
  
  IF v_last_activity IS NULL THEN
    -- First activity
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_activity_date)
    VALUES (p_user_id, 1, 1, CURRENT_DATE);
  ELSIF v_last_activity = CURRENT_DATE THEN
    -- Already logged today, do nothing
    RETURN;
  ELSIF v_last_activity = CURRENT_DATE - 1 THEN
    -- Consecutive day
    UPDATE public.user_streaks
    SET 
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_activity_date = CURRENT_DATE,
      total_logins = total_logins + 1,
      updated_at = now()
    WHERE user_id = p_user_id;
  ELSE
    -- Streak broken
    UPDATE public.user_streaks
    SET 
      current_streak = 1,
      last_activity_date = CURRENT_DATE,
      total_logins = total_logins + 1,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- RLS Policies
CREATE POLICY "Users view own streaks"
  ON public.user_streaks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users view own XP"
  ON public.user_xp FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "XP leaderboard readable by all"
  ON public.user_xp FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users view own XP transactions"
  ON public.xp_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Badges readable by all"
  ON public.badges FOR SELECT TO authenticated USING (true);

CREATE POLICY "User badges readable by all"
  ON public.user_badges FOR SELECT TO authenticated USING (true);

CREATE POLICY "Achievements readable by all"
  ON public.achievements FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users view own achievement progress"
  ON public.user_achievement_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Leaderboards readable by all"
  ON public.leaderboards FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users view own daily activity"
  ON public.user_daily_activity FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER trg_user_streaks_updated BEFORE UPDATE ON public.user_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_user_xp_updated BEFORE UPDATE ON public.user_xp
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed badges
INSERT INTO public.badges (name, description, icon, category, rarity, criteria, xp_reward) VALUES
  ('First Steps', 'Complete your first coding problem', '🎯', 'coding', 'common', '{"problems_solved": 1}'::jsonb, 10),
  ('Problem Solver', 'Solve 10 coding problems', '💡', 'coding', 'common', '{"problems_solved": 10}'::jsonb, 50),
  ('Code Master', 'Solve 100 coding problems', '👑', 'coding', 'epic', '{"problems_solved": 100}'::jsonb, 500),
  
  ('Eager Learner', 'Complete your first course', '📚', 'learning', 'common', '{"courses_completed": 1}'::jsonb, 20),
  ('Knowledge Seeker', 'Complete 5 courses', '🎓', 'learning', 'rare', '{"courses_completed": 5}'::jsonb, 100),
  
  ('Social Butterfly', 'Make 10 connections', '🦋', 'social', 'common', '{"connections": 10}'::jsonb, 30),
  ('Community Leader', 'Send 100 messages', '💬', 'social', 'rare', '{"messages_sent": 100}'::jsonb, 80),
  
  ('Fitness Enthusiast', 'Book 10 sports sessions', '💪', 'sports', 'common', '{"sports_bookings": 10}'::jsonb, 40),
  
  ('Week Warrior', 'Maintain a 7-day streak', '🔥', 'special', 'rare', '{"streak": 7}'::jsonb, 100),
  ('Month Master', 'Maintain a 30-day streak', '⚡', 'special', 'epic', '{"streak": 30}'::jsonb, 500),
  ('Year Legend', 'Maintain a 365-day streak', '🏆', 'special', 'legendary', '{"streak": 365}'::jsonb, 5000);

-- Seed achievements
INSERT INTO public.achievements (name, description, icon, category, target_value, progress_type, xp_reward) VALUES
  ('Problem Solving Novice', 'Solve 10 coding problems', '🎯', 'coding', 10, 'count', 50),
  ('Problem Solving Expert', 'Solve 50 coding problems', '💡', 'coding', 50, 'count', 200),
  ('Problem Solving Master', 'Solve 100 coding problems', '👑', 'coding', 100, 'count', 500),
  
  ('Course Completer', 'Complete 5 courses', '📚', 'learning', 5, 'count', 100),
  ('Lifelong Learner', 'Complete 20 courses', '🎓', 'learning', 20, 'count', 400),
  
  ('Streak Starter', 'Maintain a 7-day streak', '🔥', 'streak', 7, 'streak', 100),
  ('Streak Champion', 'Maintain a 30-day streak', '⚡', 'streak', 30, 'streak', 500);

-- Seed leaderboards
INSERT INTO public.leaderboards (name, description, type, scope, time_period) VALUES
  ('Global XP Leaderboard', 'Top users by total XP', 'xp', 'global', 'all_time'),
  ('Monthly XP Leaderboard', 'Top users this month', 'xp', 'global', 'monthly'),
  ('Problem Solving Champions', 'Most problems solved', 'problems_solved', 'global', 'all_time'),
  ('Longest Streaks', 'Users with longest streaks', 'streak', 'global', 'all_time'),
  ('College XP Leaderboard', 'Top users in your college', 'xp', 'college', 'all_time');
