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
          return null;
        }

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const trimmedPassword = credentials.password.trim();

        // Test database connection first with retry logic for Neon
        let connectionAttempts = 0;
        const maxRetries = 2; // Retry once if first attempt fails (helps with Neon wake-up)
        
        while (connectionAttempts <= maxRetries) {
          try {
            // Try a simple query to test connection
            await prisma.$queryRaw`SELECT 1`;
            break; // Connection successful, exit retry loop
          } catch (dbConnError: any) {
            connectionAttempts++;
            
            // Check for specific database connection errors
            const isConnectionError = 
              dbConnError?.message?.includes("Can't reach database server") || 
              dbConnError?.message?.includes("connection") ||
              dbConnError?.code === "P1001" ||
              dbConnError?.code === "P1000";
            
            if (isConnectionError && connectionAttempts <= maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
              continue;
            }
            
            if (isConnectionError) {
              const error = new DatabaseError("DATABASE_CONNECTION_ERROR");
              (error as any).originalError = dbConnError;
              throw error;
            }
            // For other database errors, throw generic error
            const error = new DatabaseError("DATABASE_ERROR");
            (error as any).originalError = dbConnError;
            throw error;
          }
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
            const error = new DatabaseError("DATABASE_ERROR");
            (error as any).originalError = dbError;
            throw error;
          }
        }

        if (!user) {
          return null;
        }

        if (!user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          trimmedPassword,
          user.password
        );

        if (!isPasswordValid) {
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
        secure: process.env.NODE_ENV === 'production' || !!process.env.VERCEL,
      },
    },
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (account?.error) {
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
    async signIn({ account }) {
      if (account?.error) {
        return false;
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signin", // Redirect errors back to signin page
  },
  secret: process.env.NEXTAUTH_SECRET || (process.env.VERCEL ? "fallback-secret-change-in-production" : undefined),
  debug: process.env.NODE_ENV === "development" || !!process.env.VERCEL, // Enable debug in development and Vercel
};

