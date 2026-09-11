import { describe, expect, it } from "vitest";
import { isTeacherEmail, supabaseIdentityToInsert } from "./_core/context";

describe("teacher email allowlist", () => {
  it("recognizes the configured teacher account and rejects ordinary signup emails", () => {
    expect(isTeacherEmail("imageandkolors@gmail.com")).toBe(true);
    expect(isTeacherEmail("student@example.com")).toBe(false);
  });

  it("maps the allowlisted identity to teacher and leaves ordinary signup role unset for the database student default", () => {
    expect(supabaseIdentityToInsert({ id: "teacher-id", email: "imageandkolors@gmail.com" }).role).toBe("admin");
    expect(supabaseIdentityToInsert({ id: "student-id", email: "student@example.com" })).not.toHaveProperty("role");
  });
});
