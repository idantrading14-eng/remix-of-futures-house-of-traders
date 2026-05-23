
-- Create divisions table
CREATE TABLE public.divisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated can read
CREATE POLICY "Authenticated can read divisions" ON public.divisions
  FOR SELECT TO authenticated USING (true);

-- RLS: mentors manage
CREATE POLICY "Mentors manage divisions" ON public.divisions
  FOR ALL TO authenticated
  USING (is_mentor(auth.uid()))
  WITH CHECK (is_mentor(auth.uid()));

-- Add division_id to profiles
ALTER TABLE public.profiles ADD COLUMN division_id uuid REFERENCES public.divisions(id);

-- Seed initial divisions
INSERT INTO public.divisions (name) VALUES ('קורס מסחר'), ('קורס השקעות AI');
