import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const localizationSchema = z.object({
  timezone: z.string().min(1),
  dateFormat: z.enum(["MMM d, yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "MMMM d, yyyy", "d MMM yyyy"]),
  timeFormat: z.enum(["h:mm a", "HH:mm"]),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business = await prisma.business.findUnique({
      where: { ownerId: session.user.id },
      select: {
        timezone: true,
        dateFormat: true,
        timeFormat: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({
      timezone: business.timezone || "UTC",
      dateFormat: business.dateFormat || "MMM d, yyyy",
      timeFormat: business.timeFormat || "h:mm a",
    });
  } catch (error: any) {
    console.error("Failed to fetch localization settings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch localization settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = localizationSchema.parse(body);

    const business = await prisma.business.update({
      where: { ownerId: session.user.id },
      data: {
        timezone: validatedData.timezone,
        dateFormat: validatedData.dateFormat,
        timeFormat: validatedData.timeFormat,
      },
      select: {
        timezone: true,
        dateFormat: true,
        timeFormat: true,
      },
    });

    return NextResponse.json({
      timezone: business.timezone,
      dateFormat: business.dateFormat,
      timeFormat: business.timeFormat,
    });
  } catch (error: any) {
    console.error("Failed to update localization settings:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to update localization settings" },
      { status: 500 }
    );
  }
}
