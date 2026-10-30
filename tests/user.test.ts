import { describe, expect, it } from "vitest";
import { auditQuerySchema } from "@/lib/validation/audit";
import { changePasswordSchema, createUserSchema, passwordSchema, profileSchema, updateUserSchema, userListQuerySchema } from "@/lib/validation/user";

describe("passwords", () => {
  it("need length, a letter and a number", () => {
    expect(passwordSchema.safeParse("abc12345").success).toBe(true);
    expect(passwordSchema.safeParse("short1").success).toBe(false);
    expect(passwordSchema.safeParse("allletters").success).toBe(false);
    expect(passwordSchema.safeParse("12345678").success).toBe(false);
    expect(passwordSchema.safeParse("a1".repeat(40)).success).toBe(false);
  });
});

describe("user input", () => {
  it("normalises the email and checks the role", () => {
    const u = createUserSchema.parse({ name: " Ravi ", email: " Ravi@Shop.COM ", role: "manager", password: "abc12345" });
    expect(u).toMatchObject({ name: "Ravi", email: "ravi@shop.com", role: "manager" });
    expect(createUserSchema.safeParse({ name: "R", email: "ravi@shop.com", role: "owner", password: "abc12345" }).success).toBe(false);
    expect(createUserSchema.safeParse({ name: "R", email: "not-an-email", role: "billing", password: "abc12345" }).success).toBe(false);
  });

  it("allows partial updates, with a password only when it is valid", () => {
    expect(updateUserSchema.parse({ role: "billing" })).toEqual({ role: "billing" });
    expect(updateUserSchema.safeParse({ password: "weak" }).success).toBe(false);
    expect(updateUserSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("parses lists and profiles", () => {
    expect(userListQuerySchema.parse({ role: "x", page: "0" })).toMatchObject({ page: 1, pageSize: 20 });
    expect(userListQuerySchema.parse({ role: "billing", q: " ra " })).toMatchObject({ role: "billing", q: "ra" });
    expect(profileSchema.safeParse({ themePreference: "neon" }).success).toBe(false);
    expect(profileSchema.parse({ themePreference: "dark" })).toEqual({ themePreference: "dark" });
    expect(changePasswordSchema.safeParse({ currentPassword: "", newPassword: "abc12345" }).success).toBe(false);
  });
});

describe("audit query", () => {
  it("ignores junk", () => {
    expect(auditQuerySchema.parse({ user: "nope", from: "x", page: "-1" })).toMatchObject({ page: 1, pageSize: 25 });
    expect(auditQuerySchema.parse({ entity: " bill ", action: "void" })).toMatchObject({ entity: "bill", action: "void" });
  });
});
