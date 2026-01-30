import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const updateRecurringBookingSchema = z.object({
  locationId: z.string().nullable().optional(),
  serviceId: z.string().optional(),
  customerId: z.string().nullable().optional(),
  customerName: z.string().min(1).optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]).optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
  startTime: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  numberOfOccurrences: z.number().min(1).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _request: Request,
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

    const recurringBooking = await prisma.recurringBooking.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
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
        bookings: {
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
          },
          orderBy: {
            startTime: "desc",
          },
        },
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!recurringBooking) {
      return NextResponse.json(
        { error: "Recurring booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(recurringBooking);
  } catch (error) {
    console.error("Recurring booking fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch recurring booking" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    const validatedData = updateRecurringBookingSchema.parse(body);

    // Verify recurring booking belongs to business
    const existing = await prisma.recurringBooking.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring booking not found" },
        { status: 404 }
      );
    }

    // Validate service if updated
    if (validatedData.serviceId) {
      const service = await prisma.service.findFirst({
        where: {
          id: validatedData.serviceId,
          businessId: session.user.businessId,
          isActive: true,
        },
      });

      if (!service) {
        return NextResponse.json(
          { error: "Service not found or inactive" },
          { status: 404 }
        );
      }
    }

    // Validate location if updated
    if (validatedData.locationId !== undefined && validatedData.locationId !== null) {
      const location = await prisma.location.findFirst({
        where: {
          id: validatedData.locationId,
          businessId: session.user.businessId,
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

    const updateData: Prisma.RecurringBookingUncheckedUpdateInput = {
      ...validatedData,
    };

    // Handle date conversions
    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate);
      if (isNaN(updateData.startDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid start date" },
          { status: 400 }
        );
      }
    }

    if (validatedData.endDate !== undefined) {
      if (validatedData.endDate === null) {
        updateData.endDate = null;
      } else {
        updateData.endDate = new Date(validatedData.endDate);
        if (isNaN(updateData.endDate.getTime())) {
          return NextResponse.json(
            { error: "Invalid end date" },
            { status: 400 }
          );
        }
      }
    }

    // Clean up null values for optional fields
    if (validatedData.locationId === undefined) delete updateData.locationId;
    if (validatedData.customerId === undefined) delete updateData.customerId;
    if (validatedData.dayOfWeek === undefined) delete updateData.dayOfWeek;
    if (validatedData.dayOfMonth === undefined) delete updateData.dayOfMonth;
    if (validatedData.numberOfOccurrences === undefined) delete updateData.numberOfOccurrences;
    if (validatedData.notes === undefined) delete updateData.notes;

    // Handle locationId = null conversion
    if (validatedData.locationId === null) {
      updateData.locationId = null;
    }

    // Handle customerId = null conversion
    if (validatedData.customerId === null) {
      updateData.customerId = null;
    }

    const recurringBooking = await prisma.recurringBooking.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(recurringBooking);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Recurring booking update error:", message);
    return NextResponse.json(
      { error: "Failed to update recurring booking" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
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

    // Verify recurring booking belongs to business
    const existing = await prisma.recurringBooking.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Recurring booking not found" },
        { status: 404 }
      );
    }

    // Soft delete: Set isActive to false instead of deleting
    // This preserves history and allows reactivation
    await prisma.recurringBooking.update({
      where: { id: params.id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Recurring booking cancelled successfully" });
  } catch (error) {
    console.error("Recurring booking deletion error:", error);
    return NextResponse.json(
      { error: "Failed to cancel recurring booking" },
      { status: 500 }
    );
  }
}
