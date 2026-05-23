DO $$
DECLARE
  new_user_id uuid;
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'liorb2003@gmail.com',
    crypt('0544208108', gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb, ''
  ) RETURNING id INTO new_user_id;

  INSERT INTO public.profiles (id, display_name, role, approved)
  VALUES (new_user_id, 'Lior B', 'student', true);

  INSERT INTO public.student_stages (student_id, stage)
  VALUES (new_user_id, 0);
END $$;