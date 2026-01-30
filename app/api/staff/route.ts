import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { addDays } from "date-fns";
import { sendStaffInvitationEmail } from "@/lib/email";

export const dynamic = 'force-dynamic';

const inviteStaffSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
});

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only business owners can view staff
    if (session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staff = await prisma.user.findMany({
      where: {
        businessId: session.user.businessId,
        role: "STAFF",
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        emailVerified: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only business owners can invite staff
    if (session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = inviteStaffSchema.parse(body);

    // Normalize email for checking
    const normalizedEmail = validatedData.email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        business: true,
      },
    });

    if (existingUser) {
      // Check if they're already staff in this business
      if (existingUser.businessId === session.user.businessId && existingUser.role === "STAFF") {
        const isVerified = existingUser.emailVerified !== null;
        return NextResponse.json(
          { 
            error: isVerified 
              ? "This person is already a staff member of your business"
              : "An invitation has already been sent to this email. The invitation is still pending.",
            code: "ALREADY_STAFF",
            isVerified,
            canResend: !isVerified,
          },
          { status: 400 }
        );
      }

      // Check if they're staff in another business
      if (existingUser.role === "STAFF" && existingUser.businessId !== session.user.businessId) {
        return NextResponse.json(
          { 
            error: "This email is already associated with another business as a staff member",
            code: "STAFF_OTHER_BUSINESS",
          },
          { status: 400 }
        );
      }

      // Check if they're a business owner
      if (existingUser.role === "BUSINESS_OWNER") {
        return NextResponse.json(
          { 
            error: "This email is already registered as a business owner",
            code: "BUSINESS_OWNER",
          },
          { status: 400 }
        );
      }

      // Generic error for other cases
      return NextResponse.json(
        { 
          error: "A user with this email already exists",
          code: "USER_EXISTS",
        },
        { status: 400 }
      );
    }

    // Generate a temporary password (staff will need to reset it)
    const tempPassword = randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create staff user (use normalized email)
    const staff = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: validatedData.name,
        password: hashedPassword,
        role: "STAFF",
        businessId: session.user.businessId,
        emailVerified: null, // Staff needs to verify email
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    // Generate invitation token (valid for 7 days)
    const token = randomBytes(32).toString("hex");
    const expires = addDays(new Date(), 7);

    // Store token in VerificationToken table
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: validatedData.email,
          token: token,
        },
      },
      create: {
        identifier: validatedData.email,
        token: token,
        expires: expires,
      },
      update: {
        token: token,
        expires: expires,
      },
    });

    // Get business info for email
    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: {
        businessName: true,
        primaryColor: true,
        logoUrl: true,
      },
    });

    // Send invitation email
    try {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
      const invitationUrl = `${baseUrl}/auth/reset-password?token=${token}`;

      await sendStaffInvitationEmail(normalizedEmail, {
        staffName: validatedData.name,
        businessName: business?.businessName || "the business",
        invitationUrl: invitationUrl,
        businessLogoUrl: business?.logoUrl || null,
        primaryColor: business?.primaryColor || "#3b82f6",
      });
    } catch (emailError) {
      console.error("Failed to send staff invitation email:", emailError);
      // Don't fail the request if email fails - staff is already created
      // Log the error but continue
    }

    return NextResponse.json(
      { 
        staff,
        message: "Staff member invited. They will receive an email to set their password.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to invite staff:", error);
    return NextResponse.json(
      { error: "Failed to invite staff" },
      { status: 500 }
    );
  }
}

