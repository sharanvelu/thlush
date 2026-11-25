import type { Metadata } from "next";
import { FeedbackView } from "@/components/feedback/feedback-view";
import { Forbidden } from "@/components/layout/forbidden";
import { feedbackListQuerySchema } from "@/lib/validation/feedback";
import { requireAccess } from "@/services/AuthService";
import { listFeedback } from "@/services/FeedbackService";
import { getSettings } from "@/services/SettingsService";

export const metadata: Metadata = { title: "Feedback" };

export default async function FeedbackPage({ searchParams }: PageProps<"/feedback">) {
  const { allowed } = await requireAccess("feedback.view");
  if (!allowed) return <Forbidden />;

  const settings = await getSettings();
  const raw = await searchParams;
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const query = feedbackListQuerySchema.parse(flat);
  const { rows, total, summary } = await listFeedback(query, settings.locale.timezone);

  return (
    <FeedbackView
      rows={rows}
      total={total}
      summary={summary}
      query={query}
      enabled={settings.features.feedback}
      locale={settings.locale}
    />
  );
}
