/** Pieces of OIDC RP-initiated logout, so the redirect can be built and tested without a server. */

/** The provider's logout URL for this user, or null when it has none. */
export function buildEndSessionUrl(
  endpoint: string,
  params: { idToken: string; postLogoutRedirectUri?: string; clientId?: string },
): string {
  const url = new URL(endpoint);
  url.searchParams.set("id_token_hint", params.idToken);
  if (params.postLogoutRedirectUri) url.searchParams.set("post_logout_redirect_uri", params.postLogoutRedirectUri);
  if (params.clientId) url.searchParams.set("client_id", params.clientId);
  return url.toString();
}

/** Reads `end_session_endpoint` from the provider's discovery document. Null if absent or unreachable. */
export async function discoverEndSessionEndpoint(issuer: string, timeoutMs = 3000): Promise<string | null> {
  try {
    const response = await fetch(`${issuer.replace(/\/+$/, "")}/.well-known/openid-configuration`, {
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const document = (await response.json()) as { end_session_endpoint?: unknown };
    const endpoint = document.end_session_endpoint;
    return typeof endpoint === "string" && /^https?:\/\//.test(endpoint) ? endpoint : null;
  } catch {
    return null;
  }
}
