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

    if (!businessId || !dateStr) {
      return NextResponse.json(
        { error: "businessId and date are required" },
        { status: 400 }
      );
    }

    const date = startOfDay(parseISO(dateStr));

    // Get availability
    const availability = await prisma.availability.findUnique({
      where: { businessId },
    });

    if (!availability) {
      return NextResponse.json({ slots: [] });
    }

    // Get service duration
    let duration = 30; // Default
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });
      if (service) {
        duration = service.duration;
      }
    }

    // Get day hours
    const dayHours = getAvailabilityForDate(availability, date);

    // Get existing bookings for this date
    const startOfDate = startOfDay(date);
    const endOfDate = new Date(startOfDate);
    endOfDate.setDate(endOfDate.getDate() + 1);

    const bookings = await prisma.booking.findMany({
      where: {
        businessId,
        startTime: {
          gte: startOfDate,
          lt: endOfDate,
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

    // Generate time slots
    const slots = generateTimeSlots(
      date,
      dayHours,
      duration,
      bookings.map((b) => ({
        startTime: b.startTime,
        endTime: b.endTime,
      }))
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

