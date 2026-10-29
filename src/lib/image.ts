/** Browser-only helpers for preparing product photos. */

const MAX_INPUT_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

export const IMAGE_ACCEPT = ACCEPTED.join(",");

/**
 * Resizes a photo to fit in `maxSize` pixels and re-encodes it as WebP, returning a
 * data URL of roughly 20 to 60 KB. Small enough to store in the database.
 */
export async function fileToResizedDataUrl(file: File, maxSize = 512): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Choose a PNG, JPEG or WebP image.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That image is larger than 8 MB.");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That file could not be read as an image.");
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process the image.");
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/webp", 0.82);
  if (!dataUrl.startsWith("data:image/webp")) {
    // Very old browsers fall back to PNG; accept it only if it is still small.
    if (dataUrl.length > 250_000) throw new Error("Could not shrink that image enough. Try a smaller one.");
  }
  return dataUrl;
}
