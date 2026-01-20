import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyFlutterwaveWebhook } from "@/lib/payments/flutterwave";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const headersList = headers();
    const signature = headersList.get("verif-hash");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);
    const txRef = event.data?.tx_ref;
    const transactionId = event.data?.id?.toString();

    if (!txRef && !transactionId) {
      return NextResponse.json(
        { error: "Invalid webhook payload" },
        { status: 400 }
      );
    }

    // Find payment by provider payment ID or transaction ID
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { providerPaymentId: txRef },
          { providerTransactionId: transactionId },
        ],
        provider: "flutterwave",
      },
      include: {
        business: true,
      },
    });

    if (!payment || !payment.business.flutterwaveWebhookSecret) {
      return NextResponse.json(
        { error: "Payment not found or webhook not configured" },
        { status: 404 }
      );
    }

    // Verify webhook signature
    const isValid = verifyFlutterwaveWebhook(
      payment.business.flutterwaveWebhookSecret,
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
    const eventType = event.event;

    if (eventType === "charge.completed" || event.data?.status === "successful") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          providerTransactionId: event.data.id?.toString(),
          metadata: {
            ...((payment.metadata as any) || {}),
            webhookReceivedAt: new Date().toISOString(),
            flutterwaveData: event.data,
          },
        },
      });

      if (payment.bookingId) {
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            paymentStatus: "COMPLETED",
            amountPaid: payment.amount,
          },
        });
      }
    } else if (eventType === "charge.failed" || event.data?.status === "failed") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: event.data.processor_response || "Payment failed",
          metadata: {
            ...((payment.metadata as any) || {}),
            webhookReceivedAt: new Date().toISOString(),
            flutterwaveData: event.data,
          },
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Flutterwave webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
