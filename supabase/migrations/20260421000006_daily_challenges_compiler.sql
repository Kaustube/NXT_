-- =========================
-- DAILY CHALLENGES & CODE COMPILER
-- Word of the Day, Coding Problems, Test Prep
-- =========================

-- Daily word challenge
CREATE TABLE public.daily_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  pronunciation TEXT,
  example_sentence TEXT,
  synonyms TEXT[] DEFAULT '{}',
  antonyms TEXT[] DEFAULT '{}',
  difficulty TEXT NOT NULL DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  category TEXT, -- 'gre', 'gmat', 'sat', 'general'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_words_date ON public.daily_words(date);
ALTER TABLE public.daily_words ENABLE ROW LEVEL SECURITY;

-- User word progress
CREATE TABLE public.user_word_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.daily_words(id) ON DELETE CASCADE,
  learned BOOLEAN NOT NULL DEFAULT false,
  learned_at TIMESTAMPTZ,
  UNIQUE (user_id, word_id)
);

CREATE INDEX idx_user_word_progress_user ON public.user_word_progress(user_id);
ALTER TABLE public.user_word_progress ENABLE ROW LEVEL SECURITY;

-- Coding problems (LeetCode/GFG style)
CREATE TABLE public.coding_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard'
  category TEXT NOT NULL, -- 'array', 'string', 'dp', 'graph', etc.
  tags TEXT[] DEFAULT '{}',
  
  -- Problem details
  input_format TEXT,
  output_format TEXT,
  constraints TEXT,
  examples JSONB, -- Array of {input, output, explanation}
  
  -- Test cases
  test_cases JSONB, -- Array of {input, expected_output, is_hidden}
  
  -- Solution template
  starter_code JSONB, -- {python: "...", javascript: "...", java: "..."}
  
  -- Metadata
  acceptance_rate NUMERIC(5,2) DEFAULT 0,
  total_submissions INT DEFAULT 0,
  total_accepted INT DEFAULT 0,
  
  -- Daily challenge
  is_daily BOOLEAN NOT NULL DEFAULT false,
  daily_date DATE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coding_problems_difficulty ON public.coding_problems(difficulty);
CREATE INDEX idx_coding_problems_category ON public.coding_problems(category);
CREATE INDEX idx_coding_problems_daily ON public.coding_problems(is_daily, daily_date);
ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;

-- Code submissions
CREATE TABLE public.code_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT NOT NULL, -- 'python', 'javascript', 'java', 'cpp'
  code TEXT NOT NULL,
  status TEXT NOT NULL, -- 'accepted', 'wrong_answer', 'runtime_error', 'time_limit', 'compile_error'
  runtime_ms INT,
  memory_kb INT,
  test_cases_passed INT DEFAULT 0,
  test_cases_total INT DEFAULT 0,
  error_message TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_code_submissions_problem ON public.code_submissions(problem_id);
CREATE INDEX idx_code_submissions_user ON public.code_submissions(user_id);
CREATE INDEX idx_code_submissions_status ON public.code_submissions(status);
ALTER TABLE public.code_submissions ENABLE ROW LEVEL SECURITY;

-- User problem progress
CREATE TABLE public.user_problem_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  solved BOOLEAN NOT NULL DEFAULT false,
  attempts INT NOT NULL DEFAULT 0,
  best_runtime_ms INT,
  first_solved_at TIMESTAMPTZ,
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, problem_id)
);

CREATE INDEX idx_user_problem_progress_user ON public.user_problem_progress(user_id);
ALTER TABLE public.user_problem_progress ENABLE ROW LEVEL SECURITY;

-- Test prep questions (GMAT, GRE, CAT, SAT, etc.)
CREATE TABLE public.test_prep_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_type TEXT NOT NULL, -- 'gmat', 'gre', 'cat', 'sat', 'ielts', 'toefl', 'gate'
  section TEXT NOT NULL, -- 'quant', 'verbal', 'reading', 'writing', 'listening'
  question_type TEXT NOT NULL, -- 'mcq', 'numeric', 'essay', 'speaking'
  difficulty TEXT NOT NULL, -- 'easy', 'medium', 'hard'
  
  question TEXT NOT NULL,
  options JSONB, -- For MCQ: ["A", "B", "C", "D"]
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  
  tags TEXT[] DEFAULT '{}',
  time_limit_seconds INT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_test_prep_questions_type ON public.test_prep_questions(test_type);
CREATE INDEX idx_test_prep_questions_section ON public.test_prep_questions(section);
ALTER TABLE public.test_prep_questions ENABLE ROW LEVEL SECURITY;

-- User test prep progress
CREATE TABLE public.user_test_prep_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.test_prep_questions(id) ON DELETE CASCADE,
  user_answer TEXT,
  is_correct BOOLEAN NOT NULL,
  time_taken_seconds INT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, question_id)
);

CREATE INDEX idx_user_test_prep_progress_user ON public.user_test_prep_progress(user_id);
ALTER TABLE public.user_test_prep_progress ENABLE ROW LEVEL SECURITY;

-- Random facts & knowledge base
CREATE TABLE public.knowledge_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL, -- 'science', 'history', 'technology', 'general', 'trivia'
  fact TEXT NOT NULL,
  source TEXT,
  tags TEXT[] DEFAULT '{}',
  difficulty TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_knowledge_facts_category ON public.knowledge_facts(category);
ALTER TABLE public.knowledge_facts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Daily words readable by all"
  ON public.daily_words FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own word progress"
  ON public.user_word_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Coding problems readable by all"
  ON public.coding_problems FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage coding problems"
  ON public.coding_problems FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'content.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'content.manage'));

