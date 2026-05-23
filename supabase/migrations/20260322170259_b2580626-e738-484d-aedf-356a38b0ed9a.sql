
-- FIX 1: CRITICAL - Prevent students from changing their own role/approved status
-- Replace the permissive "Users can update own profile" with a restricted version
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile safely"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  AND approved = (SELECT approved FROM public.profiles WHERE id = auth.uid())
);

-- FIX 2: Prevent students from inserting messages with 'ai' sender_role
DROP POLICY IF EXISTS "Insert messages" ON public.messages;

CREATE POLICY "Insert messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    student_id = auth.uid()
    AND sender_role = 'student'
    AND EXISTS (
      SELECT 1 FROM public.student_access
      WHERE user_id = auth.uid()
      AND has_mentorchat_access = true
    )
  )
  OR (is_mentor(auth.uid()) AND sender_role = 'mentor')
  OR (is_mentor(auth.uid()) AND sender_role = 'ai')
);
