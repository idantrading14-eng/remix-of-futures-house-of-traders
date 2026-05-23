CREATE POLICY "Mentors can update messages" ON public.messages FOR UPDATE USING (is_mentor(auth.uid()));

CREATE POLICY "Mentors can delete messages" ON public.messages FOR DELETE USING (is_mentor(auth.uid()));