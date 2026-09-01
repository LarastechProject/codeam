CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classroomId` int NOT NULL,
	`teacherId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`instructions` text NOT NULL,
	`dueAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `classMemberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`classroomId` int NOT NULL,
	`studentId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `classMemberships_id` PRIMARY KEY(`id`),
	CONSTRAINT `class_membership_class_student_unique` UNIQUE(`classroomId`,`studentId`)
);
--> statement-breakpoint
CREATE TABLE `classrooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teacherId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`joinCode` varchar(12) NOT NULL,
	`level` enum('primary-1-2','primary-3-4','primary-5-6','jss1-plus') NOT NULL DEFAULT 'primary-5-6',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `classrooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `classrooms_joinCode_unique` UNIQUE(`joinCode`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`classroomId` int NOT NULL,
	`assignmentId` int,
	`name` varchar(180) NOT NULL,
	`html` text NOT NULL,
	`css` text NOT NULL,
	`javascript` text NOT NULL,
	`draftUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`lastRunStatus` enum('not-run','success','error') NOT NULL DEFAULT 'not-run',
	`lastRunErrorCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assignmentId` int NOT NULL,
	`projectId` int NOT NULL,
	`studentId` int NOT NULL,
	`snapshotName` varchar(180) NOT NULL,
	`snapshotHtml` text NOT NULL,
	`snapshotCss` text NOT NULL,
	`snapshotJavascript` text NOT NULL,
	`runStatus` enum('not-run','success','error') NOT NULL,
	`runErrorCount` int NOT NULL DEFAULT 0,
	`submittedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_classroomId_classrooms_id_fk` FOREIGN KEY (`classroomId`) REFERENCES `classrooms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assignments` ADD CONSTRAINT `assignments_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classMemberships` ADD CONSTRAINT `classMemberships_classroomId_classrooms_id_fk` FOREIGN KEY (`classroomId`) REFERENCES `classrooms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classMemberships` ADD CONSTRAINT `classMemberships_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `classrooms` ADD CONSTRAINT `classrooms_teacherId_users_id_fk` FOREIGN KEY (`teacherId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_classroomId_classrooms_id_fk` FOREIGN KEY (`classroomId`) REFERENCES `classrooms`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_assignmentId_assignments_id_fk` FOREIGN KEY (`assignmentId`) REFERENCES `assignments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_assignmentId_assignments_id_fk` FOREIGN KEY (`assignmentId`) REFERENCES `assignments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_studentId_users_id_fk` FOREIGN KEY (`studentId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assignments_classroom_idx` ON `assignments` (`classroomId`);--> statement-breakpoint
CREATE INDEX `assignments_teacher_idx` ON `assignments` (`teacherId`);--> statement-breakpoint
CREATE INDEX `class_membership_student_idx` ON `classMemberships` (`studentId`);--> statement-breakpoint
CREATE INDEX `classrooms_teacher_idx` ON `classrooms` (`teacherId`);--> statement-breakpoint
CREATE INDEX `projects_student_idx` ON `projects` (`studentId`);--> statement-breakpoint
CREATE INDEX `projects_assignment_idx` ON `projects` (`assignmentId`);--> statement-breakpoint
CREATE INDEX `projects_classroom_idx` ON `projects` (`classroomId`);--> statement-breakpoint
CREATE INDEX `submissions_assignment_idx` ON `submissions` (`assignmentId`);--> statement-breakpoint
CREATE INDEX `submissions_student_idx` ON `submissions` (`studentId`);