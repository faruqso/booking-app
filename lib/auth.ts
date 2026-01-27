import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Custom error class for database errors that NextAuth can handle
class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

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
        // Validate input
        if (!credentials?.email || !credentials?.password) {
          console.error("[AUTH] Missing credentials:", {
            hasEmail: !!credentials?.email,
            hasPassword: !!credentials?.password,
          });
          return null; // NextAuth expects null for failed auth
        }

        // Normalize email: trim whitespace and convert to lowercase
        const normalizedEmail = credentials.email.trim().toLowerCase();
        const trimmedPassword = credentials.password.trim();

        console.log("[AUTH] Attempting login for:", normalizedEmail);

        // Test database connection first
        try {
          // Try a simple query to test connection
          await prisma.$queryRaw`SELECT 1`;
        } catch (dbConnError: any) {
          console.error("[AUTH] Database connection failed:", {
            error: dbConnError?.message,
            code: dbConnError?.code,
            email: normalizedEmail,
          });
          
          // Check for specific database connection errors
          const isConnectionError = 
            dbConnError?.message?.includes("Can't reach database server") || 
            dbConnError?.message?.includes("connection") ||
            dbConnError?.code === "P1001" ||
            dbConnError?.code === "P1000";
          
          if (isConnectionError) {
            // Throw custom error that will be passed through NextAuth
            const error = new DatabaseError("DATABASE_CONNECTION_ERROR");
            // Store original error details
            (error as any).originalError = dbConnError;
            throw error;
          }
          // For other database errors, throw generic error
          const error = new DatabaseError("DATABASE_ERROR");
          (error as any).originalError = dbConnError;
          throw error;
        }

        // Check database connection
        let user;
        try {
          // Try to find user with normalized email first
          user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { business: true },
          });
        } catch (dbError: any) {
          console.error("[AUTH] Database error during user lookup:", {
            error: dbError?.message,
            code: dbError?.code,
            meta: dbError?.meta,
            email: normalizedEmail,
          });
          
            // Check for specific database errors
            if (dbError?.message?.includes("Can't reach database server") || 
                dbError?.message?.includes("connection") ||
                dbError?.code === "P1001" ||
                dbError?.code === "P1000") {
              const error = new DatabaseError("DATABASE_CONNECTION_ERROR");
              (error as any).originalError = dbError;
              throw error;
            }
            const error = new DatabaseError("DATABASE_ERROR");
            (error as any).originalError = dbError;
            throw error;
        }

        // Fallback: if not found, try case-insensitive search (for existing users)
        // This handles users created before email normalization was implemented
        if (!user) {
          console.log("[AUTH] User not found with exact match, trying case-insensitive search");
          try {
            user = await prisma.user.findFirst({
              where: {
                email: {
                  equals: credentials.email.trim(),
                  mode: 'insensitive',
                },
              },
              include: { business: true },
            });
          } catch (dbError: any) {
            console.error("[AUTH] Database error during case-insensitive search:", {
              error: dbError?.message,
              code: dbError?.code,
            });
            const error = new DatabaseError("DATABASE_ERROR");
            (error as any).originalError = dbError;
            throw error;
          }
        }

        if (!user) {
          console.error("[AUTH] User not found:", {
            email: normalizedEmail,
            attemptedEmail: credentials.email.trim(),
          });
          return null; // User not found - return null for failed auth
        }

        console.log("[AUTH] User found:", {
          id: user.id,
          email: user.email,
          hasPassword: !!user.password,
          hasBusiness: !!user.business,
        });

        if (!user.password) {
          console.error("[AUTH] User has no password set:", {
            userId: user.id,
            email: user.email,
          });
          return null; // No password set - return null
        }

        const isPasswordValid = await bcrypt.compare(
          trimmedPassword,
          user.password
        );

        if (!isPasswordValid) {
          console.error("[AUTH] Invalid password:", {
            userId: user.id,
            email: user.email,
            passwordLength: trimmedPassword.length,
          });
          return null; // Invalid password - return null
        }

        console.log("[AUTH] Login successful:", {
          userId: user.id,
          email: user.email,
          role: user.role,
        });

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
        secure: process.env.NODE_ENV === 'production' || !!process.env.VERCEL,
      },
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Handle errors from authorize function
      if (account?.error) {
        console.error("[AUTH] JWT callback received error:", account.error);
        // Store error in token so it can be accessed if needed
        token.error = account.error;
      }
      
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
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
    async signIn({ user, account, profile, email, credentials }) {
      // Log sign-in attempts
      console.log("[AUTH] SignIn callback:", {
        userId: user?.id,
        email: user?.email || email,
        accountProvider: account?.provider,
        error: account?.error,
      });
      
      // If there's an error, don't allow sign-in
      if (account?.error) {
        console.error("[AUTH] SignIn blocked due to error:", account.error);
        return false;
      }
      
      return true;
    },
    async jwt({ token, user, account }) {
      // Handle errors from authorize function
      if (account?.error) {
        console.error("[AUTH] JWT callback received error:", account.error);
        // Store error in token so it can be accessed in session callback
        token.error = account.error;
      }
      
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = user.role;
        token.businessId = user.businessId;
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin", // Redirect errors back to signin page
  },
  secret: process.env.NEXTAUTH_SECRET || (process.env.VERCEL ? "fallback-secret-change-in-production" : undefined),
  debug: process.env.NODE_ENV === "development" || !!process.env.VERCEL, // Enable debug in development and Vercel
};

