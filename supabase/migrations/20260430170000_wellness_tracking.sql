-- Create wellness tracking table
CREATE TABLE IF NOT EXISTS public.wellness_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'gym', 'water', 'diet', 'sleep'
    label TEXT NOT NULL,
    goal TEXT,
    completed BOOLEAN DEFAULT false,
    value NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    date DATE DEFAULT CURRENT_DATE
);

-- Enable RLS
ALTER TABLE public.wellness_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own wellness logs" 
ON public.wellness_logs FOR ALL 
USING (auth.uid() = user_id);

-- Add sample data for the user if they don't have any
-- This helps the 'WOW' factor on first load
INSERT INTO public.wellness_logs (user_id, type, label, goal, completed)
SELECT auth.uid(), 'gym', 'Daily Workout', '1 hour', false
FROM auth.users
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM wellness_logs WHERE user_id = auth.uid());

SELECT '✅ Wellness tracking table and policies ready' as status;
