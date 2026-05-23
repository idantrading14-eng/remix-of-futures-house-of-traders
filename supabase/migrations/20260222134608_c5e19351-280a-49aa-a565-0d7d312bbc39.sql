
-- Fix infinite recursion: create security definer function
CREATE OR REPLACE FUNCTION public.is_mentor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'mentor'
  )
$$;

-- Drop recursive policies
DROP POLICY IF EXISTS "Mentors can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Students read own messages" ON public.messages;
DROP POLICY IF EXISTS "Students insert own messages" ON public.messages;
DROP POLICY IF EXISTS "Mentors manage suggestions" ON public.ai_suggestions;

-- Recreate with security definer function
CREATE POLICY "Mentors can update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_mentor(auth.uid()));

CREATE POLICY "Read own or mentor reads all messages" ON public.messages
  FOR SELECT TO authenticated USING (
    student_id = auth.uid() OR public.is_mentor(auth.uid())
  );

CREATE POLICY "Insert messages" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    (student_id = auth.uid() AND sender_role = 'student') OR
    (public.is_mentor(auth.uid()) AND sender_role = 'mentor')
  );

CREATE POLICY "Mentors manage suggestions" ON public.ai_suggestions
  FOR ALL TO authenticated USING (public.is_mentor(auth.uid()));
