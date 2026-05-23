
-- Add new columns to lessons table for video management
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS video_source_type text NOT NULL DEFAULT 'url';
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS embed_code text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Rename file_url to video_file_url for clarity (keep file_url as alias)
-- Actually, let's just add video_file_url and keep file_url
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS video_file_url text;
