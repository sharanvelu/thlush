import { ok, parseBody, parseId, withAuth } from "@/lib/api";
import { customerPatchSchema } from "@/lib/validation/customer";
import * as CustomerService from "@/services/CustomerService";

type Params = { id: string };

export const GET = withAuth<Params>(
  async (_req, { params }) => ok(await CustomerService.getCustomerRecord(parseId(params.id))),
  { permission: "customers.view" },
);

export const PATCH = withAuth<Params>(
  async (req, { user, params }) => ok(await CustomerService.updateCustomer(parseId(params.id), await parseBody(req, customerPatchSchema), user.id)),
  { permission: "customers.manage" },
);

export const DELETE = withAuth<Params>(
  async (_req, { user, params }) => ok(await CustomerService.deleteCustomer(parseId(params.id), user.id)),
  { permission: "customers.manage" },
);
