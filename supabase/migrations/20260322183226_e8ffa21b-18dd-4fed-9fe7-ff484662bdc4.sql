
CREATE TABLE public.student_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  sent_by uuid NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  reminder_type text NOT NULL DEFAULT 'stuck'
);

ALTER TABLE public.student_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors manage reminders" ON public.student_reminders
  FOR ALL TO authenticated
  USING (public.is_mentor(auth.uid()))
  WITH CHECK (public.is_mentor(auth.uid()));
