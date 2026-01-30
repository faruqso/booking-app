import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const recurringBookingSchema = z.object({
  businessId: z.string(),
  locationId: z.string().nullable().optional(),
  serviceId: z.string(),
  customerId: z.string().nullable().optional(),
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  startTime: z.string().min(1, "Start time is required"), // e.g., "14:00" or "2:00 PM"
  startDate: z.string(), // ISO date string
  endDate: z.string().nullable().optional(), // ISO date string
  numberOfOccurrences: z.number().min(1).optional(),
  notes: z.string().optional(),
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

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";

    const where: Prisma.RecurringBookingWhereInput = {
      businessId: session.user.businessId,
      ...(includeInactive ? {} : { isActive: true }),
    };

    const recurringBookings = await prisma.recurringBooking.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bookings: {
          select: {
            id: true,
            startTime: true,
            status: true,
          },
          orderBy: {
            startTime: "desc",
          },
          take: 5, // Show last 5 generated bookings
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(recurringBookings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Recurring bookings fetch error:", message);
    return NextResponse.json(
      { error: "Failed to fetch recurring bookings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = recurringBookingSchema.parse(body);

    // Verify business
    if (validatedData.businessId !== session.user.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify service exists and belongs to business
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

    // Verify location if provided
    if (validatedData.locationId) {
      const location = await prisma.location.findFirst({
        where: {
          id: validatedData.locationId,
          businessId: validatedData.businessId,
          isActive: true,
        },
      });

      if (!location) {
        return NextResponse.json(
          { error: "Location not found or inactive" },
          { status: 404 }
        );
      }
    }

    // Verify customer if provided
    if (validatedData.customerId) {
      const customer = await prisma.customer.findFirst({
        where: {
          id: validatedData.customerId,
          businessId: validatedData.businessId,
        },
      });

      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
    }

    // Validate frequency-specific fields
    if ((validatedData.frequency === "WEEKLY" || validatedData.frequency === "BIWEEKLY") && validatedData.dayOfWeek === undefined) {
      return NextResponse.json(
        { error: "dayOfWeek is required for weekly/biweekly patterns" },
        { status: 400 }
      );
    }

    if (validatedData.frequency === "MONTHLY" && validatedData.dayOfMonth === undefined) {
      return NextResponse.json(
        { error: "dayOfMonth is required for monthly patterns" },
        { status: 400 }
      );
    }

    // Parse dates
    const startDate = new Date(validatedData.startDate);
    const endDate = validatedData.endDate ? new Date(validatedData.endDate) : null;

    // Validate dates
    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid start date" },
        { status: 400 }
      );
    }

    if (endDate && isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid end date" },
        { status: 400 }
      );
    }

    if (endDate && endDate < startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Create recurring booking
    const recurringBooking = await prisma.recurringBooking.create({
      data: {
        businessId: validatedData.businessId,
        locationId: validatedData.locationId || null,
        serviceId: validatedData.serviceId,
        customerId: validatedData.customerId || null,
        customerName: validatedData.customerName,
        customerEmail: validatedData.customerEmail,
        customerPhone: validatedData.customerPhone || null,
        frequency: validatedData.frequency,
        dayOfWeek: validatedData.dayOfWeek ?? null,
        dayOfMonth: validatedData.dayOfMonth ?? null,
        startTime: validatedData.startTime,
        startDate,
        endDate,
        numberOfOccurrences: validatedData.numberOfOccurrences ?? null,
        notes: validatedData.notes || null,
        isActive: true,
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(recurringBooking, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Recurring booking creation error:", message);
    return NextResponse.json(
      { error: "Failed to create recurring booking" },
      { status: 500 }
    );
  }
}
