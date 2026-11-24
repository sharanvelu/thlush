import { randomUUID } from "node:crypto";
import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

/**
 * Product photos live in a Neon Object Storage bucket. The database column keeps a reference of the form
 * `s3:<key>`; older rows may still hold a `data:` URL or an `https://` link, which are served as before.
 */
const REF_PREFIX = "s3:";

const EXTENSIONS: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg" };
const CONTENT_TYPES: Record<string, string> = { webp: "image/webp", png: "image/png", jpg: "image/jpeg" };

let client: Files | undefined;
function files(): Files {
  client ??= new Files({ adapter: neon({ bucket: process.env.OBJECT_STORAGE_BUCKET?.trim() || "uploads" }) });
  return client;
}

/** True when the Neon bucket credentials are present (injected by `neon deploy` / `neon env pull`). */
export function isObjectStorageConfigured(): boolean {
  return Boolean(process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

export const isStoredRef = (value: string | null | undefined): value is string => !!value?.startsWith(REF_PREFIX);
const keyOf = (ref: string) => ref.slice(REF_PREFIX.length);

/** Uploads a `data:image/...;base64,...` photo and returns the reference to store in the database. */
export async function putImageFromDataUrl(dataUrl: string): Promise<string> {
  const match = /^data:(image\/(?:webp|png|jpeg));base64,(.+)$/.exec(dataUrl);
  if (!match?.[1] || !match[2]) throw new Error("Not a supported image data URL.");
  const key = `menu/${randomUUID()}.${EXTENSIONS[match[1]]}`;
  await files().upload(key, Buffer.from(match[2], "base64"), { contentType: match[1] });
  return REF_PREFIX + key;
}

/** Opens a stored photo for streaming. Returns null when the object is gone. */
export async function openImage(ref: string): Promise<{ contentType: string; body: ReadableStream<Uint8Array> } | null> {
  const key = keyOf(ref);
  try {
    const file = await files().download(key);
    const ext = key.split(".").pop() ?? "";
    return { contentType: CONTENT_TYPES[ext] ?? file.contentType ?? "application/octet-stream", body: file.stream() };
  } catch (error) {
    if ((error as { code?: string }).code !== "NotFound") console.error("Could not read image from object storage", key, error);
    return null;
  }
}

/** Copies a stored photo to a new object (used when an item is duplicated) and returns the new reference. */
export async function copyImage(ref: string): Promise<string> {
  const from = keyOf(ref);
  const to = `menu/${randomUUID()}.${from.split(".").pop() ?? "webp"}`;
  await files().copy(from, to);
  return REF_PREFIX + to;
}

/** Best-effort removal of stored photos. A failure leaves an orphan object but never fails the request. */
export async function deleteImages(refs: Array<string | null | undefined>): Promise<void> {
  const stored = refs.filter(isStoredRef);
  await Promise.all(
    stored.map((ref) =>
      files()
        .delete(keyOf(ref))
        .catch((error: unknown) => console.error("Could not delete image from object storage", keyOf(ref), error)),
    ),
  );
}
