
-- Create storage buckets for course content
INSERT INTO storage.buckets (id, name, public) VALUES ('course-videos', 'course-videos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('course-thumbnails', 'course-thumbnails', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for course-videos
CREATE POLICY "Authenticated users can upload course videos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-videos');
CREATE POLICY "Anyone can view course videos" ON storage.objects FOR SELECT USING (bucket_id = 'course-videos');
CREATE POLICY "Mentors can delete course videos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'course-videos' AND public.is_mentor(auth.uid()));

-- Storage policies for course-thumbnails
CREATE POLICY "Authenticated users can upload course thumbnails" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-thumbnails');
CREATE POLICY "Anyone can view course thumbnails" ON storage.objects FOR SELECT USING (bucket_id = 'course-thumbnails');
CREATE POLICY "Mentors can delete course thumbnails" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'course-thumbnails' AND public.is_mentor(auth.uid()));
