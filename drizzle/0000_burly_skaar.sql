CREATE TABLE IF NOT EXISTS "sitemap_monitor_changes" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"scan_id" text,
	"url_id" text,
	"type" text NOT NULL,
	"detail" text,
	"source" text,
	"assignee" text,
	"status" text DEFAULT 'open',
	"occurred_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sitemap_monitor_notification_channels" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"type" text NOT NULL,
	"target" text NOT NULL,
	"secret" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sitemap_monitor_scans" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp,
	"total_sitemaps" integer DEFAULT 0,
	"total_urls" integer DEFAULT 0,
	"added" integer DEFAULT 0,
	"removed" integer DEFAULT 0,
	"updated" integer DEFAULT 0,
	"status" text DEFAULT 'running',
	"error" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sitemap_monitor_site_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"color" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sitemap_monitor_sitemaps" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"url" text NOT NULL,
	"is_index" boolean DEFAULT false,
	"last_etag" text,
	"last_modified" text,
	"last_status" integer,
	"discovered_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sitemap_monitor_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"root_url" text NOT NULL,
	"robots_url" text,
	"enabled" boolean DEFAULT true,
	"tags" text,
	"group_id" text,
	"scan_priority" integer DEFAULT 1,
	"scan_interval_minutes" integer DEFAULT 1440,
	"last_scan_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sitemap_monitor_urls" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"sitemap_id" text NOT NULL,
	"loc" text NOT NULL,
	"lastmod" text,
	"changefreq" text,
	"priority" text,
	"first_seen_at" timestamp DEFAULT now(),
	"last_seen_at" timestamp DEFAULT now(),
	"status" text DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sitemap_monitor_users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "sitemap_monitor_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sitemap_monitor_webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"target_url" text NOT NULL,
	"secret" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sitemap_monitor_changes" ADD CONSTRAINT "sitemap_monitor_changes_site_id_sitemap_monitor_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sitemap_monitor_sites"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sitemap_monitor_changes" ADD CONSTRAINT "sitemap_monitor_changes_scan_id_sitemap_monitor_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."sitemap_monitor_scans"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sitemap_monitor_changes" ADD CONSTRAINT "sitemap_monitor_changes_url_id_sitemap_monitor_urls_id_fk" FOREIGN KEY ("url_id") REFERENCES "public"."sitemap_monitor_urls"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sitemap_monitor_notification_channels" ADD CONSTRAINT "sitemap_monitor_notification_channels_site_id_sitemap_monitor_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sitemap_monitor_sites"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sitemap_monitor_scans" ADD CONSTRAINT "sitemap_monitor_scans_site_id_sitemap_monitor_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sitemap_monitor_sites"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sitemap_monitor_site_groups" ADD CONSTRAINT "sitemap_monitor_site_groups_owner_id_sitemap_monitor_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."sitemap_monitor_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sitemap_monitor_sitemaps" ADD CONSTRAINT "sitemap_monitor_sitemaps_site_id_sitemap_monitor_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sitemap_monitor_sites"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sitemap_monitor_sites" ADD CONSTRAINT "sitemap_monitor_sites_owner_id_sitemap_monitor_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."sitemap_monitor_users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sitemap_monitor_sites" ADD CONSTRAINT "sitemap_monitor_sites_group_id_sitemap_monitor_site_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."sitemap_monitor_site_groups"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sitemap_monitor_urls" ADD CONSTRAINT "sitemap_monitor_urls_site_id_sitemap_monitor_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sitemap_monitor_sites"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sitemap_monitor_urls" ADD CONSTRAINT "sitemap_monitor_urls_sitemap_id_sitemap_monitor_sitemaps_id_fk" FOREIGN KEY ("sitemap_id") REFERENCES "public"."sitemap_monitor_sitemaps"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sitemap_monitor_webhooks" ADD CONSTRAINT "sitemap_monitor_webhooks_site_id_sitemap_monitor_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sitemap_monitor_sites"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