CREATE POLICY "Users view own submissions"
  ON public.code_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create submissions"
  ON public.code_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own problem progress"
  ON public.user_problem_progress FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own problem progress"
  ON public.user_problem_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Test prep questions readable by all"
  ON public.test_prep_questions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own test prep progress"
  ON public.user_test_prep_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Facts readable by all"
  ON public.knowledge_facts FOR SELECT TO authenticated USING (true);

-- Triggers
CREATE TRIGGER trg_coding_problems_updated BEFORE UPDATE ON public.coding_problems
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to get today's word
CREATE OR REPLACE FUNCTION public.get_todays_word()
RETURNS SETOF public.daily_words LANGUAGE SQL STABLE AS $$
  SELECT * FROM public.daily_words WHERE date = CURRENT_DATE LIMIT 1;
$$;

-- Function to get today's coding problem
CREATE OR REPLACE FUNCTION public.get_todays_problem()
RETURNS SETOF public.coding_problems LANGUAGE SQL STABLE AS $$
  SELECT * FROM public.coding_problems WHERE is_daily = true AND daily_date = CURRENT_DATE LIMIT 1;
$$;

-- Function to get random fact
CREATE OR REPLACE FUNCTION public.get_random_fact(p_category TEXT DEFAULT NULL)
RETURNS SETOF public.knowledge_facts LANGUAGE SQL STABLE AS $$
  SELECT * FROM public.knowledge_facts
  WHERE (p_category IS NULL OR category = p_category)
  ORDER BY RANDOM()
  LIMIT 1;
$$;

-- Add permissions
INSERT INTO public.permissions (name, description, category) VALUES
  ('content.manage', 'Manage content (problems, questions, facts)', 'content'),
  ('content.moderate', 'Moderate user submissions', 'content');

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions WHERE name IN ('content.manage', 'content.moderate');

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'professor', id FROM public.permissions WHERE name = 'content.manage';

-- Seed daily words (sample data)
INSERT INTO public.daily_words (date, word, definition, pronunciation, example_sentence, synonyms, difficulty, category) VALUES
  (CURRENT_DATE, 'Ephemeral', 'Lasting for a very short time', 'ih-FEM-er-uhl', 'The beauty of cherry blossoms is ephemeral, lasting only a few weeks.', ARRAY['transient', 'fleeting', 'temporary'], 'medium', 'gre'),
  (CURRENT_DATE + 1, 'Ubiquitous', 'Present, appearing, or found everywhere', 'yoo-BIK-wi-tuhs', 'Smartphones have become ubiquitous in modern society.', ARRAY['omnipresent', 'pervasive', 'universal'], 'medium', 'gre'),
  (CURRENT_DATE + 2, 'Pragmatic', 'Dealing with things sensibly and realistically', 'prag-MAT-ik', 'She took a pragmatic approach to solving the problem.', ARRAY['practical', 'realistic', 'sensible'], 'easy', 'gmat');

-- Seed coding problems (sample)
INSERT INTO public.coding_problems (
  title, slug, description, difficulty, category, tags,
  input_format, output_format, constraints,
  examples, test_cases, starter_code,
  is_daily, daily_date
) VALUES (
  'Two Sum',
  'two-sum',
  'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  'easy',
  'array',
  ARRAY['array', 'hash-table'],
  'nums: List[int], target: int',
  'List[int]',
  '2 <= nums.length <= 10^4, -10^9 <= nums[i] <= 10^9, -10^9 <= target <= 10^9',
  '[{"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]."}]'::jsonb,
  '[{"input": "[2,7,11,15], 9", "expected_output": "[0,1]", "is_hidden": false}, {"input": "[3,2,4], 6", "expected_output": "[1,2]", "is_hidden": false}]'::jsonb,
  '{"python": "def twoSum(nums, target):\n    # Your code here\n    pass", "javascript": "function twoSum(nums, target) {\n    // Your code here\n}"}'::jsonb,
  true,
  CURRENT_DATE
);

-- Seed test prep questions (sample)
INSERT INTO public.test_prep_questions (test_type, section, question_type, difficulty, question, options, correct_answer, explanation) VALUES
  ('gmat', 'quant', 'mcq', 'medium', 
   'If x + y = 10 and x - y = 4, what is the value of x?',
   '["5", "6", "7", "8"]'::jsonb,
   '7',
   'Add the two equations: (x+y) + (x-y) = 10 + 4, which gives 2x = 14, so x = 7'),
  
  ('gre', 'verbal', 'mcq', 'hard',
   'The professor''s lecture was so _____ that even the most attentive students found it difficult to follow.',
   '["lucid", "convoluted", "succinct", "eloquent"]'::jsonb,
   'convoluted',
   'Convoluted means complex and difficult to follow, which fits the context'),
  
  ('cat', 'quant', 'numeric', 'medium',
   'A train travels 120 km in 2 hours. What is its speed in m/s?',
   NULL,
   '16.67',
   'Speed = 120 km / 2 hours = 60 km/h = 60 * 1000 / 3600 = 16.67 m/s');

-- Seed random facts
INSERT INTO public.knowledge_facts (category, fact, tags) VALUES
  ('science', 'Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs that was still edible.', ARRAY['food', 'history']),
  ('technology', 'The first computer bug was an actual bug - a moth that got trapped in a Harvard Mark II computer in 1947.', ARRAY['computing', 'history']),
  ('history', 'Oxford University is older than the Aztec Empire. Teaching started at Oxford in 1096, while the Aztec Empire began in 1428.', ARRAY['education', 'ancient']),
  ('general', 'Octopuses have three hearts and blue blood. Two hearts pump blood to the gills, while the third pumps it to the rest of the body.', ARRAY['animals', 'biology']),
  ('trivia', 'The shortest war in history lasted 38 minutes - between Britain and Zanzibar on August 27, 1896.', ARRAY['war', 'records']);
