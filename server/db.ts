import { and, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  assignments,
  classMemberships,
  classrooms,
  InsertUser,
  notifications,
  projects,
  submissions,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function updateUserProfile(id: number, values: Pick<InsertUser, "name" | "email">) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ name: values.name, email: values.email }).where(eq(users.id, id));
  return db.select().from(users).where(eq(users.id, id)).limit(1).then((r) => r[0]);
}

export async function createClassroom(input: typeof classrooms.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(classrooms).values(input);
  return db.select().from(classrooms).where(eq(classrooms.joinCode, input.joinCode)).limit(1).then((r) => r[0]);
}
export async function getTeacherClassrooms(teacherId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(classrooms).where(eq(classrooms.teacherId, teacherId)).orderBy(desc(classrooms.createdAt));
}
export async function getClassroomById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  return db.select().from(classrooms).where(eq(classrooms.id, id)).limit(1).then((r) => r[0]);
}
export async function getClassroomByJoinCode(joinCode: string) {
  const db = await getDb(); if (!db) return undefined;
  return db.select().from(classrooms).where(eq(classrooms.joinCode, joinCode)).limit(1).then((r) => r[0]);
}
export async function updateClassroom(id: number, teacherId: number, values: Partial<typeof classrooms.$inferInsert>) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(classrooms).set(values).where(and(eq(classrooms.id, id), eq(classrooms.teacherId, teacherId)));
  return getClassroomById(id);
}

export async function getMembership(classroomId: number, studentId: number) {
  const db = await getDb(); if (!db) return undefined;
  return db.select().from(classMemberships).where(and(eq(classMemberships.classroomId, classroomId), eq(classMemberships.studentId, studentId))).limit(1).then((r) => r[0]);
}
export async function addMembership(classroomId: number, studentId: number) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(classMemberships).values({ classroomId, studentId }).onDuplicateKeyUpdate({ set: { classroomId } });
  return getMembership(classroomId, studentId);
}
export async function getStudentMemberships(studentId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ membership: classMemberships, classroom: classrooms })
    .from(classMemberships).innerJoin(classrooms, eq(classMemberships.classroomId, classrooms.id))
    .where(eq(classMemberships.studentId, studentId)).orderBy(desc(classMemberships.joinedAt));
}
export async function getClassroomMemberships(classroomId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({ membership: classMemberships, student: users })
    .from(classMemberships).innerJoin(users, eq(classMemberships.studentId, users.id))
    .where(eq(classMemberships.classroomId, classroomId)).orderBy(users.name);
}

export async function createAssignment(input: typeof assignments.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(assignments).values(input);
  return db.select().from(assignments).where(and(eq(assignments.classroomId, input.classroomId), eq(assignments.title, input.title))).orderBy(desc(assignments.id)).limit(1).then((r) => r[0]);
}
export async function updateAssignment(id: number, teacherId: number, values: Partial<typeof assignments.$inferInsert>) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(assignments).set(values).where(and(eq(assignments.id, id), eq(assignments.teacherId, teacherId)));
  return getAssignmentById(id);
}

export async function getTeacherAssignments(teacherId: number, classroomId?: number) {
  const db = await getDb(); if (!db) return [];
  const condition = classroomId ? and(eq(assignments.teacherId, teacherId), eq(assignments.classroomId, classroomId)) : eq(assignments.teacherId, teacherId);
  return db.select().from(assignments).where(condition).orderBy(desc(assignments.createdAt));
}
export async function getAssignmentById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  return db.select().from(assignments).where(eq(assignments.id, id)).limit(1).then((r) => r[0]);
}

export async function createProject(input: typeof projects.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(projects).values(input);
  return db.select().from(projects).where(eq(projects.studentId, input.studentId)).orderBy(desc(projects.id)).limit(1).then((r) => r[0]);
}
export async function getProjectById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  return db.select().from(projects).where(eq(projects.id, id)).limit(1).then((r) => r[0]);
}
export async function getStudentProjects(studentId: number, classroomId?: number) {
  const db = await getDb(); if (!db) return [];
  const condition = classroomId ? and(eq(projects.studentId, studentId), eq(projects.classroomId, classroomId)) : eq(projects.studentId, studentId);
  return db.select().from(projects).where(condition).orderBy(desc(projects.updatedAt));
}
export async function updateProject(id: number, studentId: number, values: Partial<typeof projects.$inferInsert>) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.update(projects).set(values).where(and(eq(projects.id, id), eq(projects.studentId, studentId)));
  return getProjectById(id);
}

