import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const business = await prisma.business.findUnique({
      where: { id: params.id },
      include: {
        services: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Return public business data (no sensitive info)
    return NextResponse.json({
      id: business.id,
      name: business.businessName,
      businessName: business.businessName,
      primaryColor: business.primaryColor,
      logoUrl: business.logoUrl,
      services: business.services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: service.price,
      })),
    });
  } catch (error) {
    console.error("Business fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch business" },
      { status: 500 }
    );
  }
}

