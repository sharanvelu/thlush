import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Audit Log" };

export default function Page() {
  return <PlaceholderPage href="/admin/audit-log" />;
}
