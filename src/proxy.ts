import {auth} from "@/auth";
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
  '/admin/users',
  '/admin/customers',
];

// Routes that require super_admin role
const adminRoutePrefix: string = '/admin';
const adminApiPrefix: string = '/api/admin';

// API routes that require authentication
const protectedApiPrefix: string = '/api/';

// Routes that should NOT require authentication
const publicRoutes: string[] = ['/login'];

export async function proxy(request: NextRequest) {
  const {pathname} = request.nextUrl;

  // Skip auth API routes — Auth.js handles these
  if (pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  const session = await auth();

  // Public routes — redirect to dashboard if already authenticated
  if (publicRoutes.some((route: string) => pathname === route)) {
    if (session?.user) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Check if route is protected (page or API)
  const isProtectedPage: boolean = protectedRoutes.some((route: string) => pathname === route);
  const isProtectedApi: boolean = pathname.startsWith(protectedApiPrefix);

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  // Verify authentication
  if (!session?.user) {
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

  // Check super_admin role for admin routes
  const isAdminPage: boolean = pathname.startsWith(adminRoutePrefix);
  const isAdminApi: boolean = pathname.startsWith(adminApiPrefix);

  if (isAdminPage || isAdminApi) {
    const role = session.user.role;

    if (role !== 'super_admin') {
      if (isAdminApi) {
        return NextResponse.json(
          {success: false, error: 'Access denied. Super Admin role required.'},
          {status: 403}
        );
      }

      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
