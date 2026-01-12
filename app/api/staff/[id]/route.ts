import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const updateStaffSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Invalid email address").optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only business owners can view staff details
    if (session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const staff = await prisma.user.findFirst({
      where: {
        id: params.id,
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
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(staff);
  } catch (error) {
    console.error("Failed to fetch staff member:", error);
    return NextResponse.json(
      { error: "Failed to fetch staff member" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only business owners can update staff
    if (session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateStaffSchema.parse(body);

    // Verify staff belongs to business
    const existingStaff = await prisma.user.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
        role: "STAFF",
      },
    });

    if (!existingStaff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    // Check email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== existingStaff.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: validatedData.email },
      });

      if (emailTaken) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 400 }
        );
      }
    }

    const staff = await prisma.user.update({
      where: { id: params.id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        emailVerified: true,
      },
    });

    return NextResponse.json(staff);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update staff:", error);
    return NextResponse.json(
      { error: "Failed to update staff" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only business owners can remove staff
    if (session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prevent deleting yourself
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      );
    }

    // Verify staff belongs to business
    const staff = await prisma.user.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
        role: "STAFF",
      },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff member not found" },
        { status: 404 }
      );
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete staff:", error);
    return NextResponse.json(
      { error: "Failed to delete staff" },
      { status: 500 }
    );
  }
}

