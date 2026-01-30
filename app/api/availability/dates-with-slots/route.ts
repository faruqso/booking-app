import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAvailabilityForDate, generateTimeSlots } from "@/lib/availability";
import { addMinutes, addDays, isBefore, isSameDay, parseISO, startOfDay, format } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");
    const fromStr = searchParams.get("from");
    const toStr = searchParams.get("to");
    const serviceId = searchParams.get("serviceId");
    const locationId = searchParams.get("locationId");

    if (!businessId || !fromStr || !toStr || !serviceId) {
      return NextResponse.json(
        { error: "businessId, serviceId, from, and to are required" },
        { status: 400 }
      );
    }

    const fromDate = startOfDay(parseISO(fromStr));
    const toDate = startOfDay(parseISO(toStr));
    if (fromDate > toDate) {
      return NextResponse.json(
        { error: "from must be before or equal to to" },
        { status: 400 }
      );
    }

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
      prisma.service.findUnique({
        where: { id: serviceId },
        select: { duration: true, locationId: true },
      }),
    ]);

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }
    if (!availability) {
      return NextResponse.json({ datesWithSlots: [] });
    }

    const duration = service?.duration ?? 30;
    const filterLocationId =
      locationId !== undefined && locationId !== null
        ? locationId
        : service?.locationId ?? null;

    const rangeStart = fromDate;
    const rangeEnd = addDays(toDate, 1);

    const bookingWhere: Prisma.BookingWhereInput = {
      businessId,
      startTime: {
        gte: rangeStart,
        lt: rangeEnd,
      },
      status: { not: "CANCELLED" },
      ...(filterLocationId !== null
        ? {
            OR: [
              { locationId: filterLocationId },
              { locationId: null },
            ],
          }
        : { locationId: null }),
    };

    const allBookings = await prisma.booking.findMany({
      where: bookingWhere,
      select: { startTime: true, endTime: true },
      orderBy: { startTime: "asc" },
    });

    const now = new Date();
    const datesWithSlots: string[] = [];
    const numDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;

    for (let i = 0; i < numDays; i++) {
      const date = startOfDay(addDays(fromDate, i));
      if (date > toDate) break;
      const dayHours = getAvailabilityForDate(availability, date);
      const startOfDate = date;
      const endOfDate = addDays(startOfDate, 1);
      const dayBookings = allBookings.filter(
        (b) =>
          b.startTime >= startOfDate &&
          b.startTime < endOfDate
      );

      let slots = generateTimeSlots(
        date,
        dayHours,
        duration,
        dayBookings.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
        business.bookingBufferMinutes ?? 0
      );

      if (isSameDay(date, now)) {
        const minHours = business.minimumAdvanceBookingHours ?? 0;
        const earliestAllowed = addMinutes(now, minHours * 60);
        slots = slots.filter((slot) => !isBefore(slot, earliestAllowed));
      }

      if (slots.length > 0) {
        datesWithSlots.push(format(date, "yyyy-MM-dd"));
      }
    }

    return NextResponse.json({ datesWithSlots });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Dates with slots error:", message);
    return NextResponse.json(
      { error: "Failed to get dates with slots" },
      { status: 500 }
    );
  }
}
