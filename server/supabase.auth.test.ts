import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getTeacherClassrooms: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getUser: mocks.getUser } }),
}));
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, upsertUser: mocks.upsertUser, getUserByOpenId: mocks.getUserByOpenId, getTeacherClassrooms: mocks.getTeacherClassrooms };
});

import { extractBearerToken, supabaseIdentityToInsert, createContext } from "./_core/context";
import { appRouter } from "./routers";

describe("Supabase auth bridge", () => {
  beforeEach(() => vi.clearAllMocks());

  it("extracts only Bearer access tokens", () => {
    expect(extractBearerToken({ headers: { authorization: "Bearer token-123" } } as never)).toBe("token-123");
    expect(extractBearerToken({ headers: { authorization: "Basic token-123" } } as never)).toBeUndefined();
  });

  it("maps identity data without trusting role metadata", () => {
    expect(supabaseIdentityToInsert({ id: "supabase-user-1", email: "student@example.com", user_metadata: { full_name: "Student", role: "teacher" } })).toEqual({ openId: "supabase-user-1", email: "student@example.com", name: "Student", loginMethod: "supabase" });
  });

  it("resolves a Supabase token to the local role before enforcing a protected procedure", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "supabase-teacher-1", email: "teacher@example.com", user_metadata: { full_name: "Teacher" } } } });
    mocks.getUserByOpenId.mockResolvedValue({ id: 7, openId: "supabase-teacher-1", email: "teacher@example.com", name: "Teacher", loginMethod: "supabase", role: "teacher", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() });
    mocks.getTeacherClassrooms.mockResolvedValue([]);
    const request = { headers: { authorization: "Bearer real-test-token" } } as never;
    const resolved = await createContext({ req: request, res: {} as never } as never);
    expect(resolved.user?.role).toBe("teacher");
    expect(mocks.upsertUser).toHaveBeenCalledWith(expect.objectContaining({ openId: "supabase-teacher-1", loginMethod: "supabase" }));
    await expect(appRouter.createCaller(resolved).classroom.mine()).resolves.toEqual([]);
  });
});
