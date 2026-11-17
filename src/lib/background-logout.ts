/**
 * Ends the identity provider's session without leaving the app: the browser sends the logout request to the
 * provider directly, with the user's own provider cookies, and this resolves when the request finishes (or
 * after a short wait, so a slow provider cannot keep the user on a loader). Browser only.
 *
 * A plain request is used instead of a hidden frame because providers refuse to show their logout page in a
 * frame by default, while a request is not subject to that. The response cannot be read (it is cross-site), so
 * success is not detectable here. It works when the provider accepts its session cookie on a cross-site request
 * (its cookie must be `SameSite=None`) and ends the session from the ID token alone.
 */
export async function endProviderSessionInBackground(url: string, timeoutMs = 4000): Promise<void> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(url, {
      mode: "no-cors",
      credentials: "include",
      redirect: "follow",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
  } catch {
    // A refused or timed-out request still ends the wait; the app session is already gone.
  } finally {
    window.clearTimeout(timer);
  }
}
