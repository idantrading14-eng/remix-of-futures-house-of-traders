
CREATE TABLE public.client_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text,
  amount_paid numeric DEFAULT 0,
  sessions_total integer DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

ALTER TABLE public.client_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors manage client details"
ON public.client_details
FOR ALL
TO authenticated
USING (is_mentor(auth.uid()))
WITH CHECK (is_mentor(auth.uid()));
