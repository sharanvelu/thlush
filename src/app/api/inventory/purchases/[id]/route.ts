import { ok, parseId, withAuth } from "@/lib/api";
import { getPurchase } from "@/services/PurchasingService";

export const GET = withAuth<{ id: string }>(async (_req, { params }) => ok(await getPurchase(parseId(params.id))), {
  permission: "suppliers.manage",
});