export async function getSubmissionByIdempotencyKey(idempotencyKey: string) {
  const db = await getDb(); if (!db) return undefined;
  return db.select().from(submissions).where(eq(submissions.idempotencyKey, idempotencyKey)).limit(1).then((r) => r[0]);
}
export async function createSubmission(input: typeof submissions.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(submissions).values(input);
  return getSubmissionByIdempotencyKey(input.idempotencyKey);
}
export async function createTeacherNotification(input: typeof notifications.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable");
  await db.insert(notifications).values(input).onDuplicateKeyUpdate({ set: { submissionId: input.submissionId } });
  return db.select().from(notifications).where(eq(notifications.submissionId, input.submissionId)).limit(1).then((r) => r[0]);
}
export async function getTeacherNotifications(teacherId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.teacherId, teacherId)).orderBy(desc(notifications.createdAt));
}
export async function markTeacherNotificationRead(notificationId: number, teacherId: number) {
  const db = await getDb(); if (!db) return undefined;
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, notificationId), eq(notifications.teacherId, teacherId)));
  return db.select().from(notifications).where(and(eq(notifications.id, notificationId), eq(notifications.teacherId, teacherId))).limit(1).then((r) => r[0]);
}
export async function getLatestSubmissionForProject(projectId: number, studentId: number, assignmentId: number) {
  const db = await getDb(); if (!db) return undefined;
  return db.select().from(submissions).where(and(eq(submissions.projectId, projectId), eq(submissions.studentId, studentId), eq(submissions.assignmentId, assignmentId))).orderBy(desc(submissions.submittedAt)).limit(1).then((r) => r[0]);
}
export async function getLatestSubmissionsForAssignment(assignmentId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(submissions).where(eq(submissions.assignmentId, assignmentId)).orderBy(desc(submissions.submittedAt));
}
export type AssignmentProgressRow = {
  studentId: number;
  studentName: string | null;
  joinedAt: Date;
  projectId: number | null;
  projectName: string | null;
  projectUpdatedAt: Date | null;
  lastRunStatus: "not-run" | "success" | "error" | null;
  lastRunErrorCount: number | null;
  submissionId: number | null;
  submittedAt: Date | null;
};
export function aggregateProgressRows(rows: AssignmentProgressRow[]) {
  return rows.map((row) => ({ ...row, state: row.submittedAt ? "submitted" : row.projectUpdatedAt ? "draft-active" : "not-started" as const }));
}

export async function getAssignmentProgress(assignmentId: number, classroomId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select({
    studentId: users.id,
    studentName: users.name,
    joinedAt: classMemberships.joinedAt,
    projectId: projects.id,
    projectName: projects.name,
    projectUpdatedAt: projects.updatedAt,
    lastRunStatus: projects.lastRunStatus,
    lastRunErrorCount: projects.lastRunErrorCount,
    submissionId: sql<number>`MAX(${submissions.id})`,
    submittedAt: sql<Date | null>`MAX(${submissions.submittedAt})`,
  }).from(classMemberships)
    .innerJoin(users, eq(classMemberships.studentId, users.id))
    .leftJoin(projects, and(eq(projects.studentId, users.id), eq(projects.classroomId, classroomId), eq(projects.assignmentId, assignmentId)))
    .leftJoin(submissions, and(eq(submissions.studentId, users.id), eq(submissions.assignmentId, assignmentId)))
    .where(eq(classMemberships.classroomId, classroomId))
    .groupBy(users.id, users.name, classMemberships.joinedAt, projects.id, projects.name, projects.updatedAt, projects.lastRunStatus, projects.lastRunErrorCount)
    .orderBy(users.name).then(aggregateProgressRows);
}
