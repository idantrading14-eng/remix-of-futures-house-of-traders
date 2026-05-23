
CREATE TABLE public.student_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stage integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE public.student_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors manage student stages"
ON public.student_stages
FOR ALL
TO authenticated
USING (is_mentor(auth.uid()))
WITH CHECK (is_mentor(auth.uid()));

CREATE POLICY "Students can read own stage"
ON public.student_stages
FOR SELECT
TO authenticated
USING (student_id = auth.uid());
