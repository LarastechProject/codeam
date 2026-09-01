CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`submissionId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`readAt` timestamp,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `notifications_submissionId_unique` UNIQUE(`submissionId`)
);
--> statement-breakpoint
ALTER TABLE `submissions` ADD `idempotencyKey` varchar(80) NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_idempotencyKey_unique` UNIQUE(`idempotencyKey`);--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_submissionId_submissions_id_fk` FOREIGN KEY (`submissionId`) REFERENCES `submissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `notifications_teacher_idx` ON `notifications` (`teacherId`);