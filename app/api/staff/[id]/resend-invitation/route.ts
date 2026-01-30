import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { addDays } from "date-fns";
import { sendStaffInvitationEmail } from "@/lib/email";

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only business owners can resend invitations
    if (session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Find staff member
    const staff = await prisma.user.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
        role: "STAFF",
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Check if already verified
    if (staff.emailVerified) {
      return NextResponse.json(
        { error: "This staff member has already accepted their invitation" },
        { status: 400 }
      );
    }

    // Generate new invitation token (valid for 7 days)
    const token = randomBytes(32).toString("hex");
    const expires = addDays(new Date(), 7);

    // Store token in VerificationToken table
    await prisma.verificationToken.upsert({
      where: {
        identifier_token: {
          identifier: staff.email,
          token: token,
        },
      },
      create: {
        identifier: staff.email,
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

      await sendStaffInvitationEmail(staff.email, {
        staffName: staff.name || "Staff Member",
        businessName: business?.businessName || "the business",
        invitationUrl: invitationUrl,
        businessLogoUrl: business?.logoUrl || null,
        primaryColor: business?.primaryColor || "#3b82f6",
      });
    } catch (emailError) {
      console.error("Failed to send staff invitation email:", emailError);
      return NextResponse.json(
        { error: "Failed to send invitation email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Invitation email has been resent successfully",
    });
  } catch (error) {
    console.error("Failed to resend invitation:", error);
    return NextResponse.json(
      { error: "Failed to resend invitation" },
      { status: 500 }
    );
  }
}
