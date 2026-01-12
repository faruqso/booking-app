import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseISO, addMinutes, isBefore, startOfDay } from "date-fns";
import { getAvailabilityForDate, generateTimeSlots } from "@/lib/availability";
import { detectConflictWithAlternatives, formatAlternativeSlots } from "@/lib/ai/conflict-detection";

export const dynamic = 'force-dynamic';

const bookingSchema = z.object({
  businessId: z.string(),
  serviceId: z.string(),
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().optional(),
  startTime: z.string(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = bookingSchema.parse(body);

    // Verify business and service exist
    const business = await prisma.business.findUnique({
      where: { id: validatedData.businessId },
      include: {
        availability: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const service = await prisma.service.findFirst({
      where: {
        id: validatedData.serviceId,
        businessId: validatedData.businessId,
        isActive: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found or inactive" },
        { status: 404 }
      );
    }

    // Parse and validate date/time
    const startTime = parseISO(validatedData.startTime);
    const endTime = addMinutes(startTime, service.duration);
    const now = new Date();

    // Check if time is in the past
    if (isBefore(startTime, now)) {
      return NextResponse.json(
        { error: "Cannot book in the past" },
        { status: 400 }
      );
    }

    // Check minimum advance booking time
    const minimumAdvanceTime = addMinutes(now, business.minimumAdvanceBookingHours * 60);
    if (isBefore(startTime, minimumAdvanceTime)) {
      const hours = business.minimumAdvanceBookingHours;
      return NextResponse.json(
        { error: `Bookings must be made at least ${hours} hour${hours !== 1 ? 's' : ''} in advance` },
        { status: 400 }
      );
    }

    // Check availability
    if (!business.availability) {
      return NextResponse.json(
        { error: "Business has no availability set" },
        { status: 400 }
      );
    }

    const date = startOfDay(startTime);
    const dayHours = getAvailabilityForDate(business.availability, date);

    if (!dayHours || !dayHours.isOpen) {
      return NextResponse.json(
        { error: "Business is closed on this day" },
        { status: 400 }
      );
    }

    // Check for conflicts with intelligent alternatives
    const existingBookings = await prisma.booking.findMany({
      where: {
        businessId: validatedData.businessId,
        startTime: {
          gte: date,
          lt: addMinutes(date, 24 * 60),
        },
        status: {
          not: "CANCELLED",
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const conflictResult = detectConflictWithAlternatives(
      { startTime, endTime },
      service.duration,
      existingBookings.map(b => ({ startTime: b.startTime, endTime: b.endTime })),
      dayHours
    );

    if (conflictResult.hasConflict) {
      // Return conflict with alternative suggestions
      const alternatives = conflictResult.alternativeSlots
        ? formatAlternativeSlots(conflictResult.alternativeSlots)
        : [];

      return NextResponse.json(
        {
          error: "This time slot is no longer available",
          conflict: true,
          alternatives: alternatives,
        },
        { status: 400 }
      );
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        businessId: validatedData.businessId,
        serviceId: validatedData.serviceId,
        customerName: validatedData.customerName,
        customerEmail: validatedData.customerEmail,
        customerPhone: validatedData.customerPhone,
        startTime,
        endTime,
        notes: validatedData.notes,
        status: "PENDING",
      },
      include: {
        service: true,
        business: true,
      },
    });

    // Send confirmation email (don't block on error)
    try {
      const { sendBookingConfirmationEmail } = await import("@/lib/email");
      await sendBookingConfirmationEmail(validatedData.customerEmail, {
        id: booking.id,
        customerName: booking.customerName,
        serviceName: booking.service.name,
        startTime: booking.startTime,
        businessName: business.businessName,
        businessLogoUrl: business.logoUrl,
        primaryColor: business.primaryColor,
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the booking creation if email fails
    }

    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Booking creation error:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    const where: any = {
      businessId: session.user.businessId,
    };

    if (status) {
      where.status = status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        service: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Bookings fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
