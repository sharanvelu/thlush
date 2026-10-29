import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <PlaceholderPage href="/admin/settings" />;
}
