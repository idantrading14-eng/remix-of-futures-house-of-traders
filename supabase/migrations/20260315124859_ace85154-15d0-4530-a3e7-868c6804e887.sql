
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS video_source_type text NOT NULL DEFAULT 'none';
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS video_file_url text;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS embed_code text;
