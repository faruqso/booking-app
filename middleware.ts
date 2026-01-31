import { withAuth } from "next-auth/middleware";
import type { NextRequestWithAuth } from "next-auth/middleware";
import { NextFetchEvent, NextResponse } from "next/server";

const withAuthMiddleware = withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isProtectedRoute = req.nextUrl.pathname.startsWith("/dashboard") ||
      req.nextUrl.pathname.startsWith("/onboarding");
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/dac94886-3075-4737-bdca-5cc6718aa40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4',location:'middleware.ts:withAuth',message:'middleware entry',data:{path:req.nextUrl.pathname,isProtectedRoute,hasToken:!!token},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

    if (!token && isProtectedRoute) {
      const signInUrl = new URL("/auth/signin", req.url);
      signInUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/dac94886-3075-4737-bdca-5cc6718aa40e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4',location:'middleware.ts:redirect',message:'redirect to sign-in',data:{callbackPath:req.nextUrl.pathname},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
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

