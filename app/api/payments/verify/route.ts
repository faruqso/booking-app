import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { confirmStripePaymentIntent } from "@/lib/payments/stripe";
import { verifyPaystackPayment } from "@/lib/payments/paystack";
import { verifyFlutterwavePayment } from "@/lib/payments/flutterwave";

export const dynamic = 'force-dynamic';

const verifyPaymentSchema = z.object({
  paymentId: z.string(),
  providerReference: z.string().optional(), // For Paystack/Flutterwave reference verification
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
    const validatedData = verifyPaymentSchema.parse(body);

    // Fetch payment
    const payment = await prisma.payment.findFirst({
      where: {
        id: validatedData.paymentId,
        businessId: session.user.businessId,
      },
      include: {
        booking: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      );
    }

    // Fetch business payment configuration
    const business = await prisma.business.findUnique({
      where: { id: session.user.businessId },
      select: {
        stripeSecretKey: true,
        paystackSecretKey: true,
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

    let verificationResult: any = { success: false };

    // Verify payment with provider
    switch (payment.provider) {
      case "stripe":
        if (!business.stripeSecretKey || !payment.providerPaymentId) {
          return NextResponse.json(
            { error: "Stripe payment ID not found" },
            { status: 400 }
          );
        }

        verificationResult = await confirmStripePaymentIntent(
          business.stripeSecretKey,
          payment.providerPaymentId
        );
        break;

      case "paystack":
        if (!business.paystackSecretKey) {
          return NextResponse.json(
            { error: "Paystack is not configured" },
            { status: 400 }
          );
        }

        const paystackReference =
          validatedData.providerReference || payment.providerPaymentId;
        if (!paystackReference) {
          return NextResponse.json(
            { error: "Paystack reference not found" },
            { status: 400 }
          );
        }

        verificationResult = await verifyPaystackPayment(
          business.paystackSecretKey,
          paystackReference
        );
        break;

      case "flutterwave":
        if (!business.flutterwaveSecretKey || !business.flutterwavePublicKey) {
          return NextResponse.json(
            { error: "Flutterwave is not configured" },
            { status: 400 }
          );
        }

        const flutterwaveId =
          validatedData.providerReference ||
          payment.providerTransactionId ||
          payment.providerPaymentId;
        if (!flutterwaveId) {
          return NextResponse.json(
            { error: "Flutterwave transaction ID not found" },
            { status: 400 }
          );
        }

        verificationResult = await verifyFlutterwavePayment(
          business.flutterwaveSecretKey,
          business.flutterwavePublicKey,
          flutterwaveId
        );
        break;

      default:
        return NextResponse.json(
          { error: "Invalid payment provider" },
          { status: 400 }
        );
    }

    if (verificationResult.success) {
      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          metadata: {
            ...((payment.metadata as any) || {}),
            verifiedAt: new Date().toISOString(),
          },
        },
      });

      // Update booking payment status
      if (payment.booking) {
        await prisma.booking.update({
          where: { id: payment.booking.id },
          data: {
            paymentStatus: "COMPLETED",
            amountPaid: payment.amount,
            // Automatically confirm booking when payment is verified
            // Only update status if it's still PENDING (don't override manual status changes)
            ...(payment.booking.status === "PENDING" && { status: "CONFIRMED" }),
          },
        });
      }

      return NextResponse.json({
        success: true,
        paymentId: payment.id,
        status: "COMPLETED",
      });
    } else {
      // Update payment as failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: verificationResult.error || "Payment verification failed",
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: verificationResult.error || "Payment verification failed",
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
