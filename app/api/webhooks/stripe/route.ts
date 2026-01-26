import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyStripeWebhook } from "@/lib/payments/stripe";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    // Get webhook secret from environment or fetch from business
    // For now, we'll need to extract business ID from metadata
    let event: any;
    
    try {
      // Try to parse without verification first to get business ID
      const tempEvent = JSON.parse(body);
      const paymentIntentId = tempEvent.data?.object?.id;
      
      if (!paymentIntentId) {
        return NextResponse.json(
          { error: "Invalid webhook payload" },
          { status: 400 }
        );
      }

      // Find payment by provider payment ID
      const payment = await prisma.payment.findFirst({
        where: {
          providerPaymentId: paymentIntentId,
          provider: "stripe",
        },
        include: {
          business: true,
        },
      });

      if (!payment || !payment.business.stripeWebhookSecret) {
        return NextResponse.json(
          { error: "Payment not found or webhook not configured" },
          { status: 404 }
        );
      }

      // Verify webhook signature
      event = verifyStripeWebhook(
        payment.business.stripeWebhookSecret,
        body,
        signature
      );

      if (!event) {
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }

      // Handle webhook events
      switch (event.type) {
        case "payment_intent.succeeded":
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "COMPLETED",
              metadata: {
                ...((payment.metadata as any) || {}),
                webhookReceivedAt: new Date().toISOString(),
              },
            },
          });

          if (payment.bookingId) {
            // Fetch current booking to check status
            const booking = await prisma.booking.findUnique({
              where: { id: payment.bookingId },
              select: { status: true },
            });

            await prisma.booking.update({
              where: { id: payment.bookingId },
              data: {
                paymentStatus: "COMPLETED",
                amountPaid: payment.amount,
                // Automatically confirm booking when payment is verified
                // Only update status if it's still PENDING (don't override manual status changes)
                ...(booking?.status === "PENDING" && { status: "CONFIRMED" }),
              },
            });
          }
          break;

        case "payment_intent.payment_failed":
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "FAILED",
              failureReason: event.data.object.last_payment_error?.message || "Payment failed",
              metadata: {
                ...((payment.metadata as any) || {}),
                webhookReceivedAt: new Date().toISOString(),
              },
            },
          });
          break;

        case "payment_intent.canceled":
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: "CANCELLED",
              metadata: {
                ...((payment.metadata as any) || {}),
                webhookReceivedAt: new Date().toISOString(),
              },
            },
          });
          break;
      }

      return NextResponse.json({ received: true });
    } catch (parseError) {
      // If we can't parse, try verification with all businesses
      // This is less efficient but handles edge cases
      console.error("Webhook processing error:", parseError);
      return NextResponse.json(
        { error: "Webhook processing failed" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
