import { ok, parseBody, parseId, withAuth } from "@/lib/api";
import { supplierPatchSchema } from "@/lib/validation/inventory";
import { deleteSupplier, updateSupplier } from "@/services/PurchasingService";

type Params = { id: string };

export const PATCH = withAuth<Params>(
  async (req, { user, params }) => ok(await updateSupplier(parseId(params.id), await parseBody(req, supplierPatchSchema), user)),
  { permission: "suppliers.manage" },
);

export const DELETE = withAuth<Params>(async (_req, { user, params }) => ok(await deleteSupplier(parseId(params.id), user)), {
  permission: "suppliers.manage",
});
