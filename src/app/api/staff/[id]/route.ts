import { ok, parseBody, parseId, withAuth } from "@/lib/api";
import { staffPatchSchema } from "@/lib/validation/staff";
import * as StaffService from "@/services/StaffService";

type Params = { id: string };

export const PATCH = withAuth<Params>(
  async (req, { user, params }) => {
    const patch = await parseBody(req, staffPatchSchema);
    return ok(await StaffService.updateStaff(parseId(params.id), patch, user.id));
  },
  { permission: "staff.manage" },
);

export const DELETE = withAuth<Params>(
  async (_req, { user, params }) => {
    await StaffService.deleteStaff(parseId(params.id), user.id);
    return ok({ deleted: true });
  },
  { permission: "staff.manage" },
);
