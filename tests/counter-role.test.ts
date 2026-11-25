import { describe, expect, it } from "vitest";
import { canAccessPath, hasPermission, ROLE_PERMISSIONS } from "@/config/permissions";
import { navForRole } from "@/config/navigation";
import { billSaveSchema } from "@/lib/validation/bill";
import { billFilterSchema } from "@/lib/validation/bill-history";
import { staffPatchSchema, staffSchema } from "@/lib/validation/staff";

const line = { menuItemId: 1, quantity: "1" };
const save = { action: "complete", clientRef: "ref-12345678", lines: [line] };

describe("Counter role (shared till login)", () => {
  it("can bill and look at its own bills, and nothing more", () => {
    expect([...ROLE_PERMISSIONS.counter].sort()).toEqual(["bills.create", "bills.view_own", "customers.view", "menu.view"]);
    for (const p of ["dashboard.view", "bills.void", "bills.view_all", "reports.view", "users.manage", "staff.manage", "settings.manage"] as const) {
      expect(hasPermission("counter", p)).toBe(false);
    }
  });

  it("only sees the billing screen and bill history in the menus", () => {
    const hrefs = navForRole("counter").flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs.sort()).toEqual(["/billing", "/bills"]);
  });

  it("is kept out of the dashboard and the admin pages", () => {
    expect(canAccessPath("counter", "/billing")).toBe(true);
    expect(canAccessPath("counter", "/bills")).toBe(true);
    expect(canAccessPath("counter", "/")).toBe(false);
    expect(canAccessPath("counter", "/reports")).toBe(false);
    expect(canAccessPath("counter", "/admin/staff")).toBe(false);
    expect(canAccessPath("counter", "/api/staff")).toBe(false);
  });

  it("lets managers and admins, but not cashiers, manage the staff list", () => {
    expect(canAccessPath("super_admin", "/admin/staff")).toBe(true);
    expect(canAccessPath("manager", "/admin/staff")).toBe(true);
    expect(canAccessPath("manager", "/api/staff/3")).toBe(true);
    expect(canAccessPath("billing", "/admin/staff")).toBe(false);
  });
});

describe("cashier on a bill", () => {
  it("is optional and defaults to none", () => {
    expect(billSaveSchema.parse(save).cashierId).toBeNull();
    expect(billSaveSchema.parse({ ...save, cashierId: null }).cashierId).toBeNull();
  });

  it("takes a staff id", () => {
    expect(billSaveSchema.parse({ ...save, cashierId: 7 }).cashierId).toBe(7);
  });

  it("rejects ids that are not whole positive numbers", () => {
    for (const cashierId of [0, -1, 1.5, "7"]) {
      expect(billSaveSchema.safeParse({ ...save, cashierId }).success).toBe(false);
    }
  });
});

describe("bill history cashier filter", () => {
  const uuid = "3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b";

  it("accepts an account id or a staff id", () => {
    expect(billFilterSchema.parse({ cashier: uuid }).cashier).toBe(uuid);
    expect(billFilterSchema.parse({ cashier: "s12" }).cashier).toBe("s12");
  });

  it("drops anything else instead of failing", () => {
    for (const cashier of ["12", "s", "s1x", "drop table", "sabc"]) {
      expect(billFilterSchema.parse({ cashier }).cashier).toBeUndefined();
    }
  });
});

describe("staff member", () => {
  it("defaults to an active cashier", () => {
    expect(staffSchema.parse({ name: "  Asha " })).toEqual({ name: "Asha", title: null, isCashier: true, status: "active" });
  });

  it("needs a name", () => {
    expect(staffSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("only changes what an update sends", () => {
    expect(staffPatchSchema.parse({ status: "disabled" })).toEqual({ status: "disabled" });
  });
});
