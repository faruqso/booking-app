import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/signin - Redirect to the sign-in page.
 * NextAuth and other clients sometimes send users here; this ensures they
 * always get the page instead of 405 on preview deployments.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const signInPage = new URL("/auth/signin", url.origin);
  signInPage.search = url.search; // preserve callbackUrl etc.
  return NextResponse.redirect(signInPage);
}
