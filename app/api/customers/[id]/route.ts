import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const updateCustomerSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  name: z.string().min(1, "Name is required").optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
      include: {
        bookings: {
          include: {
            service: true,
          },
          orderBy: { startTime: "desc" },
          take: 50, // Latest 50 bookings
        },
        _count: {
          select: { bookings: true },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Failed to fetch customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
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

    const body = await request.json();
    const validatedData = updateCustomerSchema.parse(body);

    // Verify customer belongs to business
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check email uniqueness if email is being updated
    if (validatedData.email && validatedData.email !== existingCustomer.email) {
      const emailTaken = await prisma.customer.findUnique({
        where: {
          businessId_email: {
            businessId: session.user.businessId,
            email: validatedData.email,
          },
        },
      });

      if (emailTaken) {
        return NextResponse.json(
          { error: "A customer with this email already exists" },
          { status: 400 }
        );
      }
    }

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    });

    return NextResponse.json(customer);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    console.error("Failed to update customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify customer belongs to business
    const customer = await prisma.customer.findFirst({
      where: {
        id: params.id,
        businessId: session.user.businessId,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    await prisma.customer.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}

