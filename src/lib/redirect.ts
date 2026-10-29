/**
 * Returns `target` only if it is a same-site relative path, otherwise `fallback`.
 * Prevents open redirects through the `?redirect=` login parameter.
 */
export function safeRedirectPath(target: string | null | undefined, fallback = "/"): string {
  if (!target) return fallback;
  if (!target.startsWith("/")) return fallback;
  // "//evil.com" and "/\evil.com" are treated as protocol-relative by browsers.
  if (target.startsWith("//") || target.startsWith("/\\")) return fallback;
  if (/[\r\n]/.test(target)) return fallback;
  // Never bounce back into the auth pages.
  if (target === "/login" || target.startsWith("/login?")) return fallback;
  return target;
}
