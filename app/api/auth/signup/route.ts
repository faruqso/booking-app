import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const signupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  businessName: z.string().min(1, "Business name is required"),
  businessEmail: z.string().email("Invalid business email address"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = signupSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Create business and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create business
      const business = await tx.business.create({
        data: {
          name: validatedData.businessName,
          email: validatedData.businessEmail,
          businessName: validatedData.businessName,
          primaryColor: "#3b82f6", // Default blue
          // Create default availability (Mon-Fri 9-5)
          availability: {
            create: {
              monday: { open: "09:00", close: "17:00", isOpen: true },
              tuesday: { open: "09:00", close: "17:00", isOpen: true },
              wednesday: { open: "09:00", close: "17:00", isOpen: true },
              thursday: { open: "09:00", close: "17:00", isOpen: true },
              friday: { open: "09:00", close: "17:00", isOpen: true },
              saturday: { open: "09:00", close: "17:00", isOpen: false },
              sunday: { open: "09:00", close: "17:00", isOpen: false },
            },
          },
        },
      });

      // Create user
      const user = await tx.user.create({
        data: {
          name: validatedData.name,
          email: validatedData.email,
          password: hashedPassword,
          role: "BUSINESS_OWNER",
          businessId: business.id,
        },
      });

      return { user, business };
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        userId: result.user.id,
        businessId: result.business.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}

