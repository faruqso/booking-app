import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const serviceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  description: z.string().optional(),
  duration: z.number().min(5, "Duration must be at least 5 minutes").max(480, "Duration cannot exceed 8 hours"),
  price: z.number().min(0, "Price cannot be negative"),
  locationId: z.string().optional().nullable(), // Phase 2: Optional location (null = all locations)
  isActive: z.boolean().optional().default(true),
  bufferTimeBefore: z.number().min(0).max(60).int().optional().default(0),
  bufferTimeAfter: z.number().min(0).max(60).int().optional().default(0),
  imageUrl: z.union([z.string().url(), z.literal("")]).optional(),
  category: z.string().max(50).optional(),
  maxCapacity: z.number().min(1).max(100).int().optional().default(1),
});

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const services = await prisma.service.findMany({
      where: { businessId: session.user.businessId },
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error("Services fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
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
    const validatedData = serviceSchema.parse(body);

    // Validate location belongs to business if provided
    if (validatedData.locationId) {
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

    const service = await prisma.service.create({
      data: {
        ...validatedData,
        businessId: session.user.businessId,
        price: validatedData.price,
        locationId: validatedData.locationId || null,
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

    return NextResponse.json(service, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Service creation error:", error);
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}

