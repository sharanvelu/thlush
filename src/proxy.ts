import {createServerClient} from '@supabase/ssr';
import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

// Routes that require authentication
const protectedRoutes: string[] = [
  '/',
  '/billing',
  '/billing/history',
  '/menu',
  '/categories',
  '/profile',
];

// API routes that require authentication
const protectedApiPrefix: string = '/api/';

// Routes that should NOT require authentication
const publicRoutes: string[] = [
  '/login',
];

export async function proxy(request: NextRequest) {
  const {pathname} = request.nextUrl;

  // Public routes — redirect to dashboard if already authenticated
  if (publicRoutes.some((route: string) => pathname === route)) {
    const supabase = createMiddlewareClient(request);
    const {data: {user}} = await supabase.auth.getUser();

    if (user) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return await updateSession(request);
  }

  // Check if route is protected (page or API)
  const isProtectedPage: boolean = protectedRoutes.some((route: string) => pathname === route);
  const isProtectedApi: boolean = pathname.startsWith(protectedApiPrefix);

  if (!isProtectedPage && !isProtectedApi) {
    return await updateSession(request);
  }

  // Verify authentication
  const supabase = createMiddlewareClient(request);
  const {data: {user}} = await supabase.auth.getUser();

  if (!user) {
    if (isProtectedApi) {
      return NextResponse.json(
        {success: false, error: 'Authentication required'},
        {status: 401}
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return await updateSession(request);
}

function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({request});

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({name, value}) => request.cookies.set(name, value));
          response = NextResponse.next({request});
          cookiesToSet.forEach(({name, value, options}) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    },
  );
}

async function updateSession(request: NextRequest) {
  let response = NextResponse.next({request});

  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({name, value}) => request.cookies.set(name, value));
          response = NextResponse.next({request});
          cookiesToSet.forEach(({name, value, options}) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    },
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
