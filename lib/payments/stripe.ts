import Stripe from "stripe";

export interface StripeConfig {
  secretKey: string;
  publishableKey?: string;
}

export interface CreatePaymentIntentParams {
  amount: number; // Amount in cents (or smallest currency unit)
  currency: string;
  customerEmail: string;
  customerName?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  error?: string;
  requiresAction?: boolean;
}

/**
 * Initialize Stripe client
 */
export function getStripeClient(secretKey: string): Stripe {
  if (!secretKey) {
    throw new Error("Stripe secret key is required");
  }
  return new Stripe(secretKey, {
    apiVersion: "2024-11-20.acacia",
  });
}

/**
 * Create a Stripe payment intent
 */
export async function createStripePaymentIntent(
  config: StripeConfig,
  params: CreatePaymentIntentParams
): Promise<PaymentResult> {
  try {
    const stripe = getStripeClient(config.secretKey);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100), // Convert to cents
      currency: params.currency.toLowerCase(),
      metadata: {
        customerEmail: params.customerEmail,
        customerName: params.customerName || "",
        ...params.metadata,
      },
      receipt_email: params.customerEmail,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
      requiresAction: paymentIntent.status === "requires_action",
    };
  } catch (error: any) {
    console.error("Stripe payment intent creation error:", error);
    return {
      success: false,
      error: error.message || "Failed to create payment intent",
    };
  }
}

/**
 * Confirm a Stripe payment intent
 */
export async function confirmStripePaymentIntent(
  secretKey: string,
  paymentIntentId: string
): Promise<PaymentResult> {
  try {
    const stripe = getStripeClient(secretKey);

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      return {
        success: true,
        paymentIntentId: paymentIntent.id,
      };
    }

    return {
      success: false,
      error: `Payment status: ${paymentIntent.status}`,
    };
  } catch (error: any) {
    console.error("Stripe payment confirmation error:", error);
    return {
      success: false,
      error: error.message || "Failed to confirm payment",
    };
  }
}

/**
 * Create a Stripe refund
 */
export async function createStripeRefund(
  secretKey: string,
  paymentIntentId: string,
  amount?: number
): Promise<PaymentResult> {
  try {
    const stripe = getStripeClient(secretKey);

    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100); // Convert to cents
    }

    const refund = await stripe.refunds.create(refundParams);

    return {
      success: refund.status === "succeeded" || refund.status === "pending",
      paymentIntentId: refund.payment_intent as string,
      error: refund.status === "failed" ? "Refund failed" : undefined,
    };
  } catch (error: any) {
    console.error("Stripe refund error:", error);
    return {
      success: false,
      error: error.message || "Failed to create refund",
    };
  }
}

/**
 * Verify Stripe webhook signature
 */
export function verifyStripeWebhook(
  webhookSecret: string,
  payload: string | Buffer,
  signature: string
): Stripe.Event | null {
  try {
    const stripe = getStripeClient(webhookSecret);
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error: any) {
    console.error("Stripe webhook verification error:", error);
    return null;
  }
}
