import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Let next-intl handle locale routing first
  const response = intlMiddleware(request);

  // Extract locale from the pathname (e.g., /fr/dashboard → fr)
  const localeMatch = pathname.match(/^\/(fr|en)(?:\/|$)/);
  const locale = localeMatch?.[1] ?? routing.defaultLocale;

  // Denylist approach: protect all locale routes except known public ones
  const publicPaths = ["/login"];
  const isPublicRoute = publicPaths.some((p) =>
    pathname.match(new RegExp(`^/(fr|en)${p}(/.*)?$`))
  );

  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  const isAuthenticated = !!sessionToken;

  // Redirect unauthenticated users away from protected routes
  if (localeMatch && !isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  }

  // Redirect authenticated users away from login
  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
