
CREATE TABLE public.student_lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.student_lesson_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own notes"
  ON public.student_lesson_notes FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Mentors read all notes"
  ON public.student_lesson_notes FOR SELECT
  TO authenticated
  USING (public.is_mentor(auth.uid()));
