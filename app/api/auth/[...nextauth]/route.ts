import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

// Ensure this route runs on Node.js on Vercel (NextAuth does not support Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auto-set dev fallbacks so sign-in works locally even if .env wasn't loaded
if (process.env.NODE_ENV === "development") {
  if (!process.env.NEXTAUTH_SECRET) {
    process.env.NEXTAUTH_SECRET = "dev-secret-min-32-chars-for-nextauth-jwt";
    console.warn("⚠️ [AUTH] NEXTAUTH_SECRET was missing; using dev fallback. Set it in .env for production.");
  }
  if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = "http://localhost:3000";
    console.warn("⚠️ [AUTH] NEXTAUTH_URL was missing; using http://localhost:3000. Set it in .env for production.");
  }
} else if (!process.env.NEXTAUTH_SECRET) {
  console.error("⚠️ [AUTH] NEXTAUTH_SECRET is not set! Authentication will fail.");
}

const handler = NextAuth(authOptions);

async function handleAuthRequest(
  request: Request,
  context: { params: { nextauth?: string[] } }
) {
  try {
    return await handler(request, context);
  } catch (error) {
    console.error("[AUTH] Unhandled error:", error);
    const url = new URL(request.url);
    const pathname = url.pathname;
    const baseUrl = url.origin;
    // Session/csrf checks run on every page load; return valid "no session" so the sign-in page doesn't show an error before the user has tried to sign in
    if (pathname.includes("/session")) {
      return NextResponse.json({});
    }
    if (pathname.includes("/csrf")) {
      return NextResponse.json({ csrfToken: "" });
    }
    // NextAuth sent the user to /api/auth/error after sign-in failed; redirect to sign-in page so they see a proper form and message instead of 500
    if (pathname.includes("/error")) {
      const errorParam = url.searchParams.get("error") || "ServerError";
      return NextResponse.redirect(`${baseUrl}/auth/signin?error=${encodeURIComponent(errorParam)}`);
    }
    // For sign-in POST and other auth actions, return 500 JSON so the client gets JSON not HTML
    return NextResponse.json(
      { error: "ServerError", message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request, context: { params: { nextauth?: string[] } }) {
  return handleAuthRequest(request, context);
}

export async function POST(request: Request, context: { params: { nextauth?: string[] } }) {
  return handleAuthRequest(request, context);
}

