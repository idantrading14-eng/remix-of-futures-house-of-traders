
-- Create student_access table
CREATE TABLE public.student_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  has_courses_access BOOLEAN NOT NULL DEFAULT FALSE,
  has_mentorchat_access BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.student_access ENABLE ROW LEVEL SECURITY;

-- Students can read their own access
CREATE POLICY "Students read own access"
  ON public.student_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Mentors manage all access
CREATE POLICY "Mentors manage access"
  ON public.student_access
  FOR ALL
  TO authenticated
  USING (is_mentor(auth.uid()))
  WITH CHECK (is_mentor(auth.uid()));

-- Trigger to auto-create student_access on profile insert for students
CREATE OR REPLACE FUNCTION public.handle_new_student_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'student' THEN
    INSERT INTO public.student_access (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_add_access
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_student_access();

-- Enable realtime for student_access
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_access;

-- Backfill existing students
INSERT INTO public.student_access (user_id)
SELECT id FROM public.profiles WHERE role = 'student'
ON CONFLICT (user_id) DO NOTHING;
