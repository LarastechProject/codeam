import { beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { aggregateProgressRows } from "./db";

const dbMocks = vi.hoisted(() => ({
  getClassroomByJoinCode: vi.fn(),
  addMembership: vi.fn(),
  getClassroomById: vi.fn(),
  getMembership: vi.fn(),
  getProjectById: vi.fn(),
  getAssignmentById: vi.fn(),
  createSubmission: vi.fn(),
  getSubmissionByIdempotencyKey: vi.fn(),
  createTeacherNotification: vi.fn(),
  createProject: vi.fn(),
  getAssignmentProgress: vi.fn(),
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});
vi.mock("./_core/notification", () => ({ notifyOwner: vi.fn().mockResolvedValue(true) }));

function context(role: "teacher" | "student" | "admin" = "student", id = 2): TrpcContext {
  return {
    user: { id, openId: `user-${id}`, name: `User ${id}`, email: `user${id}@example.com`, loginMethod: "test", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("CodeSprout classroom backend", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects student access to teacher classroom procedures", async () => {
    await expect(appRouter.createCaller(context("student")).classroom.mine()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(context("student")).assignment.mine({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("allows a student to join a valid six-character code and is idempotent", async () => {
    dbMocks.getClassroomByJoinCode.mockResolvedValue({ id: 9, teacherId: 1, name: "Web Foundations", joinCode: "ABC234", level: "primary-5-6" });
    dbMocks.addMembership.mockResolvedValue({ id: 4, classroomId: 9, studentId: 2, joinedAt: new Date() });
    const caller = appRouter.createCaller(context("student", 2));
    const result = await caller.classroom.joinByCode({ joinCode: " abc234 " });
    const second = await caller.classroom.joinByCode({ joinCode: "ABC234" });
    expect(result.id).toBe(9);
    expect(second.id).toBe(9);
    expect(dbMocks.addMembership).toHaveBeenCalledTimes(2);
    expect(dbMocks.addMembership).toHaveBeenCalledWith(9, 2);
  });

  it("rejects invalid join codes before creating membership", async () => {
    dbMocks.getClassroomByJoinCode.mockResolvedValue(undefined);
    await expect(appRouter.createCaller(context()).classroom.joinByCode({ joinCode: "ZZZ999" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.addMembership).not.toHaveBeenCalled();
  });

  it("saves a student's project with assignment linkage and run metadata", async () => {
    dbMocks.getClassroomById.mockResolvedValue({ id: 9, teacherId: 1, name: "Web Foundations", joinCode: "ABC234", level: "primary-5-6" });
    dbMocks.getMembership.mockResolvedValue({ id: 4, classroomId: 9, studentId: 2, joinedAt: new Date() });
    dbMocks.getAssignmentById.mockResolvedValue({ id: 11, classroomId: 9, teacherId: 1, title: "Page", instructions: "Build a page" });
    dbMocks.createProject.mockResolvedValue({ id: 10, studentId: 2, classroomId: 9, assignmentId: 11, name: "My page", html: "<h1>Hi</h1>", css: "", javascript: "", lastRunStatus: "success", lastRunErrorCount: 0 });
    const result = await appRouter.createCaller(context("student", 2)).project.save({ classroomId: 9, assignmentId: 11, name: "My page", html: "<h1>Hi</h1>", css: "", javascript: "", lastRunStatus: "success", lastRunErrorCount: 0 });
    expect(result?.id).toBe(10);
    expect(dbMocks.createProject).toHaveBeenCalledWith(expect.objectContaining({ studentId: 2, assignmentId: 11, lastRunStatus: "success" }));
  });

  it("prevents students from saving or submitting another student's project", async () => {
    dbMocks.getClassroomById.mockResolvedValue({ id: 9, teacherId: 1, name: "Web Foundations", joinCode: "ABC234", level: "primary-5-6" });
    dbMocks.getMembership.mockResolvedValue({ id: 4, classroomId: 9, studentId: 2, joinedAt: new Date() });
    dbMocks.getProjectById.mockResolvedValue({ id: 10, studentId: 99, classroomId: 9, assignmentId: 11, name: "Other work", html: "", css: "", javascript: "", lastRunStatus: "success", lastRunErrorCount: 0 });
    const caller = appRouter.createCaller(context("student", 2));
    await expect(caller.project.save({ id: 10, classroomId: 9, assignmentId: null, name: "Attempt", html: "", css: "", javascript: "", lastRunStatus: "success", lastRunErrorCount: 0 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.project.submit({ projectId: 10, assignmentId: 11 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("creates an immutable submission from the current project snapshot", async () => {
    dbMocks.getProjectById.mockResolvedValue({ id: 10, studentId: 2, classroomId: 9, assignmentId: 11, name: "My project", html: "<h1>Hello</h1>", css: "h1{}", javascript: "", lastRunStatus: "success", lastRunErrorCount: 0 });
    dbMocks.getAssignmentById.mockResolvedValue({ id: 11, classroomId: 9, teacherId: 1, title: "Page", instructions: "Build a page" });
    dbMocks.getMembership.mockResolvedValue({ id: 4, classroomId: 9, studentId: 2, joinedAt: new Date() });
    dbMocks.getClassroomById.mockResolvedValue({ id: 9, teacherId: 1, name: "Web Foundations", joinCode: "ABC234", level: "primary-5-6" });
    dbMocks.createSubmission.mockResolvedValue({ id: 77, assignmentId: 11, projectId: 10, studentId: 2, snapshotName: "My project", snapshotHtml: "<h1>Hello</h1>", snapshotCss: "h1{}", snapshotJavascript: "", runStatus: "success", runErrorCount: 0, idempotencyKey: "submission-key-123456", submittedAt: new Date() });
    dbMocks.getSubmissionByIdempotencyKey.mockResolvedValue(undefined);
    dbMocks.createTeacherNotification.mockResolvedValue({ id: 88, teacherId: 1, submissionId: 77, title: "New CodeSprout submission", content: "A student submitted" });
    const result = await appRouter.createCaller(context("student", 2)).project.submit({ projectId: 10, assignmentId: 11 });
    expect(result.submission?.id).toBe(77);
    expect(result.submission?.submittedAt).toBeInstanceOf(Date);
    expect(dbMocks.createSubmission).toHaveBeenCalledWith(expect.objectContaining({ snapshotHtml: "<h1>Hello</h1>", snapshotCss: "h1{}", snapshotJavascript: "", idempotencyKey: expect.any(String) }));
    expect(dbMocks.createTeacherNotification).toHaveBeenCalledWith(expect.objectContaining({ teacherId: 1, submissionId: 77 }));
  });

  it("returns the existing immutable snapshot when a submission is retried", async () => {
    const existing = { id: 77, assignmentId: 11, projectId: 10, studentId: 2, snapshotName: "My project", snapshotHtml: "<h1>Hello</h1>", snapshotCss: "h1{}", snapshotJavascript: "", runStatus: "success" as const, runErrorCount: 0, idempotencyKey: "submission-key-123456", submittedAt: new Date() };
    dbMocks.getProjectById.mockResolvedValue({ id: 10, studentId: 2, classroomId: 9, assignmentId: 11, name: "My project", html: "<h1>Hello</h1>", css: "h1{}", javascript: "", lastRunStatus: "success", lastRunErrorCount: 0 });
    dbMocks.getAssignmentById.mockResolvedValue({ id: 11, classroomId: 9, teacherId: 1, title: "Page", instructions: "Build a page" });
    dbMocks.getMembership.mockResolvedValue({ id: 4, classroomId: 9, studentId: 2, joinedAt: new Date() });
    dbMocks.getClassroomById.mockResolvedValue({ id: 9, teacherId: 1, name: "Web Foundations", joinCode: "ABC234", level: "primary-5-6" });
    dbMocks.getSubmissionByIdempotencyKey.mockResolvedValue(existing);
    const result = await appRouter.createCaller(context("student", 2)).project.submit({ projectId: 10, assignmentId: 11, idempotencyKey: existing.idempotencyKey });
    expect(result.duplicate).toBe(true);
    expect(result.submission).toEqual(existing);
    expect(dbMocks.createSubmission).not.toHaveBeenCalled();
  });

  it("aggregates teacher progress into submitted, draft-active, and not-started states", () => {
    const now = new Date();
    const result = aggregateProgressRows([
      { studentId: 1, studentName: "Submitted", joinedAt: now, projectId: 1, projectName: "A", projectUpdatedAt: now, lastRunStatus: "success", lastRunErrorCount: 0, submissionId: 5, submittedAt: now },
      { studentId: 2, studentName: "Draft", joinedAt: now, projectId: 2, projectName: "B", projectUpdatedAt: now, lastRunStatus: "error", lastRunErrorCount: 1, submissionId: null, submittedAt: null },
      { studentId: 3, studentName: "Not started", joinedAt: now, projectId: null, projectName: null, projectUpdatedAt: null, lastRunStatus: null, lastRunErrorCount: null, submissionId: null, submittedAt: null },
    ]);
    expect(result.map((row) => row.state)).toEqual(["submitted", "draft-active", "not-started"]);
    expect(result[1]?.lastRunErrorCount).toBe(1);
  });

  it("allows only the owning teacher to read assignment progress", async () => {
    dbMocks.getAssignmentById.mockResolvedValue({ id: 11, classroomId: 9, teacherId: 1, title: "Page", instructions: "Build a page" });
    await expect(appRouter.createCaller(context("teacher", 2)).progress.assignment({ assignmentId: 11 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    dbMocks.getClassroomById.mockResolvedValue({ id: 9, teacherId: 1, name: "Web Foundations", joinCode: "ABC234", level: "primary-5-6" });
    dbMocks.getAssignmentProgress.mockResolvedValue([{ studentId: 2, studentName: "Student", submittedAt: null }]);
    const result = await appRouter.createCaller(context("teacher", 1)).progress.assignment({ assignmentId: 11 });
    expect(result).toHaveLength(1);
    expect(dbMocks.getAssignmentProgress).toHaveBeenCalledWith(11, 9);
  });
});
