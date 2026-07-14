import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_TOKEN_COOKIE = "tharaa_access";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

  const isProtected = pathname.startsWith("/dashboard") ||
    ["/orders", "/categories", "/products", "/inventory", "/offers", "/coupons", "/customers", "/reviews", "/notifications", "/delivery", "/settings", "/activity"].some(
      (p) => pathname.startsWith(p),
    );

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/orders/:path*",
    "/categories/:path*",
    "/products/:path*",
    "/inventory/:path*",
    "/offers/:path*",
    "/coupons/:path*",
    "/customers/:path*",
    "/reviews/:path*",
    "/notifications/:path*",
    "/delivery/:path*",
    "/settings/:path*",
    "/activity/:path*",
    "/login",
  ],
};
