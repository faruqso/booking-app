import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

const inviteStaffSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
});

const createStaffSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only business owners can view staff
    if (session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staff = await prisma.user.findMany({
      where: {
        businessId: session.user.businessId,
        role: "STAFF",
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        emailVerified: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff" },
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

    // Only business owners can invite staff
    if (session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = inviteStaffSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Generate a temporary password (staff will need to reset it)
    const tempPassword = crypto.randomBytes(16).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create staff user
    const staff = await prisma.user.create({
      data: {
        email: validatedData.email,
        name: validatedData.name,
        password: hashedPassword,
        role: "STAFF",
        businessId: session.user.businessId,
        emailVerified: null, // Staff needs to verify email
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    // TODO: Send invitation email with password reset link
    // For now, return success - in production, send email with reset link

    return NextResponse.json(
      { 
        staff,
        message: "Staff member invited. They will receive an email to set their password.",
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
    console.error("Failed to invite staff:", error);
    return NextResponse.json(
      { error: "Failed to invite staff" },
      { status: 500 }
    );
  }
}

