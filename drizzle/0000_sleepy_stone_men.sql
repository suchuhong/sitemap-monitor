CREATE TABLE `changes` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`url_id` text,
	`type` text NOT NULL,
	`detail` text,
	`occurred_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`url_id`) REFERENCES `urls`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`started_at` integer DEFAULT (unixepoch()),
	`finished_at` integer,
	`total_sitemaps` integer DEFAULT 0,
	`total_urls` integer DEFAULT 0,
	`added` integer DEFAULT 0,
	`removed` integer DEFAULT 0,
	`status` text DEFAULT 'running',
	`error` text,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sitemaps` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`url` text NOT NULL,
	`is_index` integer DEFAULT false,
	`last_etag` text,
	`last_modified` text,
	`last_status` integer,
	`discovered_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`root_url` text NOT NULL,
	`robots_url` text,
	`enabled` integer DEFAULT true,
	`created_at` integer DEFAULT (unixepoch()),
	`updated_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `urls` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`sitemap_id` text NOT NULL,
	`loc` text NOT NULL,
	`lastmod` text,
	`changefreq` text,
	`priority` text,
	`first_seen_at` integer DEFAULT (unixepoch()),
	`last_seen_at` integer DEFAULT (unixepoch()),
	`status` text DEFAULT 'active',
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sitemap_id`) REFERENCES `sitemaps`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch())
);
--> statement-breakpoint
CREATE TABLE `webhooks` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`target_url` text NOT NULL,
	`secret` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);