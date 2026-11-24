import { ok, parseBody, withAuth } from "@/lib/api";
import { staffSchema } from "@/lib/validation/staff";
import * as StaffService from "@/services/StaffService";

export const GET = withAuth(async () => ok(await StaffService.listStaff()), { permission: "staff.manage" });

export const POST = withAuth(
  async (req, { user }) => {
    const input = await parseBody(req, staffSchema);
    return ok(await StaffService.createStaff(input, user.id), { status: 201 });
  },
  { permission: "staff.manage" },
);
