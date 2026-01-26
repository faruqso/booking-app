import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailabilityForDate, generateTimeSlots } from "@/lib/availability";
import { parseISO, startOfDay } from "date-fns";

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

    // Get business with booking rules
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: {
        bookingBufferMinutes: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Get availability
    const availability = await prisma.availability.findUnique({
      where: { businessId },
    });

    if (!availability) {
      return NextResponse.json({ slots: [] });
    }

    // Get service duration and location
    let duration = 30; // Default
    let serviceLocationId: string | null = null;
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
        select: {
          duration: true,
          locationId: true,
        },
      });
      if (service) {
        duration = service.duration;
        serviceLocationId = service.locationId;
      }
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

    const bookingWhere: any = {
      businessId,
      startTime: {
        gte: startOfDate,
        lt: endOfDate,
      },
      status: {
        not: "CANCELLED",
      },
    };

    // Phase 2: Filter bookings by location
    if (filterLocationId !== null) {
      // Only check conflicts with bookings at this location or at all locations
      bookingWhere.OR = [
        { locationId: filterLocationId },
        { locationId: null }, // All locations bookings conflict with specific location bookings
      ];
    } else {
      // Service available at all locations - only check against other "all locations" bookings
      bookingWhere.locationId = null;
    }

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
    const slots = generateTimeSlots(
      date,
      dayHours,
      duration,
      bookings.map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
      })),
      business.bookingBufferMinutes || 0
    );

    return NextResponse.json({
      slots: slots.map((slot) => slot.toISOString()),
    });
  } catch (error) {
    console.error("Slots generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate time slots" },
      { status: 500 }
    );
  }
}

