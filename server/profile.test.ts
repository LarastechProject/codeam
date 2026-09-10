import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ updateUserProfile: vi.fn() }));
vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, updateUserProfile: dbMocks.updateUserProfile };
});

function context(role: "teacher" | "student") {
  return {
    user: { id: role === "teacher" ? 1 : 2, openId: `supabase-${role}`, email: `${role}@example.com`, name: role, loginMethod: "supabase", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} }, res: {},
  } as unknown as TrpcContext;
}

describe("auth.profile", () => {
  it("returns a protected profile for both classroom roles", async () => {
    const student = await appRouter.createCaller(context("student")).auth.profile();
    expect(student.role).toBe("student");
    const teacher = await appRouter.createCaller(context("teacher")).auth.profile();
    expect(teacher.role).toBe("teacher");
  });

  it("updates name and email without accepting a role field", async () => {
    dbMocks.updateUserProfile.mockResolvedValue({ ...context("student").user, name: "Updated Student", email: "updated@example.com", role: "student" });
    const result = await appRouter.createCaller(context("student")).auth.updateProfile({ name: "Updated Student", email: "updated@example.com" });
    expect(result.role).toBe("student");
    expect(dbMocks.updateUserProfile).toHaveBeenCalledWith(2, { name: "Updated Student", email: "updated@example.com" });
  });
});
