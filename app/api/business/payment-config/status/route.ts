import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

/**
 * GET /api/business/payment-config/status
 * Returns the configuration status of payment provider including webhook setup
 */
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
        requirePaymentDeposit: true,
        depositPercentage: true,
        // Public keys
        stripePublishableKey: true,
        paystackPublicKey: true,
        flutterwavePublicKey: true,
        // Secret keys (to check if configured, but don't return values)
        stripeSecretKey: true,
        paystackSecretKey: true,
        flutterwaveSecretKey: true,
        // Webhook secrets (to check if configured)
        stripeWebhookSecret: true,
        paystackWebhookSecret: true,
        flutterwaveWebhookSecret: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Determine configuration status for each provider
    const getProviderStatus = (provider: "stripe" | "paystack" | "flutterwave" | null) => {
      if (!provider || provider !== business.paymentProvider) {
        return null;
      }

      let hasPublicKey = false;
      let hasSecretKey = false;
      let hasWebhookSecret = false;

      switch (provider) {
        case "stripe":
          hasPublicKey = !!business.stripePublishableKey;
          hasSecretKey = !!business.stripeSecretKey;
          hasWebhookSecret = !!business.stripeWebhookSecret;
          break;
        case "paystack":
          hasPublicKey = !!business.paystackPublicKey;
          hasSecretKey = !!business.paystackSecretKey;
          hasWebhookSecret = !!business.paystackWebhookSecret;
          break;
        case "flutterwave":
          hasPublicKey = !!business.flutterwavePublicKey;
          hasSecretKey = !!business.flutterwaveSecretKey;
          hasWebhookSecret = !!business.flutterwaveWebhookSecret;
          break;
      }

      const isFullyConfigured = hasPublicKey && hasSecretKey;
      const isWebhookConfigured = hasWebhookSecret;

      return {
        provider,
        hasPublicKey,
        hasSecretKey,
        hasWebhookSecret,
        isFullyConfigured,
        isWebhookConfigured,
        status: isFullyConfigured 
          ? (isWebhookConfigured ? "complete" : "partial") 
          : "incomplete",
        missingItems: [
          !hasPublicKey && "Public Key",
          !hasSecretKey && "Secret Key",
          !hasWebhookSecret && "Webhook Secret",
        ].filter(Boolean) as string[],
      };
    };

    const provider = business.paymentProvider as "stripe" | "paystack" | "flutterwave" | null;
    const providerStatus = provider 
      ? getProviderStatus(provider)
      : null;

    return NextResponse.json({
      paymentProvider: business.paymentProvider,
      currency: business.currency,
      requirePaymentDeposit: business.requirePaymentDeposit,
      depositPercentage: business.depositPercentage,
      providerStatus,
      // Overall status
      isConfigured: providerStatus?.isFullyConfigured || false,
      isWebhookConfigured: providerStatus?.isWebhookConfigured || false,
    });
  } catch (error) {
    console.error("Payment config status fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment configuration status" },
      { status: 500 }
    );
  }
}
