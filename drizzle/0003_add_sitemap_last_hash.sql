-- 0003: Add last_hash to sitemaps for content hash short-circuit
ALTER TABLE public.sitemap_monitor_sitemaps
  ADD COLUMN IF NOT EXISTS last_hash text;
