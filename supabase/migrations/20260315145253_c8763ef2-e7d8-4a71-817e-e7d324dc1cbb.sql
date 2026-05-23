
CREATE TABLE public.lesson_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.lesson_bookmarks ENABLE ROW LEVEL SECURITY;

-- Students can read their own bookmarks
CREATE POLICY "Students read own bookmarks" ON public.lesson_bookmarks
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Students can insert their own bookmarks
CREATE POLICY "Students insert own bookmarks" ON public.lesson_bookmarks
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Students can delete their own bookmarks
CREATE POLICY "Students delete own bookmarks" ON public.lesson_bookmarks
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Mentors can manage all bookmarks
CREATE POLICY "Mentors manage bookmarks" ON public.lesson_bookmarks
FOR ALL TO authenticated
USING (is_mentor(auth.uid()))
WITH CHECK (is_mentor(auth.uid()));
