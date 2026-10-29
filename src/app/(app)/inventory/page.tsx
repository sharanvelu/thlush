import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Stock Overview" };

export default function Page() {
  return <PlaceholderPage href="/inventory" />;
}
