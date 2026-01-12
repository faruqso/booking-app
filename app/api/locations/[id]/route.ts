import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const updateLocationSchema = z.object({
  name: z.string().min(1, "Location name is required").optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  timezone: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const location = await prisma.location.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
      include: {
        _count: {
          select: { bookings: true, services: true },
        },
        availability: true,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error("Failed to fetch location:", error);
    return NextResponse.json(
      { error: "Failed to fetch location" },
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateLocationSchema.parse(body);

    // Verify location belongs to business
    const existingLocation = await prisma.location.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
    });

    if (!existingLocation) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const updateData: {
      name?: string;
      address?: string | null;
      phone?: string | null;
      email?: string | null;
      timezone?: string | null;
      isActive?: boolean;
    } = {};

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.address !== undefined) updateData.address = validatedData.address || null;
    if (validatedData.phone !== undefined) updateData.phone = validatedData.phone || null;
    if (validatedData.email !== undefined) updateData.email = validatedData.email || null;
    if (validatedData.timezone !== undefined) updateData.timezone = validatedData.timezone || null;
    if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;

    const location = await prisma.location.update({
      where: { id: params.id },
      data: updateData,
      include: {
        _count: {
          select: { bookings: true, services: true },
        },
      },
    });

    return NextResponse.json(location);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update location:", error);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify location belongs to business
    const location = await prisma.location.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
      include: {
        _count: {
          select: { bookings: true, services: true },
        },
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Check if location has bookings or services
    if (location._count.bookings > 0 || location._count.services > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete location with existing bookings or services. Please remove all bookings and services first.",
          hasBookings: location._count.bookings > 0,
          hasServices: location._count.services > 0,
        },
        { status: 400 }
      );
    }

    await prisma.location.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete location:", error);
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    );
  }
}

