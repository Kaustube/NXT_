-- =========================
-- GAME MATCH HISTORY
-- =========================
CREATE TABLE public.game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game TEXT NOT NULL,           -- wordle, tictactoe, quiz, memory
  result TEXT NOT NULL,         -- won, lost, draw
  score INT,                    -- quiz score, memory moves, wordle attempts
  metadata JSONB DEFAULT '{}',  -- extra data like word guessed, opponent etc
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_game_history_user ON public.game_history(user_id, played_at DESC);
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own history" ON public.game_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own history" ON public.game_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all history" ON public.game_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
