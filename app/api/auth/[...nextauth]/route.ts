import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Ensure this route runs on Node.js on Vercel (NextAuth does not support Edge)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Add error handling for missing environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.error("⚠️ [AUTH] NEXTAUTH_SECRET is not set! Authentication will fail.");
}

if (!process.env.NEXTAUTH_URL && process.env.VERCEL) {
  console.warn("⚠️ [AUTH] NEXTAUTH_URL is not set in production. Using VERCEL_URL.");
}

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

