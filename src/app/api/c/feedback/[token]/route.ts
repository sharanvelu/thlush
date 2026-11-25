import type { NextRequest } from "next/server";
import { ok, parseBody, toErrorResponse } from "@/lib/api";
import { feedbackSubmitSchema } from "@/lib/validation/feedback";
import * as FeedbackService from "@/services/FeedbackService";

/**
 * A customer sends their feedback. Public: there is no session, and the secret in the link is the only
 * credential, so it is checked (exists, not expired, not already used) inside the service.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const input = await parseBody(req, feedbackSubmitSchema);
    await FeedbackService.submitFeedback(token, input);
    return ok({ received: true }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
