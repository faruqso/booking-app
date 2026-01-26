import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPaystackWebhook } from "@/lib/payments/paystack";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
    const reference = event.data?.reference;

    if (!reference) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    // Find payment by provider payment ID
    const payment = await prisma.payment.findFirst({
      where: {
        providerPaymentId: reference,
        provider: "paystack",
      },
      include: {
        business: true,
      },
    });

    if (!payment || !payment.business.paystackWebhookSecret) {
      return NextResponse.json(
        { error: "Payment not found or webhook not configured" },
        { status: 404 }
      );
    }

    // Verify webhook signature
    const isValid = verifyPaystackWebhook(
      payment.business.paystackWebhookSecret,
      body,
      signature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Handle webhook events
    switch (event.event) {
      case "charge.success":
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "COMPLETED",
            providerTransactionId: event.data.id?.toString(),
            metadata: {
              ...((payment.metadata as any) || {}),
              webhookReceivedAt: new Date().toISOString(),
              paystackData: event.data,
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

      case "charge.failed":
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: "FAILED",
            failureReason: event.data.gateway_response || "Payment failed",
            metadata: {
              ...((payment.metadata as any) || {}),
              webhookReceivedAt: new Date().toISOString(),
              paystackData: event.data,
            },
          },
        });
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Paystack webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
