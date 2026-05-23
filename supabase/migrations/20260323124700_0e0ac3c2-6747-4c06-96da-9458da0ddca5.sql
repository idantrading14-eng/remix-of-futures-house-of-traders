
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS pdf_url text,
  ADD COLUMN IF NOT EXISTS html_content text;
