
DROP TABLE IF EXISTS public.activity_log CASCADE;
DROP TABLE IF EXISTS public.ai_suggestions CASCADE;
DROP TABLE IF EXISTS public.client_details CASCADE;
DROP TABLE IF EXISTS public.client_notes CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.onboarding_answers CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.student_reminders CASCADE;
DROP TABLE IF EXISTS public.student_stages CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.divisions CASCADE;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS division_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarding_completed;

ALTER TABLE public.courses DROP COLUMN IF EXISTS external_id;

ALTER TABLE public.student_access DROP COLUMN IF EXISTS has_mentorchat_access;

DROP FUNCTION IF EXISTS public.handle_new_student_access() CASCADE;
