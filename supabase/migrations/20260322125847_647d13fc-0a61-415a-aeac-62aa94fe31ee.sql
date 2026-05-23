
CREATE OR REPLACE FUNCTION public.handle_new_student_access()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role IN ('student', 'manual_client') THEN
    INSERT INTO public.student_access (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

INSERT INTO public.student_access (user_id)
SELECT p.id FROM public.profiles p
WHERE p.role = 'manual_client'
AND NOT EXISTS (SELECT 1 FROM public.student_access sa WHERE sa.user_id = p.id);
