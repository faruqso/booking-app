import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { addHours } from "date-fns";
import { Resend } from "resend";

export const dynamic = 'force-dynamic';

// Lazy initialization - only create Resend instance when needed (not at build time)
const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with this email, a password reset link has been sent.",
      });
    }

    // Generate reset token
    const token = randomBytes(32).toString("hex");
    const expires = addHours(new Date(), 1); // Token expires in 1 hour

    // Store token in VerificationToken table
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: email,
          token: token,
        },
      },
      create: {
        identifier: email,
        token: token,
        expires: expires,
      },
      update: {
        token: token,
        expires: expires,
      },
    });

    // Send reset email
    const resend = getResend();
    if (resend) {
      // Use NEXTAUTH_URL if available (more reliable), otherwise fall back to NEXT_PUBLIC_APP_URL or default
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
      const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`;
      
      try {
        const getFromEmail = () => {
          if (process.env.RESEND_FROM_EMAIL) {
            return process.env.RESEND_FROM_EMAIL;
          }
          return "Bookings <onboarding@resend.dev>";
        };
        
        await resend.emails.send({
          from: getFromEmail(),
          to: email,
          subject: "Reset Your Password",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333;">Reset Your Password</h2>
              <p>Hello,</p>
              <p>You requested to reset your password. Click the button below to create a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="color: #666; font-size: 14px; word-break: break-all;">${resetUrl}</p>
              <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Failed to send reset email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      message: "If an account exists with this email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

