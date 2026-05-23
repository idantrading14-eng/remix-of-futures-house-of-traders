
-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Update INSERT policy to also allow students to insert AI responses
DROP POLICY IF EXISTS "Insert messages" ON public.messages;
CREATE POLICY "Insert messages" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  (student_id = auth.uid() AND sender_role = 'student')
  OR (is_mentor(auth.uid()) AND sender_role = 'mentor')
  OR (student_id = auth.uid() AND sender_role = 'ai')
);
