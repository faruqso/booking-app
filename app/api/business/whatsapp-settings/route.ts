import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const whatsappConfigSchema = z.object({
  whatsappPhoneNumber: z.string().optional().nullable(),
  whatsappAccessToken: z.string().optional().nullable(),
  whatsappPhoneNumberId: z.string().optional().nullable(),
  whatsappBusinessAccountId: z.string().optional().nullable(),
  whatsappNotificationsEnabled: z.boolean().optional(),
});

export async function GET(_request: Request) {
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
        whatsappPhoneNumber: true,
        whatsappPhoneNumberId: true,
        whatsappBusinessAccountId: true,
        whatsappNotificationsEnabled: true,
        // Check if access token exists without returning it
        whatsappAccessToken: false,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Check if token exists by querying separately
    const businessWithToken = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: {
        whatsappAccessToken: true,
      },
    });

    return NextResponse.json({
      ...business,
      hasAccessToken: !!businessWithToken?.whatsappAccessToken,
    });
  } catch (error) {
    console.error("WhatsApp config fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch WhatsApp configuration" },
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

    // Only business owners can update WhatsApp configuration
    if (session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json(
        { error: "Forbidden - Only business owners can update WhatsApp configuration" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = whatsappConfigSchema.parse(body);

    // Build update data
    const updateData: any = {};

    if (validatedData.whatsappPhoneNumber !== undefined) {
      updateData.whatsappPhoneNumber = validatedData.whatsappPhoneNumber || null;
    }
    if (validatedData.whatsappAccessToken !== undefined && validatedData.whatsappAccessToken) {
      updateData.whatsappAccessToken = validatedData.whatsappAccessToken;
    }
    if (validatedData.whatsappPhoneNumberId !== undefined) {
      updateData.whatsappPhoneNumberId = validatedData.whatsappPhoneNumberId || null;
    }
    if (validatedData.whatsappBusinessAccountId !== undefined) {
      updateData.whatsappBusinessAccountId = validatedData.whatsappBusinessAccountId || null;
    }
    if (validatedData.whatsappNotificationsEnabled !== undefined) {
      updateData.whatsappNotificationsEnabled = validatedData.whatsappNotificationsEnabled;
    }

    const business = await prisma.business.update({
      where: { id: session.user.businessId },
      data: updateData,
      select: {
        id: true,
        whatsappPhoneNumber: true,
        whatsappPhoneNumberId: true,
        whatsappBusinessAccountId: true,
        whatsappNotificationsEnabled: true,
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

    console.error("WhatsApp config update error:", error);
    return NextResponse.json(
      { error: "Failed to update WhatsApp configuration" },
      { status: 500 }
    );
  }
}
