import type { Metadata } from "next";
import { Forbidden } from "@/components/layout/forbidden";

export const metadata: Metadata = { title: "Access denied" };

/** The proxy rewrites here (with a 403 status) when a role cannot open a route. */
export default function ForbiddenPage() {
  return <Forbidden />;
}
