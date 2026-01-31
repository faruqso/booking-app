import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { NextFetchEvent, NextResponse } from "next/server";

const withAuthMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard") ||
      req.nextUrl.pathname.startsWith("/onboarding");

    if (!token && isProtectedRoute) {
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      return NextResponse.redirect(signInUrl);
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        if (req.nextUrl.pathname.startsWith("/dashboard") ||
            req.nextUrl.pathname.startsWith("/onboarding")) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export default function middleware(req: NextRequestWithAuth, event: NextFetchEvent) {
  try {
    return withAuthMiddleware(req, event);
  } catch {
    const signInUrl = new URL("/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};

