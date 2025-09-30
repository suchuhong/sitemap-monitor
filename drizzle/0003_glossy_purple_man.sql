CREATE TABLE `notification_channels` (
	`id` text PRIMARY KEY NOT NULL,
	`site_id` text NOT NULL,
	`type` text NOT NULL,
	`target` text NOT NULL,
	`secret` text,
	`created_at` integer DEFAULT (unixepoch()),
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `changes` ADD `scan_id` text REFERENCES scans(id);--> statement-breakpoint
ALTER TABLE `scans` ADD `updated` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `sites` ADD `scan_priority` integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE `sites` ADD `scan_interval_minutes` integer DEFAULT 1440;--> statement-breakpoint
ALTER TABLE `sites` ADD `last_scan_at` integer;--> statement-breakpoint
/*
 SQLite does not support "Creating foreign key on existing column" out of the box, we do not generate automatic migration for that, so it has to be done manually
 Please refer to: https://www.techonthenet.com/sqlite/tables/alter_table.php
                  https://www.sqlite.org/lang_altertable.html

 Due to that we don't generate migration automatically and it has to be done manually
*/