
-- Add new columns to client_details
ALTER TABLE public.client_details ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.client_details ADD COLUMN IF NOT EXISTS plan_id uuid;
ALTER TABLE public.client_details ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Create plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366F1',
  total_stages integer NOT NULL DEFAULT 8,
  stage_names jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read plans" ON public.plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Mentors manage plans" ON public.plans FOR ALL TO authenticated USING (is_mentor(auth.uid())) WITH CHECK (is_mentor(auth.uid()));

-- Add FK from client_details to plans
ALTER TABLE public.client_details ADD CONSTRAINT client_details_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'paid',
  date timestamptz NOT NULL DEFAULT now(),
  method text DEFAULT 'cash',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors manage payments" ON public.payments FOR ALL TO authenticated USING (is_mentor(auth.uid())) WITH CHECK (is_mentor(auth.uid()));

-- Create activity_log table
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors manage activity log" ON public.activity_log FOR ALL TO authenticated USING (is_mentor(auth.uid())) WITH CHECK (is_mentor(auth.uid()));

-- Enable realtime for activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;

-- Insert default plans
INSERT INTO public.plans (name, color, total_stages, stage_names) VALUES
  ('מסלול בסיסי', '#6366F1', 6, '["היכרות", "אבחון", "תכנון", "ביצוע", "הערכה", "סיום"]'::jsonb),
  ('מסלול מתקדם', '#10B981', 8, '["פנייה ראשונית", "היכרות", "אבחון", "תכנון", "בניית תוכן", "ביצוע", "הערכה", "סיום"]'::jsonb),
  ('מסלול פרימיום', '#F59E0B', 10, '["פנייה ראשונית", "היכרות", "אבחון מעמיק", "תכנון אסטרטגי", "בניית תוכן", "ביצוע שלב א", "ביצוע שלב ב", "מעקב", "הערכה", "סטטוס בוגר"]'::jsonb);
