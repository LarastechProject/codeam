import { randomUUID } from "node:crypto";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  addMembership, createAssignment, createClassroom, createProject, createSubmission,
  createTeacherNotification, getAssignmentById, getAssignmentProgress, getClassroomById, getClassroomByJoinCode,
  getClassroomMemberships, getLatestSubmissionForProject, getMembership, getProjectById, getStudentMemberships, getSubmissionByIdempotencyKey, getTeacherNotifications, markTeacherNotificationRead,
  getStudentProjects, getTeacherAssignments, getTeacherClassrooms, updateAssignment, updateClassroom,
  updateProject, updateUserProfile,
} from "./db";

const levelSchema = z.enum(["primary-1-2", "primary-3-4", "primary-5-6", "jss1-plus"]);
const runStatusSchema = z.enum(["not-run", "success", "error"]);
const idSchema = z.number().int().positive();

const teacherProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "teacher" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Teacher access is required" });
  }
  return next();
});

function code() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}
async function ownedClassroom(id: number, teacherId: number) {
  const classroom = await getClassroomById(id);
  if (!classroom) throw new TRPCError({ code: "NOT_FOUND", message: "Classroom not found" });
  if (classroom.teacherId !== teacherId) throw new TRPCError({ code: "FORBIDDEN", message: "Only the classroom teacher can perform this action" });
  return classroom;
}
async function studentClassroom(id: number, studentId: number) {
  const classroom = await getClassroomById(id);
  if (!classroom) throw new TRPCError({ code: "NOT_FOUND", message: "Classroom not found" });
  const membership = await getMembership(id, studentId);
  if (!membership) throw new TRPCError({ code: "FORBIDDEN", message: "Join this classroom before accessing its work" });
  return classroom;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
    profile: protectedProcedure.query(({ ctx }) => ctx.user),
    updateProfile: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(160), email: z.string().trim().email().max(320) })).mutation(({ ctx, input }) => updateUserProfile(ctx.user.id, input)),
  }),

  classroom: router({
    create: teacherProcedure.input(z.object({ name: z.string().trim().min(2).max(160), level: levelSchema })).mutation(async ({ ctx, input }) => {
      let joinCode = code();
      for (let attempt = 0; attempt < 5; attempt++) {
        if (!(await getClassroomByJoinCode(joinCode))) break;
        joinCode = code();
      }
      const classroom = await createClassroom({ teacherId: ctx.user.id, name: input.name, level: input.level, joinCode });
      return classroom;
    }),
    mine: teacherProcedure.query(({ ctx }) => getTeacherClassrooms(ctx.user.id)),
    update: teacherProcedure.input(z.object({ id: idSchema, name: z.string().trim().min(2).max(160).optional(), level: levelSchema.optional() })).mutation(({ ctx, input }) => ownedClassroom(input.id, ctx.user.id).then(() => updateClassroom(input.id, ctx.user.id, { name: input.name, level: input.level }))),
    members: teacherProcedure.input(z.object({ classroomId: idSchema })).query(async ({ ctx, input }) => { await ownedClassroom(input.classroomId, ctx.user.id); return getClassroomMemberships(input.classroomId); }),
    joinByCode: protectedProcedure.input(z.object({ joinCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{6}$/) })).mutation(async ({ ctx, input }) => {
      const classroom = await getClassroomByJoinCode(input.joinCode);
      if (!classroom) throw new TRPCError({ code: "NOT_FOUND", message: "That join code is not valid" });
      await addMembership(classroom.id, ctx.user.id);
      return classroom;
    }),
    studentMine: protectedProcedure.query(({ ctx }) => getStudentMemberships(ctx.user.id)),
  }),

  assignment: router({
    create: teacherProcedure.input(z.object({ classroomId: idSchema, title: z.string().trim().min(2).max(180), instructions: z.string().trim().min(1).max(10000), dueAt: z.coerce.date().nullable().optional() })).mutation(async ({ ctx, input }) => {
      await ownedClassroom(input.classroomId, ctx.user.id);
      return createAssignment({ classroomId: input.classroomId, teacherId: ctx.user.id, title: input.title, instructions: input.instructions, dueAt: input.dueAt ?? null });
    }),
    mine: teacherProcedure.input(z.object({ classroomId: idSchema.optional() })).query(({ ctx, input }) => getTeacherAssignments(ctx.user.id, input.classroomId)),
    forStudent: protectedProcedure.input(z.object({ classroomId: idSchema })).query(async ({ ctx, input }) => {
      const classroom = await studentClassroom(input.classroomId, ctx.user.id);
      const items = await getTeacherAssignments(classroom.teacherId, classroom.id);
      return items.map(({ teacherId: _teacherId, ...assignment }) => assignment);
    }),
    update: teacherProcedure.input(z.object({ id: idSchema, title: z.string().trim().min(2).max(180).optional(), instructions: z.string().trim().min(1).max(10000).optional(), dueAt: z.coerce.date().nullable().optional() })).mutation(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.id);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      await ownedClassroom(assignment.classroomId, ctx.user.id);
      const { id, ...values } = input;
      return updateAssignment(id, ctx.user.id, values);
    }),
  }),

  project: router({
    mine: protectedProcedure.input(z.object({ classroomId: idSchema.optional() })).query(({ ctx, input }) => getStudentProjects(ctx.user.id, input.classroomId)),
    save: protectedProcedure.input(z.object({ id: idSchema.optional(), classroomId: idSchema, assignmentId: idSchema.nullable().optional(), name: z.string().trim().min(1).max(180), html: z.string().max(200000), css: z.string().max(200000), javascript: z.string().max(200000), draftUpdatedAt: z.coerce.date().optional(), lastRunStatus: runStatusSchema.default("not-run"), lastRunErrorCount: z.number().int().min(0).max(1000).default(0) })).mutation(async ({ ctx, input }) => {
      await studentClassroom(input.classroomId, ctx.user.id);
      if (input.assignmentId) {
        const assignment = await getAssignmentById(input.assignmentId);
        if (!assignment || assignment.classroomId !== input.classroomId) throw new TRPCError({ code: "BAD_REQUEST", message: "Assignment does not belong to this classroom" });
      }
      const values = { classroomId: input.classroomId, assignmentId: input.assignmentId ?? null, name: input.name, html: input.html, css: input.css, javascript: input.javascript, draftUpdatedAt: input.draftUpdatedAt ?? new Date(), lastRunStatus: input.lastRunStatus, lastRunErrorCount: input.lastRunErrorCount };
      if (input.id) {
        const existing = await getProjectById(input.id);
        if (!existing || existing.studentId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own projects" });
        if (existing.classroomId !== input.classroomId) throw new TRPCError({ code: "FORBIDDEN", message: "Project classroom mismatch" });
        return updateProject(input.id, ctx.user.id, values);
      }
      return createProject({ studentId: ctx.user.id, ...values });
    }),
    submit: protectedProcedure.input(z.object({ projectId: idSchema, assignmentId: idSchema, idempotencyKey: z.string().min(16).max(80).default(() => randomUUID()), includeSummary: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId);
      if (!project || project.studentId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "You can only submit your own project" });
      if (project.assignmentId !== input.assignmentId) throw new TRPCError({ code: "BAD_REQUEST", message: "Project is not linked to this assignment" });
      const assignment = await getAssignmentById(input.assignmentId);
      if (!assignment || assignment.classroomId !== project.classroomId) throw new TRPCError({ code: "BAD_REQUEST", message: "Assignment does not match the project classroom" });
      await studentClassroom(project.classroomId, ctx.user.id);
      const existing = await getSubmissionByIdempotencyKey(input.idempotencyKey);
      const latest = existing ?? await getLatestSubmissionForProject(project.id, ctx.user.id, assignment.id);
      if (latest && latest.snapshotName === project.name && latest.snapshotHtml === project.html && latest.snapshotCss === project.css && latest.snapshotJavascript === project.javascript && latest.runStatus === project.lastRunStatus && latest.runErrorCount === project.lastRunErrorCount) {
        return { submission: latest, notificationSent: false, duplicate: true };
      }
      if (existing) {
        if (existing.studentId !== ctx.user.id || existing.assignmentId !== assignment.id || existing.projectId !== project.id) throw new TRPCError({ code: "CONFLICT", message: "Submission key has already been used" });
        return { submission: existing, notificationSent: false, duplicate: true };
      }
      const submission = await createSubmission({ assignmentId: assignment.id, projectId: project.id, studentId: ctx.user.id, snapshotName: project.name, snapshotHtml: project.html, snapshotCss: project.css, snapshotJavascript: project.javascript, runStatus: project.lastRunStatus, runErrorCount: project.lastRunErrorCount, idempotencyKey: input.idempotencyKey });
      const summary = input.includeSummary ? ` Run status: ${project.lastRunStatus}; errors: ${project.lastRunErrorCount}.` : "";
      const notification = submission ? await createTeacherNotification({ teacherId: assignment.teacherId, submissionId: submission.id, title: "New CodeSprout submission", content: `A student submitted “${assignment.title}”.${summary}` }) : undefined;
      const notificationSent = await notifyOwner({ title: "CodeSprout assignment submitted", content: `A student submitted work for “${assignment.title}”. Teacher notification ${notification?.id ?? "queued"}; no source code or unnecessary student data is included in this alert.` });
      return { submission, notificationSent, duplicate: false };
    }),
  }),

  notification: router({
    mine: teacherProcedure.query(({ ctx }) => getTeacherNotifications(ctx.user.id)),
    markRead: teacherProcedure.input(z.object({ id: idSchema })).mutation(({ ctx, input }) => markTeacherNotificationRead(input.id, ctx.user.id)),
  }),

  progress: router({
    assignment: teacherProcedure.input(z.object({ assignmentId: idSchema })).query(async ({ ctx, input }) => {
      const assignment = await getAssignmentById(input.assignmentId);
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });
      await ownedClassroom(assignment.classroomId, ctx.user.id);
      return getAssignmentProgress(assignment.id, assignment.classroomId);
    }),
  }),
});

export type AppRouter = typeof appRouter;
