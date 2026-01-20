import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

// Add error handling for missing environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.error("⚠️ NEXTAUTH_SECRET is not set! Authentication will fail.");
}

if (!process.env.NEXTAUTH_URL && process.env.VERCEL) {
  console.warn("⚠️ NEXTAUTH_URL is not set in production. Using VERCEL_URL.");
}

export { handler as GET, handler as POST };

