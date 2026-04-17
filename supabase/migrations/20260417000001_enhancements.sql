-- Ensure the trigger helper exists (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =========================
-- DAILY STREAKS
-- =========================
CREATE TABLE public.user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_active_date DATE,
  total_days_active INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own streak" ON public.user_streaks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users upsert own streak" ON public.user_streaks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own streak" ON public.user_streaks FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =========================
-- CODING CHALLENGES
-- =========================
CREATE TYPE public.challenge_difficulty AS ENUM ('easy', 'medium', 'hard');

CREATE TABLE public.coding_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  difficulty challenge_difficulty NOT NULL DEFAULT 'medium',
  tags TEXT[] NOT NULL DEFAULT '{}',
  examples JSONB NOT NULL DEFAULT '[]',
  constraints TEXT,
  active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coding_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Challenges readable by authenticated" ON public.coding_challenges FOR SELECT TO authenticated USING (true);

CREATE TABLE public.challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.coding_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'python',
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted | accepted | wrong
  runtime_ms INT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own submissions" ON public.challenge_submissions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users submit" ON public.challenge_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own submission" ON public.challenge_submissions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- =========================
-- SPORTS BOOKINGS (persistent)
-- =========================
CREATE TABLE public.sports_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  court_name TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sports_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own bookings" ON public.sports_bookings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create bookings" ON public.sports_bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users cancel bookings" ON public.sports_bookings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================
-- PROFILE AVATAR STORAGE BUCKET (policy only — bucket created via dashboard)
-- =========================
-- Note: Create a public bucket named "avatars" in Supabase Storage dashboard

-- =========================
-- SEED: Coding Challenges
-- =========================
INSERT INTO public.coding_challenges (title, slug, description, difficulty, tags, examples, constraints, active_date) VALUES
(
  'Two Sum',
  'two-sum',
  'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.',
  'easy',
  ARRAY['array', 'hash-map'],
  '[{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] = 2 + 7 = 9"}, {"input": "nums = [3,2,4], target = 6", "output": "[1,2]"}]',
  '2 <= nums.length <= 10^4 | -10^9 <= nums[i] <= 10^9',
  CURRENT_DATE
),
(
  'Valid Parentheses',
  'valid-parentheses',
  'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid. An input string is valid if: open brackets must be closed by the same type of brackets, and open brackets must be closed in the correct order.',
  'easy',
  ARRAY['string', 'stack'],
  '[{"input": "s = \"()\"", "output": "true"}, {"input": "s = \"()[]{}\"", "output": "true"}, {"input": "s = \"(]\"", "output": "false"}]',
  '1 <= s.length <= 10^4',
  CURRENT_DATE - INTERVAL '1 day'
),
(
  'Longest Substring Without Repeating Characters',
  'longest-substring',
  'Given a string `s`, find the length of the longest substring without repeating characters.',
  'medium',
  ARRAY['string', 'sliding-window', 'hash-map'],
  '[{"input": "s = \"abcabcbb\"", "output": "3", "explanation": "The answer is \"abc\", with the length of 3."}, {"input": "s = \"bbbbb\"", "output": "1"}]',
  '0 <= s.length <= 5 * 10^4',
  CURRENT_DATE - INTERVAL '2 days'
),
(
  'Merge Intervals',
  'merge-intervals',
  'Given an array of intervals where intervals[i] = [starti, endi], merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.',
  'medium',
  ARRAY['array', 'sorting'],
  '[{"input": "intervals = [[1,3],[2,6],[8,10],[15,18]]", "output": "[[1,6],[8,10],[15,18]]"}, {"input": "intervals = [[1,4],[4,5]]", "output": "[[1,5]]"}]',
  '1 <= intervals.length <= 10^4',
  CURRENT_DATE - INTERVAL '3 days'
),
(
  'Word Search',
  'word-search',
  'Given an m x n grid of characters board and a string word, return true if word exists in the grid. The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring.',
  'hard',
  ARRAY['matrix', 'backtracking', 'dfs'],
  '[{"input": "board = [[\"A\",\"B\",\"C\",\"E\"],[\"S\",\"F\",\"C\",\"S\"],[\"A\",\"D\",\"E\",\"E\"]], word = \"ABCCED\"", "output": "true"}]',
  '1 <= m, n <= 6 | 1 <= word.length <= 15',
  CURRENT_DATE - INTERVAL '4 days'
);
