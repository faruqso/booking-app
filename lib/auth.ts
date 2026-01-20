import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log("Missing credentials");
          return null;
        }

        // Normalize email: trim whitespace and convert to lowercase
        const normalizedEmail = credentials.email.trim().toLowerCase();
        const trimmedPassword = credentials.password.trim();

        // Try to find user with normalized email first
        let user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: { business: true },
        });

        // Fallback: if not found, try case-insensitive search (for existing users)
        // This handles users created before email normalization was implemented
        if (!user) {
          user = await prisma.user.findFirst({
            where: {
              email: {
                equals: credentials.email.trim(),
                mode: 'insensitive',
              },
            },
            include: { business: true },
          });
        }

        if (!user) {
          console.log("User not found:", normalizedEmail);
          return null;
        }

        if (!user.password) {
          console.log("User has no password set");
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          trimmedPassword,
          user.password
        );

        if (!isPasswordValid) {
          console.log("Invalid password for user:", normalizedEmail);
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          businessId: user.businessId,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.businessId = user.businessId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
        session.user.businessId = token.businessId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin", // Redirect errors back to signin page
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development", // Enable debug in development
};

