ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS maintenance_ends_at timestamptz;