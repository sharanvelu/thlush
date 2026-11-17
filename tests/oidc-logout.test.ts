import { afterEach, describe, expect, it, vi } from "vitest";
import { settingsSchemas } from "@/lib/validation/settings";
import { buildEndSessionUrl, discoverEndSessionEndpoint, discoverFlowExecutorUrl, flowExecutorUrl } from "@/lib/oidc-logout";

afterEach(() => vi.unstubAllGlobals());

describe("buildEndSessionUrl", () => {
  it("adds the ID token, the return address and the client id", () => {
    const url = new URL(
      buildEndSessionUrl("https://sso.example.com/realms/shop/protocol/openid-connect/logout", {
        idToken: "abc.def.ghi",
        postLogoutRedirectUri: "https://pos.example.com/login",
        clientId: "thlush",
      }),
    );
    expect(url.origin + url.pathname).toBe("https://sso.example.com/realms/shop/protocol/openid-connect/logout");
    expect(url.searchParams.get("id_token_hint")).toBe("abc.def.ghi");
    expect(url.searchParams.get("post_logout_redirect_uri")).toBe("https://pos.example.com/login");
    expect(url.searchParams.get("client_id")).toBe("thlush");
  });

  it("leaves out the return address when nothing needs to come back (a background logout)", () => {
    const url = new URL(buildEndSessionUrl("https://sso.example.com/logout", { idToken: "t" }));
    expect(url.searchParams.get("id_token_hint")).toBe("t");
    expect(url.searchParams.has("post_logout_redirect_uri")).toBe(false);
  });

  it("keeps query parameters the provider already uses", () => {
    const url = new URL(buildEndSessionUrl("https://sso.example.com/logout?tenant=a", { idToken: "t", postLogoutRedirectUri: "https://x.test/login" }));
    expect(url.searchParams.get("tenant")).toBe("a");
    expect(url.searchParams.has("client_id")).toBe(false);
  });
});

describe("discoverEndSessionEndpoint", () => {
  const respond = (body: unknown, ok = true) => vi.fn().mockResolvedValue({ ok, json: async () => body });

  it("reads the endpoint from the discovery document, tolerating a trailing slash on the issuer", async () => {
    const fetchMock = respond({ end_session_endpoint: "https://sso.example.com/logout" });
    vi.stubGlobal("fetch", fetchMock);
    expect(await discoverEndSessionEndpoint("https://sso.example.com/realm/")).toBe("https://sso.example.com/logout");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://sso.example.com/realm/.well-known/openid-configuration");
  });

  it("is null when the provider has no logout endpoint, answers badly, or cannot be reached", async () => {
    vi.stubGlobal("fetch", respond({}));
    expect(await discoverEndSessionEndpoint("https://sso.example.com")).toBeNull();
    vi.stubGlobal("fetch", respond({ end_session_endpoint: "javascript:alert(1)" }));
    expect(await discoverEndSessionEndpoint("https://sso.example.com")).toBeNull();
    vi.stubGlobal("fetch", respond({}, false));
    expect(await discoverEndSessionEndpoint("https://sso.example.com")).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await discoverEndSessionEndpoint("https://sso.example.com")).toBeNull();
  });
});

describe("Authentik logout flow", () => {
  const endpoint = "https://auth.example.com/application/o/thlush/end-session/";

  it("turns the end-session redirect into the flow's API address", () => {
    expect(flowExecutorUrl(endpoint, "/if/flow/default-invalidation-flow/?next=%2F")).toBe(
      "https://auth.example.com/api/v3/flows/executor/default-invalidation-flow/",
    );
    expect(flowExecutorUrl(endpoint, "https://auth.example.com/if/flow/my-logout/")).toBe(
      "https://auth.example.com/api/v3/flows/executor/my-logout/",
    );
  });

  it("is null when the redirect is not an Authentik flow", () => {
    expect(flowExecutorUrl(endpoint, null)).toBeNull();
    expect(flowExecutorUrl(endpoint, "https://sso.example.com/realms/shop/login")).toBeNull();
  });

  it("reads the redirect without following it", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ headers: new Headers({ location: "/if/flow/inv/" }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await discoverFlowExecutorUrl(endpoint)).toBe("https://auth.example.com/api/v3/flows/executor/inv/");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: "manual" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await discoverFlowExecutorUrl(endpoint)).toBeNull();
  });
});

describe("sso settings", () => {
  it("accepts the three logout modes and nothing else", () => {
    for (const logout of ["off", "background", "redirect"]) {
      expect(settingsSchemas.sso.safeParse({ logout }).success).toBe(true);
    }
    expect(settingsSchemas.sso.safeParse({ logout: "yes" }).success).toBe(false);
  });
});
