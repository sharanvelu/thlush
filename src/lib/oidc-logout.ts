/** Pieces of OIDC RP-initiated logout, so the redirect can be built and tested without a server. */

/** The provider's logout URL for this user, or null when it has none. */
export function buildEndSessionUrl(
  endpoint: string,
  params: { idToken?: string; postLogoutRedirectUri?: string; clientId?: string },
): string {
  const url = new URL(endpoint);
  if (params.idToken) url.searchParams.set("id_token_hint", params.idToken);
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

/**
 * Authentik ends a session by running a "flow", and its end-session endpoint just redirects to the page for that
 * flow. The flow can instead be run with a plain API call, which needs no page and no redirect back, so it works as a
 * background request. Given the redirect's `Location`, this is that API address; null if it is not an Authentik flow.
 */
export function flowExecutorUrl(endSessionEndpoint: string, location: string | null): string | null {
  const match = /\/flow\/([^/?#]+)\//.exec(location ?? "");
  return match?.[1] ? `${new URL(endSessionEndpoint).origin}/api/v3/flows/executor/${match[1]}/` : null;
}

/** Asks the end-session endpoint where it redirects to, without following it, and turns that into the flow's API address. */
export async function discoverFlowExecutorUrl(endSessionEndpoint: string, timeoutMs = 3000): Promise<string | null> {
  try {
    const response = await fetch(endSessionEndpoint, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return flowExecutorUrl(endSessionEndpoint, response.headers.get("location"));
  } catch {
    return null;
  }
}
