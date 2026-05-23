
-- Courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail_url TEXT,
  type TEXT NOT NULL DEFAULT 'basic',
  price NUMERIC DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'draft',
  enrollment_type TEXT NOT NULL DEFAULT 'open',
  certificate_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors manage courses" ON public.courses FOR ALL TO authenticated
  USING (is_mentor(auth.uid())) WITH CHECK (is_mentor(auth.uid()));

CREATE POLICY "Authenticated can read published courses" ON public.courses FOR SELECT TO authenticated
  USING (visibility = 'public' OR is_mentor(auth.uid()));

-- Modules table
CREATE TABLE public.modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail_url TEXT,
  access_level TEXT NOT NULL DEFAULT 'open',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors manage modules" ON public.modules FOR ALL TO authenticated
  USING (is_mentor(auth.uid())) WITH CHECK (is_mentor(auth.uid()));

CREATE POLICY "Authenticated can read modules" ON public.modules FOR SELECT TO authenticated
  USING (true);

-- Lessons table
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'video',
  video_url TEXT,
  text_content TEXT,
  file_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  access_level TEXT NOT NULL DEFAULT 'open',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors manage lessons" ON public.lessons FOR ALL TO authenticated
  USING (is_mentor(auth.uid())) WITH CHECK (is_mentor(auth.uid()));

CREATE POLICY "Authenticated can read lessons" ON public.lessons FOR SELECT TO authenticated
  USING (true);

-- Enrollments table
CREATE TABLE public.enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active',
  UNIQUE(client_id, course_id)
);

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors manage enrollments" ON public.enrollments FOR ALL TO authenticated
  USING (is_mentor(auth.uid())) WITH CHECK (is_mentor(auth.uid()));

CREATE POLICY "Students read own enrollments" ON public.enrollments FOR SELECT TO authenticated
  USING (client_id = auth.uid());

-- Lesson progress table
CREATE TABLE public.lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(client_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors manage lesson progress" ON public.lesson_progress FOR ALL TO authenticated
  USING (is_mentor(auth.uid())) WITH CHECK (is_mentor(auth.uid()));

CREATE POLICY "Students manage own progress" ON public.lesson_progress FOR ALL TO authenticated
  USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
