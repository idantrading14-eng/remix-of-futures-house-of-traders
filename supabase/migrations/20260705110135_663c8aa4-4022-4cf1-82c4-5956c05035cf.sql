CREATE TABLE public.test_levels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.test_levels TO authenticated;
GRANT ALL ON public.test_levels TO service_role;

ALTER TABLE public.test_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view test levels"
  ON public.test_levels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Mentors can insert test levels"
  ON public.test_levels FOR INSERT
  TO authenticated
  WITH CHECK (public.is_mentor(auth.uid()));

CREATE POLICY "Mentors can update test levels"
  ON public.test_levels FOR UPDATE
  TO authenticated
  USING (public.is_mentor(auth.uid()))
  WITH CHECK (public.is_mentor(auth.uid()));

CREATE POLICY "Mentors can delete test levels"
  ON public.test_levels FOR DELETE
  TO authenticated
  USING (public.is_mentor(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_test_levels_updated_at
  BEFORE UPDATE ON public.test_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();