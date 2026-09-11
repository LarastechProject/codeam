import { describe, expect, it } from "vitest";
import { validateSignupInput } from "./authValidation";

describe("validateSignupInput", () => {
  it("requires a display name and valid email", () => {
    expect(validateSignupInput({ name: "", email: "student@example.com", password: "12345678" })).toBe("Display name is required");
    expect(validateSignupInput({ name: "Student", email: "invalid", password: "12345678" })).toBe("Enter a valid email address");
  });

  it("requires an eight-character password", () => {
    expect(validateSignupInput({ name: "Student", email: "student@example.com", password: "123" })).toBe("Password must be at least 8 characters");
    expect(validateSignupInput({ name: "Student", email: "student@example.com", password: "12345678" })).toBeNull();
  });
});
