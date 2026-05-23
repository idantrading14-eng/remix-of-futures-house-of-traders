
-- Drop the old select policy
DROP POLICY IF EXISTS "Authenticated can read published courses" ON public.courses;

-- Create a new policy that also allows enrolled students to see their courses
CREATE POLICY "Authenticated can read courses" ON public.courses
FOR SELECT TO authenticated
USING (
  visibility = 'public'
  OR is_mentor(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.enrollments
    WHERE enrollments.course_id = courses.id
    AND enrollments.client_id = auth.uid()
  )
);
