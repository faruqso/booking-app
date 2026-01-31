import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { NextFetchEvent, NextResponse } from "next/server";

// Same secret fallback as lib/auth.ts so middleware can verify JWT tokens
const secret =
  process.env.NEXTAUTH_SECRET ||
  (process.env.NODE_ENV === "development" ? "dev-secret-min-32-chars-for-nextauth-jwt" : undefined) ||
  (process.env.VERCEL ? "fallback-secret-change-in-production" : undefined);

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
    secret,
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

