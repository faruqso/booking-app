// @ts-ignore - No type definitions available for @paystack/paystack-sdk
import Paystack from "@paystack/paystack-sdk";

export interface PaystackConfig {
  secretKey: string;
  publicKey?: string;
}

export interface CreatePaymentParams {
  amount: number; // Amount in smallest currency unit (kobo for NGN, pesewas for GHS)
  currency: string;
  customerEmail: string;
  customerName?: string;
  metadata?: Record<string, string>;
  reference?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentReference?: string;
  authorizationUrl?: string;
  accessCode?: string;
  error?: string;
}

/**
 * Initialize Paystack client
 */
export function getPaystackClient(secretKey: string): Paystack {
  if (!secretKey) {
    throw new Error("Paystack secret key is required");
  }
  return new Paystack(secretKey);
}

/**
 * Create a Paystack transaction
 */
export async function createPaystackPayment(
  config: PaystackConfig,
  params: CreatePaymentParams
): Promise<PaymentResult> {
  try {
    const paystack = getPaystackClient(config.secretKey);

    // Convert amount to smallest currency unit
    // Paystack uses kobo for NGN (1 NGN = 100 kobo), pesewas for GHS, etc.
    const amountInSmallestUnit = Math.round(params.amount * 100);

    const transaction = await paystack.transaction.initialize({
      amount: amountInSmallestUnit,
      email: params.customerEmail,
      currency: params.currency.toUpperCase(),
      metadata: {
        custom_fields: [
          ...(params.customerName
            ? [
                {
                  display_name: "Customer Name",
                  variable_name: "customer_name",
                  value: params.customerName,
                },
              ]
            : []),
        ],
        ...params.metadata,
      },
      reference: params.reference,
    });

    if (transaction.status && transaction.data) {
      return {
        success: true,
        paymentReference: transaction.data.reference,
        authorizationUrl: transaction.data.authorization_url,
        accessCode: transaction.data.access_code,
      };
    }

    return {
      success: false,
      error: "Failed to initialize payment",
    };
  } catch (error: any) {
    console.error("Paystack payment creation error:", error);
    return {
      success: false,
      error: error.message || "Failed to create payment",
    };
  }
}

/**
 * Verify a Paystack transaction
 */
export async function verifyPaystackPayment(
  secretKey: string,
  reference: string
): Promise<PaymentResult> {
  try {
    const paystack = getPaystackClient(secretKey);

    const verification = await paystack.transaction.verify(reference);

    if (verification.status && verification.data) {
      const transaction = verification.data;

      if (transaction.status === "success") {
        return {
          success: true,
          paymentReference: transaction.reference,
        };
      }

      return {
        success: false,
        error: `Transaction status: ${transaction.status}`,
        paymentReference: transaction.reference,
      };
    }

    return {
      success: false,
      error: "Failed to verify payment",
    };
  } catch (error: any) {
    console.error("Paystack payment verification error:", error);
    return {
      success: false,
      error: error.message || "Failed to verify payment",
    };
  }
}

/**
 * Create a Paystack refund
 */
export async function createPaystackRefund(
  secretKey: string,
  transactionId: string,
  amount?: number,
  currency?: string
): Promise<PaymentResult> {
  try {
    const paystack = getPaystackClient(secretKey);

    const refundParams: any = {
      transaction: transactionId,
    };

    if (amount && currency) {
      refundParams.amount = Math.round(amount * 100); // Convert to smallest unit
      refundParams.currency = currency.toUpperCase();
    }

    const refund = await paystack.refund.create(refundParams);

    if (refund.status && refund.data) {
      return {
        success: refund.data.status === "processed",
        paymentReference: refund.data.transaction.reference,
        error:
          refund.data.status !== "processed"
            ? `Refund status: ${refund.data.status}`
            : undefined,
      };
    }

    return {
      success: false,
      error: "Failed to create refund",
    };
  } catch (error: any) {
    console.error("Paystack refund error:", error);
    return {
      success: false,
      error: error.message || "Failed to create refund",
    };
  }
}

/**
 * Verify Paystack webhook signature
 */
export function verifyPaystackWebhook(
  webhookSecret: string,
  payload: string,
  signature: string
): boolean {
  try {
    const crypto = require("crypto");
    const hash = crypto
      .createHmac("sha512", webhookSecret)
      .update(payload)
      .digest("hex");
    return hash === signature;
  } catch (error: any) {
    console.error("Paystack webhook verification error:", error);
    return false;
  }
}
