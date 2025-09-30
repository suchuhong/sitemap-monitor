CREATE TABLE `observability_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`scope` text NOT NULL,
	`level` text DEFAULT 'info',
	`message` text,
	`request_id` text,
	`payload` text,
	`created_at` integer DEFAULT (unixepoch())
);
