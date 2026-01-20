import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createStripePaymentIntent } from "@/lib/payments/stripe";
import { createPaystackPayment } from "@/lib/payments/paystack";
import { createFlutterwavePayment } from "@/lib/payments/flutterwave";

export const dynamic = 'force-dynamic';

const createPaymentSchema = z.object({
  bookingId: z.string(),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("USD"),
  provider: z.enum(["stripe", "paystack", "flutterwave"]),
  redirectUrl: z.string().url().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);

    // Fetch booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: validatedData.bookingId,
        businessId: session.user.businessId,
      },
      include: {
        service: true,
        customer: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Fetch business payment configuration
    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: {
        paymentProvider: true,
        stripeSecretKey: true,
        stripePublishableKey: true,
        paystackSecretKey: true,
        paystackPublicKey: true,
        flutterwaveSecretKey: true,
        flutterwavePublicKey: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    if (business.paymentProvider !== validatedData.provider) {
      return NextResponse.json(
        { error: `Payment provider ${validatedData.provider} is not configured for this business` },
        { status: 400 }
      );
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        businessId: session.user.businessId,
        bookingId: booking.id,
        amount: validatedData.amount,
        currency: validatedData.currency,
        provider: validatedData.provider,
        status: "PENDING",
        customerEmail: booking.customerEmail,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone || null,
      },
    });

    let paymentResult: any = { success: false };

    // Create payment with selected provider
    switch (validatedData.provider) {
      case "stripe":
        if (!business.stripeSecretKey) {
          return NextResponse.json(
            { error: "Stripe is not configured" },
            { status: 400 }
          );
        }

        paymentResult = await createStripePaymentIntent(
          {
            secretKey: business.stripeSecretKey,
            publishableKey: business.stripePublishableKey || undefined,
          },
          {
            amount: validatedData.amount,
            currency: validatedData.currency,
            customerEmail: booking.customerEmail,
            customerName: booking.customerName,
            metadata: {
              bookingId: booking.id,
              paymentId: payment.id,
              businessId: session.user.businessId,
            },
          }
        );

        if (paymentResult.success) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              providerPaymentId: paymentResult.paymentIntentId,
              metadata: {
                clientSecret: paymentResult.clientSecret,
                requiresAction: paymentResult.requiresAction,
              },
            },
          });
        }
        break;

      case "paystack":
        if (!business.paystackSecretKey) {
          return NextResponse.json(
            { error: "Paystack is not configured" },
            { status: 400 }
          );
        }

        paymentResult = await createPaystackPayment(
          {
            secretKey: business.paystackSecretKey,
            publicKey: business.paystackPublicKey || undefined,
          },
          {
            amount: validatedData.amount,
            currency: validatedData.currency,
            customerEmail: booking.customerEmail,
            customerName: booking.customerName,
            reference: `ref_${payment.id}_${Date.now()}`,
            metadata: {
              bookingId: booking.id,
              paymentId: payment.id,
              businessId: session.user.businessId,
            },
          }
        );

        if (paymentResult.success) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              providerPaymentId: paymentResult.paymentReference,
              providerTransactionId: paymentResult.accessCode,
              metadata: {
                authorizationUrl: paymentResult.authorizationUrl,
              },
            },
          });
        }
        break;

      case "flutterwave":
        if (!business.flutterwaveSecretKey) {
          return NextResponse.json(
            { error: "Flutterwave is not configured" },
            { status: 400 }
          );
        }

        paymentResult = await createFlutterwavePayment(
          {
            secretKey: business.flutterwaveSecretKey,
            publicKey: business.flutterwavePublicKey || undefined,
          },
          {
            amount: validatedData.amount,
            currency: validatedData.currency,
            customerEmail: booking.customerEmail,
            customerName: booking.customerName,
            customerPhone: booking.customerPhone || undefined,
            txRef: `tx_${payment.id}_${Date.now()}`,
            redirectUrl: validatedData.redirectUrl,
            metadata: {
              bookingId: booking.id,
              paymentId: payment.id,
              businessId: session.user.businessId,
            },
          }
        );

        if (paymentResult.success) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              providerPaymentId: paymentResult.paymentReference,
              providerTransactionId: paymentResult.transactionId,
              metadata: {
                link: paymentResult.link,
              },
            },
          });
        }
        break;
    }

    if (!paymentResult.success) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: paymentResult.error || "Payment creation failed",
        },
      });

      return NextResponse.json(
        { error: paymentResult.error || "Failed to create payment" },
        { status: 400 }
      );
    }

    // Update booking with payment info
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentStatus: "PROCESSING",
        paymentProvider: validatedData.provider,
        paymentIntentId: paymentResult.paymentIntentId || paymentResult.paymentReference,
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      ...paymentResult,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Payment creation error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
