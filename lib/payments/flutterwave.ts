// @ts-ignore - No type definitions available for flutterwave-node-v3
import Flutterwave from "flutterwave-node-v3";

export interface FlutterwaveConfig {
  secretKey: string;
  publicKey?: string;
}

export interface CreatePaymentParams {
  amount: number; // Amount in currency
  currency: string;
  customerEmail: string;
  customerName?: string;
  customerPhone?: string;
  metadata?: Record<string, string>;
  txRef?: string;
  redirectUrl?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentReference?: string;
  link?: string;
  transactionId?: string;
  error?: string;
}

/**
 * Initialize Flutterwave client
 */
export function getFlutterwaveClient(secretKey: string, publicKey?: string): Flutterwave {
  if (!secretKey) {
    throw new Error("Flutterwave secret key is required");
  }
  return new Flutterwave(publicKey || "", secretKey);
}

/**
 * Create a Flutterwave payment link
 */
export async function createFlutterwavePayment(
  config: FlutterwaveConfig,
  params: CreatePaymentParams
): Promise<PaymentResult> {
  try {
    const flw = getFlutterwaveClient(config.secretKey, config.publicKey);

    const paymentData = {
      tx_ref: params.txRef || `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      amount: params.amount.toString(),
      currency: params.currency.toUpperCase(),
      redirect_url: params.redirectUrl || "",
      payment_options: "card,account,ussd,mpesa,mobilemoneyghana",
      customer: {
        email: params.customerEmail,
        name: params.customerName || "Customer",
        phone_number: params.customerPhone || "",
      },
      customizations: {
        title: "Booking Payment",
        description: "Payment for booking",
      },
      meta: params.metadata || {},
    };

    const response = await flw.Payment.initialize(paymentData);

    if (response.status === "success" && response.data) {
      return {
        success: true,
        paymentReference: response.data.tx_ref,
        link: response.data.link,
        transactionId: response.data.id?.toString(),
      };
    }

    return {
      success: false,
      error: response.message || "Failed to initialize payment",
    };
  } catch (error: any) {
    console.error("Flutterwave payment creation error:", error);
    // Extract more detailed error message
    const errorMessage = error.message || error.data?.message || "Failed to create payment";
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Verify a Flutterwave transaction
 */
export async function verifyFlutterwavePayment(
  secretKey: string,
  publicKey: string,
  transactionId: string
): Promise<PaymentResult> {
  try {
    const flw = getFlutterwaveClient(secretKey, publicKey);

    const response = await flw.Transaction.verify({ id: transactionId });

    if (response.status === "success" && response.data) {
      const transaction = response.data;

      if (transaction.status === "successful") {
        return {
          success: true,
          paymentReference: transaction.tx_ref,
          transactionId: transaction.id?.toString(),
        };
      }

      return {
        success: false,
        error: `Transaction status: ${transaction.status}`,
        paymentReference: transaction.tx_ref,
        transactionId: transaction.id?.toString(),
      };
    }

    return {
      success: false,
      error: response.message || "Failed to verify payment",
    };
  } catch (error: any) {
    console.error("Flutterwave payment verification error:", error);
    return {
      success: false,
      error: error.message || "Failed to verify payment",
    };
  }
}

/**
 * Create a Flutterwave refund
 */
export async function createFlutterwaveRefund(
  secretKey: string,
  publicKey: string,
  transactionId: string,
  amount?: number
): Promise<PaymentResult> {
  try {
    const flw = getFlutterwaveClient(secretKey, publicKey);

    const refundData: any = {
      id: transactionId,
    };

    if (amount) {
      refundData.amount = amount.toString();
    }

    const response = await flw.Transaction.refund(refundData);

    if (response.status === "success") {
      return {
        success: true,
        transactionId: response.data.id?.toString(),
      };
    }

    return {
      success: false,
      error: response.message || "Failed to create refund",
    };
  } catch (error: any) {
    console.error("Flutterwave refund error:", error);
    return {
      success: false,
      error: error.message || "Failed to create refund",
    };
  }
}

/**
 * Verify Flutterwave webhook signature
 */
export function verifyFlutterwaveWebhook(
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
    console.error("Flutterwave webhook verification error:", error);
    return false;
  }
}
