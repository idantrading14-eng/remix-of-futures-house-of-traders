
-- Allow mentors to delete profiles (for client deletion)
CREATE POLICY "Mentors can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (is_mentor(auth.uid()));
