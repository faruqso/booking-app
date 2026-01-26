import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

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
      currency: business.currency || "USD",
      requirePaymentDeposit: business.requirePaymentDeposit || false,
      depositPercentage: business.depositPercentage,
      paymentProvider: business.paymentProvider,
      services: business.services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: service.price,
        locationId: service.locationId,
        imageUrl: service.imageUrl,
        category: service.category,
        maxCapacity: service.maxCapacity,
        bufferTimeBefore: service.bufferTimeBefore,
        bufferTimeAfter: service.bufferTimeAfter,
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

