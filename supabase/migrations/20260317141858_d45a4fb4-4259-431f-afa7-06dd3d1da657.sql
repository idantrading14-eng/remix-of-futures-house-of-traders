
DROP POLICY IF EXISTS "Authenticated can read courses" ON public.courses;
CREATE POLICY "Authenticated can read courses"
ON public.courses FOR SELECT
TO authenticated
USING (true);
