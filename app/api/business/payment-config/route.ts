import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getCurrenciesForProvider } from "@/lib/utils/currency";

export const dynamic = 'force-dynamic';

const paymentConfigSchema = z.object({
  paymentProvider: z.enum(["stripe", "paystack", "flutterwave"]).nullable().optional(),
  currency: z.string().min(3).max(3).optional().or(z.literal("")), // ISO 4217 currency code (USD, NGN, GHS, etc.)
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
        id: true,
        paymentProvider: true,
        currency: true,
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

    // Test database connection first
    try {
      await prisma.$connect();
    } catch (dbError: any) {
      console.error("Database connection failed:", dbError);
      return NextResponse.json(
        { 
          error: "Database connection failed. Your Neon database may be paused. Please check your Neon dashboard and ensure the database is active.",
          details: process.env.NODE_ENV === "development" ? dbError.message : undefined
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const validatedData = paymentConfigSchema.parse(body);

    // Build update data
    const updateData: any = {};

    if (validatedData.paymentProvider !== undefined) {
      updateData.paymentProvider = validatedData.paymentProvider;
    }
    if (validatedData.currency !== undefined) {
      // Only update currency if it's a valid 3-character code, otherwise use default
      const currency = validatedData.currency && validatedData.currency.length === 3 
        ? validatedData.currency 
        : "USD";
      
      // Validate currency is supported by the payment provider
      if (validatedData.paymentProvider) {
        const supportedCurrencies = getCurrenciesForProvider(validatedData.paymentProvider);
        const isSupported = supportedCurrencies.some(c => c.code === currency);
        
        if (!isSupported) {
          const supportedCodes = supportedCurrencies.map(c => c.code).join(", ");
          return NextResponse.json(
            { 
              error: `Currency ${currency} is not supported by ${validatedData.paymentProvider}. Supported currencies: ${supportedCodes}` 
            },
            { status: 400 }
          );
        }
      }
      
      updateData.currency = currency;
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
        currency: true,
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
      console.error("Payment config validation error:", error.errors);
      return NextResponse.json(
        { error: error.errors[0].message, details: error.errors },
        { status: 400 }
      );
    }

    console.error("Payment config update error:", error);
    console.error("Error stack:", error.stack);
    
    // Check if it's a database connection error
    if (error.message?.includes("Can't reach database server") || 
        error.message?.includes("connect ECONNREFUSED") ||
        error.code === "P1001") {
      return NextResponse.json(
        { 
          error: "Database connection failed. Your Neon database may be paused. Please check your Neon dashboard and ensure the database is active, then try again.",
          code: "DATABASE_CONNECTION_ERROR"
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || "Failed to update payment configuration" },
      { status: 500 }
    );
  }
}
