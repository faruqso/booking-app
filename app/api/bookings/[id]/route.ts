import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subHours, isBefore } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
      include: {
        service: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Booking fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Verify booking belongs to business
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
      include: {
        service: true,
        business: true,
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Phase 2: Enforce cancellation policy
    if (status === "CANCELLED" && existingBooking.status !== "CANCELLED") {
      const cancellationPolicyHours = existingBooking.business.cancellationPolicyHours || 0;
      
      if (cancellationPolicyHours > 0) {
        const cancellationDeadline = subHours(existingBooking.startTime, cancellationPolicyHours);
        const now = new Date();
        
        if (isBefore(now, cancellationDeadline)) {
          // Still within cancellation window, allow cancellation
        } else {
          // Past cancellation deadline
          return NextResponse.json(
            { 
              error: `This booking cannot be cancelled. Cancellation must be made at least ${cancellationPolicyHours} hours before the appointment. Please contact the business directly.`,
              cancellationDeadline: cancellationDeadline.toISOString(),
            },
            { status: 400 }
          );
        }
      }
      // If cancellationPolicyHours is 0, cancellation is always allowed
    }

    const booking = await prisma.booking.update({
      where: { id: params.id },
      data: { status },
      include: {
        service: true,
        business: true,
      },
    });

    // Send cancellation email if status changed to CANCELLED
    if (status === "CANCELLED" && existingBooking.status !== "CANCELLED") {
      try {
        const { sendBookingCancellationEmail } = await import("@/lib/email");
        await sendBookingCancellationEmail(existingBooking.customerEmail, {
          customerName: existingBooking.customerName,
          serviceName: existingBooking.service.name,
          startTime: existingBooking.startTime,
          businessName: existingBooking.business.businessName,
          businessLogoUrl: existingBooking.business.logoUrl,
          primaryColor: existingBooking.business.primaryColor,
        });
      } catch (emailError) {
        console.error("Failed to send cancellation email:", emailError);
      }
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Booking update error:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}

