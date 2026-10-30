import { buildPagination, ok, paginated, parseBody, parseQuery, withAuth } from "@/lib/api";
import { supplierListQuerySchema, supplierSchema } from "@/lib/validation/inventory";
import { createSupplier, listSuppliers } from "@/services/PurchasingService";

export const GET = withAuth(
  async (req) => {
    const query = parseQuery(req, supplierListQuerySchema);
    const { rows, total } = await listSuppliers(query);
    return paginated(rows, buildPagination(query.page, query.pageSize, total));
  },
  { permission: "suppliers.manage" },
);

export const POST = withAuth(
  async (req, { user }) => ok(await createSupplier(await parseBody(req, supplierSchema), user), { status: 201 }),
  { permission: "suppliers.manage" },
);
