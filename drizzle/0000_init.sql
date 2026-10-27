CREATE TABLE `date_options` (
	`id` text PRIMARY KEY NOT NULL,
	`party_id` text NOT NULL,
	`author_id` text NOT NULL,
	`date` text NOT NULL,
	`time` text DEFAULT '' NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`eliminated_in_round` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `date_options_party_idx` ON `date_options` (`party_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `date_options_unique` ON `date_options` (`party_id`,`date`,`time`);--> statement-breakpoint
CREATE TABLE `ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`party_id` text NOT NULL,
	`author_id` text NOT NULL,
	`name` text NOT NULL,
	`link` text,
	`images` text DEFAULT '[]' NOT NULL,
	`price_level` integer,
	`cost_per_person` real,
	`cost_notes` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`eliminated_in_round` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ideas_party_idx` ON `ideas` (`party_id`);--> statement-breakpoint
CREATE TABLE `parties` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`organizer_id` text NOT NULL,
	`phase` text DEFAULT 'ideas' NOT NULL,
	`phase_deadline` integer,
	`idea_round` integer DEFAULT 1 NOT NULL,
	`date_round` integer DEFAULT 1 NOT NULL,
	`winning_idea_id` text,
	`winning_date_id` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organizer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`id` text PRIMARY KEY NOT NULL,
	`uploader_id` text NOT NULL,
	`mime` text NOT NULL,
	`data` blob NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`animal` text NOT NULL,
	`passcode_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_name_unique` ON `users` (lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX `users_animal_unique` ON `users` (`animal`);--> statement-breakpoint
CREATE TABLE `votes` (
	`id` text PRIMARY KEY NOT NULL,
	`party_id` text NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`option_id` text NOT NULL,
	`round` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`party_id`) REFERENCES `parties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `votes_unique` ON `votes` (`user_id`,`kind`,`option_id`,`round`);--> statement-breakpoint
CREATE INDEX `votes_party_idx` ON `votes` (`party_id`,`kind`,`round`);