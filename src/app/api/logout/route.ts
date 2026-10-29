import {NextRequest, NextResponse} from 'next/server';
import {getToken} from "next-auth/jwt";
import {signOut} from "@/auth";
import {ApiResponse as TypeApiResponse} from "@/types/global";

interface LogoutResult {
  // Authentik flow-executor URL that the browser calls in the background to end the IdP session.
  idp_logout_url: string | null;
}

const DEFAULT_INVALIDATION_FLOW: string = 'default-invalidation-flow';

const getEndSessionEndpoint = async (issuer: string): Promise<string> => {
  const base: string = issuer.endsWith('/') ? issuer : `${issuer}/`;

  try {
    const response: Response = await fetch(`${base}.well-known/openid-configuration`, {cache: 'no-store'});
    const discovery: { end_session_endpoint?: string } = await response.json();
    if (discovery.end_session_endpoint) return discovery.end_session_endpoint;
  } catch (error) {
    console.error('OIDC discovery failed, falling back to default end-session URL:', error);
  }

  return `${base}end-session/`;
};

// The end-session endpoint redirects to the provider's invalidation flow (/if/flow/<slug>/).
// Resolve that slug so the browser can run the flow directly, without leaving this app.
const getIdpLogoutUrl = async (issuer: string): Promise<string> => {
  const endSessionUrl: URL = new URL(await getEndSessionEndpoint(issuer));
  let slug: string = DEFAULT_INVALIDATION_FLOW;

  try {
    const response: Response = await fetch(endSessionUrl, {redirect: 'manual', cache: 'no-store'});
    const match: RegExpMatchArray | null = (response.headers.get('location') ?? '').match(/\/flow\/([^/]+)\//);
    if (match) slug = match[1];
  } catch (error) {
    console.error('Could not resolve the IdP invalidation flow, using default:', error);
  }

  return `${endSessionUrl.origin}/api/v3/flows/executor/${slug}/`;
};

// Ends the local session and, for SSO users, returns the URL used to end the IdP session in the background.
export async function POST(request: NextRequest): Promise<NextResponse<TypeApiResponse<LogoutResult>>> {
  const secure: boolean = request.nextUrl.protocol === 'https:';
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: secure,
    salt: secure ? '__Secure-authjs.session-token' : 'authjs.session-token',
  });

  const idpLogoutUrl: string | null = token?.provider === 'authentik' && process.env.AUTHENTIK_ISSUER
    ? await getIdpLogoutUrl(process.env.AUTHENTIK_ISSUER)
    : null;

  await signOut({redirect: false});

  return NextResponse.json({success: true, data: {idp_logout_url: idpLogoutUrl}});
}
