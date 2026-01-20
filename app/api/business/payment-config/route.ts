import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const paymentConfigSchema = z.object({
  paymentProvider: z.enum(["stripe", "paystack", "flutterwave"]).nullable().optional(),
  stripePublishableKey: z.string().optional().nullable(),
  stripeSecretKey: z.string().optional().nullable(),
  stripeWebhookSecret: z.string().optional().nullable(),
  paystackPublicKey: z.string().optional().nullable(),
  paystackSecretKey: z.string().optional().nullable(),
  paystackWebhookSecret: z.string().optional().nullable(),
  flutterwavePublicKey: z.string().optional().nullable(),
  flutterwaveSecretKey: z.string().optional().nullable(),
  flutterwaveWebhookSecret: z.string().optional().nullable(),
  requirePaymentDeposit: z.boolean().optional(),
  depositPercentage: z.number().min(0).max(100).optional().nullable(),
});

export async function GET(request: Request) {
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
        id: true,
        paymentProvider: true,
        stripePublishableKey: true,
        paystackPublicKey: true,
        flutterwavePublicKey: true,
        requirePaymentDeposit: true,
        depositPercentage: true,
        // Don't return secret keys in GET request for security
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
    console.error("Payment config fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment configuration" },
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

    // Only business owners can update payment configuration
    if (session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json(
        { error: "Forbidden - Only business owners can update payment configuration" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = paymentConfigSchema.parse(body);

    // Build update data
    const updateData: any = {};

    if (validatedData.paymentProvider !== undefined) {
      updateData.paymentProvider = validatedData.paymentProvider;
    }

    // Only update keys if provided (don't clear if not provided)
    if (validatedData.stripePublishableKey !== undefined) {
      updateData.stripePublishableKey = validatedData.stripePublishableKey || null;
    }
    if (validatedData.stripeSecretKey !== undefined && validatedData.stripeSecretKey) {
      updateData.stripeSecretKey = validatedData.stripeSecretKey;
    }
    if (validatedData.stripeWebhookSecret !== undefined && validatedData.stripeWebhookSecret) {
      updateData.stripeWebhookSecret = validatedData.stripeWebhookSecret;
    }

    if (validatedData.paystackPublicKey !== undefined) {
      updateData.paystackPublicKey = validatedData.paystackPublicKey || null;
    }
    if (validatedData.paystackSecretKey !== undefined && validatedData.paystackSecretKey) {
      updateData.paystackSecretKey = validatedData.paystackSecretKey;
    }
    if (validatedData.paystackWebhookSecret !== undefined && validatedData.paystackWebhookSecret) {
      updateData.paystackWebhookSecret = validatedData.paystackWebhookSecret;
    }

    if (validatedData.flutterwavePublicKey !== undefined) {
      updateData.flutterwavePublicKey = validatedData.flutterwavePublicKey || null;
    }
    if (validatedData.flutterwaveSecretKey !== undefined && validatedData.flutterwaveSecretKey) {
      updateData.flutterwaveSecretKey = validatedData.flutterwaveSecretKey;
    }
    if (validatedData.flutterwaveWebhookSecret !== undefined && validatedData.flutterwaveWebhookSecret) {
      updateData.flutterwaveWebhookSecret = validatedData.flutterwaveWebhookSecret;
    }

    if (validatedData.requirePaymentDeposit !== undefined) {
      updateData.requirePaymentDeposit = validatedData.requirePaymentDeposit;
    }
    if (validatedData.depositPercentage !== undefined) {
      updateData.depositPercentage = validatedData.depositPercentage || null;
    }

    const business = await prisma.business.update({
      where: { id: session.user.businessId },
      data: updateData,
      select: {
        id: true,
        paymentProvider: true,
        stripePublishableKey: true,
        paystackPublicKey: true,
        flutterwavePublicKey: true,
        requirePaymentDeposit: true,
        depositPercentage: true,
      },
    });

    return NextResponse.json(business);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Payment config update error:", error);
    return NextResponse.json(
      { error: "Failed to update payment configuration" },
      { status: 500 }
    );
  }
}
