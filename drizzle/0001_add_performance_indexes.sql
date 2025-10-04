-- Migration: Add performance indexes
-- Created: 2025-10-04
-- Description: Add indexes to optimize query performance

-- Changes table indexes
CREATE INDEX IF NOT EXISTS "idx_changes_site_occurred" ON "sitemap_monitor_changes" ("site_id", "occurred_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_changes_type_occurred" ON "sitemap_monitor_changes" ("type", "occurred_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_changes_site_type_occurred" ON "sitemap_monitor_changes" ("site_id", "type", "occurred_at" DESC);
--> statement-breakpoint

-- Scans table indexes
CREATE INDEX IF NOT EXISTS "idx_scans_site_started" ON "sitemap_monitor_scans" ("site_id", "started_at" DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scans_status" ON "sitemap_monitor_scans" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scans_site_started_finished" ON "sitemap_monitor_scans" ("site_id", "started_at" DESC, "finished_at");
--> statement-breakpoint

-- Sites table indexes
CREATE INDEX IF NOT EXISTS "idx_sites_owner" ON "sitemap_monitor_sites" ("owner_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sites_enabled" ON "sitemap_monitor_sites" ("enabled") WHERE "enabled" = true;
--> statement-breakpoint

-- URLs table indexes
CREATE INDEX IF NOT EXISTS "idx_urls_site" ON "sitemap_monitor_urls" ("site_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_urls_sitemap" ON "sitemap_monitor_urls" ("sitemap_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_urls_status" ON "sitemap_monitor_urls" ("status");
--> statement-breakpoint

-- Sitemaps table indexes
CREATE INDEX IF NOT EXISTS "idx_sitemaps_site" ON "sitemap_monitor_sitemaps" ("site_id");
--> statement-breakpoint

-- Notification Channels table indexes
CREATE INDEX IF NOT EXISTS "idx_notification_channels_site" ON "sitemap_monitor_notification_channels" ("site_id");
--> statement-breakpoint

-- Webhooks table indexes
CREATE INDEX IF NOT EXISTS "idx_webhooks_site" ON "sitemap_monitor_webhooks" ("site_id");
