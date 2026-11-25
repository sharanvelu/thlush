import { ok, parseId, withAuth } from "@/lib/api";
import * as FeedbackService from "@/services/FeedbackService";

/** Makes the 24-hour feedback link for a completed bill (replacing an unused one). */
export const POST = withAuth<{ id: string }>(
  async (_req, { user, params }) =>
    ok(await FeedbackService.createFeedbackLink(parseId(params.id), user), { status: 201 }),
  { permission: "bills.create" },
);
