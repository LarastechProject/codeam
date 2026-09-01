import { index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "student", "teacher", "admin"]).default("student").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const classrooms = mysqlTable("classrooms", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 160 }).notNull(),
  joinCode: varchar("joinCode", { length: 12 }).notNull().unique(),
  level: mysqlEnum("level", ["primary-1-2", "primary-3-4", "primary-5-6", "jss1-plus"]).default("primary-5-6").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ teacherIdx: index("classrooms_teacher_idx").on(table.teacherId) }));

export const classMemberships = mysqlTable("classMemberships", {
  id: int("id").autoincrement().primaryKey(),
  classroomId: int("classroomId").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  studentId: int("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
}, (table) => ({
  classroomStudentUnique: uniqueIndex("class_membership_class_student_unique").on(table.classroomId, table.studentId),
  studentIdx: index("class_membership_student_idx").on(table.studentId),
}));

export const assignments = mysqlTable("assignments", {
  id: int("id").autoincrement().primaryKey(),
  classroomId: int("classroomId").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  teacherId: int("teacherId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  instructions: text("instructions").notNull(),
  dueAt: timestamp("dueAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  classroomIdx: index("assignments_classroom_idx").on(table.classroomId),
  teacherIdx: index("assignments_teacher_idx").on(table.teacherId),
}));

export const projects = mysqlTable("projects", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
  classroomId: int("classroomId").notNull().references(() => classrooms.id, { onDelete: "cascade" }),
  assignmentId: int("assignmentId").references(() => assignments.id, { onDelete: "set null" }),
  name: varchar("name", { length: 180 }).notNull(),
  html: text("html").notNull(),
  css: text("css").notNull(),
  javascript: text("javascript").notNull(),
  draftUpdatedAt: timestamp("draftUpdatedAt").defaultNow().notNull(),
  lastRunStatus: mysqlEnum("lastRunStatus", ["not-run", "success", "error"]).default("not-run").notNull(),
  lastRunErrorCount: int("lastRunErrorCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  studentIdx: index("projects_student_idx").on(table.studentId),
  assignmentIdx: index("projects_assignment_idx").on(table.assignmentId),
  classroomIdx: index("projects_classroom_idx").on(table.classroomId),
}));

/** Append-only by application contract: no update or delete procedure is exposed. */
export const submissions = mysqlTable("submissions", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignmentId").notNull().references(() => assignments.id, { onDelete: "cascade" }),
  projectId: int("projectId").notNull().references(() => projects.id, { onDelete: "restrict" }),
  studentId: int("studentId").notNull().references(() => users.id, { onDelete: "cascade" }),
  snapshotName: varchar("snapshotName", { length: 180 }).notNull(),
  snapshotHtml: text("snapshotHtml").notNull(),
  snapshotCss: text("snapshotCss").notNull(),
  snapshotJavascript: text("snapshotJavascript").notNull(),
  runStatus: mysqlEnum("runStatus", ["not-run", "success", "error"]).notNull(),
  runErrorCount: int("runErrorCount").default(0).notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 80 }).notNull().unique(),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
}, (table) => ({
  assignmentIdx: index("submissions_assignment_idx").on(table.assignmentId),
  studentIdx: index("submissions_student_idx").on(table.studentId),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Classroom = typeof classrooms.$inferSelect;
export type Assignment = typeof assignments.$inferSelect;
export type Project = typeof projects.$inferSelect;
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  teacherId: int("teacherId").notNull().references(() => users.id, { onDelete: "cascade" }),
  submissionId: int("submissionId").notNull().unique().references(() => submissions.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
}, (table) => ({ teacherIdx: index("notifications_teacher_idx").on(table.teacherId) }));

export type Submission = typeof submissions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
