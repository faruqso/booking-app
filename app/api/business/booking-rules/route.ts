import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const bookingRulesSchema = z.object({
  minimumAdvanceBookingHours: z.number().int().min(0).max(168), // 0 to 7 days
  cancellationPolicyHours: z.number().int().min(0).max(720), // 0 to 30 days
  bookingBufferMinutes: z.number().int().min(0).max(120), // 0 to 2 hours
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
        minimumAdvanceBookingHours: true,
        cancellationPolicyHours: true,
        bookingBufferMinutes: true,
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
    console.error("Booking rules fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking rules" },
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

    const body = await request.json();
    const validatedData = bookingRulesSchema.parse(body);

    const business = await prisma.business.update({
      where: { id: session.user.businessId },
      data: validatedData,
      select: {
        minimumAdvanceBookingHours: true,
        cancellationPolicyHours: true,
        bookingBufferMinutes: true,
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

    console.error("Booking rules update error:", error);
    return NextResponse.json(
      { error: "Failed to update booking rules" },
      { status: 500 }
    );
  }
}

