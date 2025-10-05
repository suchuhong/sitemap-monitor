-- 0002: Optimize URL uniqueness and indexes for performance
-- Ensure unique constraints and helpful indexes for fast upsert/diff

-- UNIQUE constraint for urls(sitemap_id, loc)
DO $$ BEGIN
  ALTER TABLE public.sitemap_monitor_urls
  ADD CONSTRAINT uq_urls_sitemap_loc UNIQUE (sitemap_id, loc);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional composite index (unique already implies index, but keep for clarity)
CREATE INDEX IF NOT EXISTS idx_urls_sitemap_loc
  ON public.sitemap_monitor_urls (sitemap_id, loc);

-- UNIQUE constraint for sitemaps(site_id, url)
DO $$ BEGIN
  ALTER TABLE public.sitemap_monitor_sitemaps
  ADD CONSTRAINT uq_sitemaps_site_url UNIQUE (site_id, url);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Make scans.status default to 'queued' (stability)
ALTER TABLE public.sitemap_monitor_scans
  ALTER COLUMN status SET DEFAULT 'queued';
