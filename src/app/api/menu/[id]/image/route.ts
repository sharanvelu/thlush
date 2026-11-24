import { fail, parseId, withAuth } from "@/lib/api";
import * as MenuService from "@/services/MenuService";

/** Serves a stored product photo. The URL carries a version, so it can be cached for a year. */
export const GET = withAuth<{ id: string }>(
  async (_req, { params }) => {
    const image = await MenuService.getMenuItemImage(parseId(params.id));
    if (!image) return fail("No image.", 404);
    if (image.type === "redirect") return Response.redirect(image.url, 302);
    const headers = {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    };
    if (image.type === "stream") return new Response(image.body, { headers });
    return new Response(new Uint8Array(image.bytes), { headers });
  },
  { permission: "menu.view" },
);
