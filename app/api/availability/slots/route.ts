import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAvailabilityForDate, generateTimeSlots } from "@/lib/availability";
import { addMinutes, isBefore, isSameDay, parseISO, startOfDay } from "date-fns";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const dateStr = searchParams.get("date");
    const serviceId = searchParams.get("serviceId");
    const locationId = searchParams.get("locationId"); // Phase 2: Optional location filter

    if (!businessId || !dateStr) {
      return NextResponse.json(
        { error: "businessId and date are required" },
        { status: 400 }
      );
    }

    const date = startOfDay(parseISO(dateStr));

    // Load business, availability, and service (when serviceId) in parallel
    const [business, availability, service] = await Promise.all([
      prisma.business.findUnique({
        where: { id: businessId },
        select: {
          bookingBufferMinutes: true,
          minimumAdvanceBookingHours: true,
        },
      }),
      prisma.availability.findUnique({
        where: { businessId },
      }),
      serviceId
        ? prisma.service.findUnique({
            where: { id: serviceId },
            select: { duration: true, locationId: true },
          })
        : Promise.resolve(null),
    ]);

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    if (!availability) {
      return NextResponse.json({ slots: [] });
    }

    let duration = 30;
    let serviceLocationId: string | null = null;
    if (service) {
      duration = service.duration;
      serviceLocationId = service.locationId;
    }

    // Determine which location to filter by
    // Priority: 1. Explicit locationId param, 2. Service's locationId, 3. null (all locations)
    const filterLocationId = locationId !== null ? locationId : serviceLocationId;

    // Get day hours
    const dayHours = getAvailabilityForDate(availability, date);

    // Get existing bookings for this date, filtered by location
    const startOfDate = startOfDay(date);
    const endOfDate = new Date(startOfDate);
    endOfDate.setDate(endOfDate.getDate() + 1);

    const bookingWhere: Prisma.BookingWhereInput = {
      businessId,
      startTime: {
        gte: startOfDate,
        lt: endOfDate,
      },
      status: {
        not: "CANCELLED",
      },
      ...(filterLocationId !== null
        ? {
            OR: [
              { locationId: filterLocationId },
              { locationId: null },
            ],
          }
        : { locationId: null }),
    };

    const bookings = await prisma.booking.findMany({
      where: bookingWhere,
      select: {
        startTime: true,
        endTime: true,
      },
      // Add index hint for better performance
      orderBy: {
        startTime: 'asc',
      },
    });

    // Generate time slots with buffer time
    let slots = generateTimeSlots(
      date,
      dayHours,
      duration,
      bookings.map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
      })),
      business.bookingBufferMinutes || 0
    );

    // Never show past times: when the selected date is today, filter out any slot
    // that is in the past or within minimum advance booking time
    const now = new Date();
    if (isSameDay(date, now)) {
      const minHours = business.minimumAdvanceBookingHours ?? 0;
      const earliestAllowed = addMinutes(now, minHours * 60);
      slots = slots.filter((slot) => !isBefore(slot, earliestAllowed));
    }

    return NextResponse.json({
      slots: slots.map((slot) => slot.toISOString()),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Slots generation error:", message);
    return NextResponse.json(
      { error: "Failed to generate time slots" },
      { status: 500 }
    );
  }
}

