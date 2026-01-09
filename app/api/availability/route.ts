import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

interface DayHours {
  open: string;
  close: string;
  isOpen: boolean;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const availability = await prisma.availability.findUnique({
      where: { businessId: session.user.businessId },
    });

    if (!availability) {
      return NextResponse.json(
        { error: "Availability not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Availability fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { monday, tuesday, wednesday, thursday, friday, saturday, sunday } = body;

    const availability = await prisma.availability.upsert({
      where: { businessId: session.user.businessId },
      update: {
        monday: monday || null,
        tuesday: tuesday || null,
        wednesday: wednesday || null,
        thursday: thursday || null,
        friday: friday || null,
        saturday: saturday || null,
        sunday: sunday || null,
      },
      create: {
        businessId: session.user.businessId,
        monday: monday || null,
        tuesday: tuesday || null,
        wednesday: wednesday || null,
        thursday: thursday || null,
        friday: friday || null,
        saturday: saturday || null,
        sunday: sunday || null,
      },
    });

    return NextResponse.json(availability);
  } catch (error) {
    console.error("Availability update error:", error);
    return NextResponse.json(
      { error: "Failed to update availability" },
      { status: 500 }
    );
  }
}

