
CREATE POLICY "Students read own client details"
ON public.client_details FOR SELECT
TO authenticated
USING (student_id = auth.uid());
