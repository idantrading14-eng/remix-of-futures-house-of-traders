
-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Create onboarding_answers table
CREATE TABLE public.onboarding_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  email text,
  time_vs_money text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;

-- Students can insert their own answers
CREATE POLICY "Students insert own onboarding" ON public.onboarding_answers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Students can read own answers
CREATE POLICY "Students read own onboarding" ON public.onboarding_answers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Mentors can read all answers
CREATE POLICY "Mentors read all onboarding" ON public.onboarding_answers
  FOR SELECT TO authenticated
  USING (is_mentor(auth.uid()));
