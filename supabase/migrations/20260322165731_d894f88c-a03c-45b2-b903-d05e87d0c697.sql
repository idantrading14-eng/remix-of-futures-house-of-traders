
-- Drop the old INSERT policy and replace with one that checks chat access
DROP POLICY IF EXISTS "Insert messages" ON public.messages;

CREATE POLICY "Insert messages"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    (student_id = auth.uid()) 
    AND (sender_role = 'student') 
    AND EXISTS (
      SELECT 1 FROM public.student_access 
      WHERE user_id = auth.uid() 
      AND has_mentorchat_access = true
    )
  )
  OR (is_mentor(auth.uid()) AND (sender_role = 'mentor'))
  OR ((student_id = auth.uid()) AND (sender_role = 'ai'))
);
