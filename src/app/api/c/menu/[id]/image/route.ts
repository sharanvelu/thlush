import { parseId } from "@/lib/api";
import * as MenuService from "@/services/MenuService";
import { getCachedPosCatalog } from "@/services/PosCatalogService";

/**
 * A menu photo for the customer site. Reached as `/api/menu/<id>/image` on the customer domain (the proxy
 * maps `/api/*` there under `/api/c`). Public, but only for items customers can see on the menu.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const notFound = () => new Response(null, { status: 404 });
  let id: number;
  try {
    id = parseId((await params).id);
  } catch {
    return notFound();
  }

  const catalog = await getCachedPosCatalog();
  const item = catalog.items.find((i) => i.id === id);
  // Only what the menu page shows: an active item in an active category.
  if (!item || item.status !== "active" || !catalog.categories.some((c) => c.id === item.categoryId)) return notFound();

  const image = await MenuService.getMenuItemImage(id);
  if (!image) return notFound();
  if (image.type === "redirect") return Response.redirect(image.url, 302);
  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
