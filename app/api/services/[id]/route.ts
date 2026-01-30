import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required").optional(),
  description: z.string().optional(),
  duration: z.number().min(5).max(480).optional(),
  price: z.number().min(0).optional(),
  locationId: z.string().optional().nullable(), // Phase 2: Optional location
  isActive: z.boolean().optional(),
  bufferTimeBefore: z.number().min(0).max(60).int().optional(),
  bufferTimeAfter: z.number().min(0).max(60).int().optional(),
  imageUrl: z.union([z.string().url(), z.literal("")]).optional(),
  category: z.string().max(50).optional(),
  maxCapacity: z.number().min(1).max(100).int().optional(),
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

    const service = await prisma.service.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error("Service fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch service" },
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
    const validatedData = serviceSchema.parse(body);

    // Verify service belongs to business
    const existingService = await prisma.service.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Validate location belongs to business if provided
    if (validatedData.locationId !== undefined && validatedData.locationId !== null) {
      const location = await prisma.location.findFirst({
        where: {
          id: validatedData.locationId,
          businessId: session.user.businessId,
        },
      });

      if (!location) {
        return NextResponse.json(
          { error: "Location not found or does not belong to your business" },
          { status: 400 }
        );
      }
    }

    const service = await prisma.service.update({
      where: { id: params.id },
      data: {
        ...validatedData,
        locationId: validatedData.locationId === undefined ? undefined : (validatedData.locationId || null),
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(service);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Service update error:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
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

    // Verify service belongs to business
    const existingService = await prisma.service.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
    });

    if (!existingService) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    await prisma.service.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Service deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}

