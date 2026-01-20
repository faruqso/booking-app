import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const smsConfigSchema = z.object({
  twilioAccountSid: z.string().optional().nullable(),
  twilioAuthToken: z.string().optional().nullable(),
  twilioPhoneNumber: z.string().optional().nullable(),
  smsRemindersEnabled: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: {
        id: true,
        twilioPhoneNumber: true,
        smsRemindersEnabled: true,
        // Don't return secret tokens in GET request for security
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(business);
  } catch (error) {
    console.error("SMS config fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch SMS configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only business owners can update SMS configuration
    if (session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json(
        { error: "Forbidden - Only business owners can update SMS configuration" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = smsConfigSchema.parse(body);

    // Build update data
    const updateData: any = {};

    if (validatedData.twilioAccountSid !== undefined && validatedData.twilioAccountSid) {
      updateData.twilioAccountSid = validatedData.twilioAccountSid;
    }
    if (validatedData.twilioAuthToken !== undefined && validatedData.twilioAuthToken) {
      updateData.twilioAuthToken = validatedData.twilioAuthToken;
    }
    if (validatedData.twilioPhoneNumber !== undefined) {
      updateData.twilioPhoneNumber = validatedData.twilioPhoneNumber || null;
    }
    if (validatedData.smsRemindersEnabled !== undefined) {
      updateData.smsRemindersEnabled = validatedData.smsRemindersEnabled;
    }

    const business = await prisma.business.update({
      where: { id: session.user.businessId },
      data: updateData,
      select: {
        id: true,
        twilioPhoneNumber: true,
        smsRemindersEnabled: true,
      },
    });

    return NextResponse.json(business);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("SMS config update error:", error);
    return NextResponse.json(
      { error: "Failed to update SMS configuration" },
      { status: 500 }
    );
  }
}
