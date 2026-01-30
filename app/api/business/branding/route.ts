import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const brandingSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format. Use hex format like #3b82f6"),
  logoUrl: z.string().optional(),
  // Phase 2 Enhanced Branding - Allow empty strings or valid hex colors
  secondaryColor: z.union([
    z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format. Use hex format like #3b82f6"),
    z.literal("")
  ]).optional(),
  accentColor: z.union([
    z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format. Use hex format like #3b82f6"),
    z.literal("")
  ]).optional(),
  backgroundColor: z.union([
    z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format. Use hex format like #3b82f6"),
    z.literal("")
  ]).optional(),
  textColor: z.union([
    z.string().regex(/^#[0-9A-F]{6}$/i, "Invalid color format. Use hex format like #3b82f6"),
    z.literal("")
  ]).optional(),
  fontFamily: z.string().optional(),
  faviconUrl: z.string().optional(),
  subdomain: z.union([
    z.string().min(3, "Subdomain must be at least 3 characters").max(63, "Subdomain too long").regex(/^[a-z0-9-]+$/, "Subdomain can only contain lowercase letters, numbers, and hyphens"),
    z.literal("")
  ]).optional(),
});

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
    const validatedData = brandingSchema.parse(body);

    const updateData: {
      businessName: string;
      primaryColor: string;
      logoUrl?: string | null;
      secondaryColor?: string | null;
      accentColor?: string | null;
      backgroundColor?: string | null;
      textColor?: string | null;
      fontFamily?: string | null;
      faviconUrl?: string | null;
      subdomain?: string | null;
    } = {
      businessName: validatedData.businessName,
      primaryColor: validatedData.primaryColor,
    };

    // Handle optional fields - set to null if empty string, otherwise use value
    if (validatedData.logoUrl !== undefined) {
      updateData.logoUrl = validatedData.logoUrl || null;
    }
    if (validatedData.secondaryColor !== undefined) {
      updateData.secondaryColor = validatedData.secondaryColor || null;
    }
    if (validatedData.accentColor !== undefined) {
      updateData.accentColor = validatedData.accentColor || null;
    }
    if (validatedData.backgroundColor !== undefined) {
      updateData.backgroundColor = validatedData.backgroundColor || null;
    }
    if (validatedData.textColor !== undefined) {
      updateData.textColor = validatedData.textColor || null;
    }
    if (validatedData.fontFamily !== undefined) {
      updateData.fontFamily = validatedData.fontFamily || null;
    }
    if (validatedData.faviconUrl !== undefined) {
      updateData.faviconUrl = validatedData.faviconUrl || null;
    }
    if (validatedData.subdomain) {
      // Check if subdomain is already taken by another business
      const existingBusiness = await prisma.business.findFirst({
        where: {
          subdomain: validatedData.subdomain,
          id: { not: session.user.businessId },
        },
      });

      if (existingBusiness) {
        return NextResponse.json(
          { error: "This subdomain is already taken. Please choose another." },
          { status: 400 }
        );
      }

      updateData.subdomain = validatedData.subdomain.toLowerCase();
    }

    const business = await prisma.business.update({
      where: { id: session.user.businessId },
      data: updateData,
    });

    return NextResponse.json(business);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Branding update error:", error);
    return NextResponse.json(
      { error: "Failed to update branding" },
      { status: 500 }
    );
  }
}

export async function GET(_request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: {
        businessName: true,
        primaryColor: true,
        logoUrl: true,
        secondaryColor: true,
        accentColor: true,
        backgroundColor: true,
        textColor: true,
        fontFamily: true,
        faviconUrl: true,
        subdomain: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(business);
  } catch (error) {
    console.error("Branding fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch branding" },
      { status: 500 }
    );
  }
}

