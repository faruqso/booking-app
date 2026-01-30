import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  timezone: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locations = await prisma.location.findMany({
      where: {
        businessId: session.user.businessId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { bookings: true, services: true },
        },
      },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Failed to fetch locations:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = locationSchema.parse(body);

    const location = await prisma.location.create({
      data: {
        businessId: session.user.businessId,
        name: validatedData.name,
        address: validatedData.address,
        phone: validatedData.phone,
        email: validatedData.email || null,
        timezone: validatedData.timezone,
        isActive: validatedData.isActive ?? true,
      },
      include: {
        _count: {
          select: { bookings: true, services: true },
        },
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to create location:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}

