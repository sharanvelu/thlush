import { notFound } from "next/navigation";

/**
 * Any customer URL with no page of its own. Unmatched URLs would otherwise fall through to the app-wide 404
 * (the staff one); sending them through `notFound()` here renders `../not-found.tsx` instead.
 */
export default function CustomerCatchAll() {
  notFound();
}
