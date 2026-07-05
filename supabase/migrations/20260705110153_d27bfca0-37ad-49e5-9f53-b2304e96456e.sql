CREATE POLICY "Authenticated can view test images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'test-images');

CREATE POLICY "Mentors can upload test images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'test-images' AND public.is_mentor(auth.uid()));

CREATE POLICY "Mentors can update test images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'test-images' AND public.is_mentor(auth.uid()));

CREATE POLICY "Mentors can delete test images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'test-images' AND public.is_mentor(auth.uid()));