/**
 * Menu photos dropped into `public/menu-photos/`, matched to menu items by name.
 *
 * A file matches an item when both names reduce to the same key: case, accents, spaces and punctuation are
 * ignored, so "Cold Coffee.jpg", "cold-coffee.webp" and "COLD_COFFEE.png" all belong to "Cold Coffee".
 * The folder is read on every request, so adding, replacing or removing a photo shows up on the next page
 * load. Server-only (reads the file system).
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

/** Folder under `public/`, and so also the URL path the photos are served from. */
export const MENU_PHOTOS_DIR = "menu-photos";

/** Image types the proxy lets through untouched on both domains (see the matcher in `src/proxy.ts`). */
const EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png"];

/** "Cold Coffee", "cold-coffee" and "COLD_COFFEE" all become "cold-coffee". Empty when nothing is left. */
export function photoKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface PhotoFile {
  name: string;
  /** Changes when the file does (its modified time), so a replaced photo is not served from cache. */
  version: string;
}

/**
 * Item key -> photo URL. When two files match one item (say a .jpg and a .webp), the earlier type in
 * `EXTENSIONS` wins, then the file name, so the choice never depends on the order the disk lists them.
 */
export function buildPhotoIndex(files: PhotoFile[]): Map<string, string> {
  const ranked = files
    .map((file) => {
      const ext = path.extname(file.name).toLowerCase();
      return { file, rank: EXTENSIONS.indexOf(ext), key: photoKey(path.basename(file.name, path.extname(file.name))) };
    })
    .filter((f) => f.rank !== -1 && f.key !== "" && !f.file.name.startsWith("."))
    .sort((a, b) => a.rank - b.rank || a.file.name.localeCompare(b.file.name));

  const index = new Map<string, string>();
  for (const { file, key } of ranked) {
    if (index.has(key)) continue;
    index.set(key, `/${MENU_PHOTOS_DIR}/${encodeURIComponent(file.name)}?v=${file.version}`);
  }
  return index;
}

/** The photo for an item, or null. */
export function photoFor(index: Map<string, string>, itemName: string): string | null {
  return index.get(photoKey(itemName)) ?? null;
}

/** Reads the folder. A missing or unreadable folder simply means no photos. */
export async function loadMenuPhotos(): Promise<Map<string, string>> {
  const dir = path.join(process.cwd(), "public", MENU_PHOTOS_DIR);
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((e) => e.isFile())
        .map(async (e): Promise<PhotoFile> => {
          const { mtimeMs } = await stat(path.join(dir, e.name));
          return { name: e.name, version: Math.floor(mtimeMs).toString(36) };
        }),
    );
    return buildPhotoIndex(files);
  } catch {
    return new Map();
  }
}
