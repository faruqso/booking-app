import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createStripePaymentIntent } from "@/lib/payments/stripe";
import { createPaystackPayment } from "@/lib/payments/paystack";
import { createFlutterwavePayment } from "@/lib/payments/flutterwave";
import { rateLimiter, getClientIP } from "@/lib/security/rate-limiter";
import { validateOrigin, verifyRequestSignature } from "@/lib/security/request-validator";

export const dynamic = 'force-dynamic';

const createPaymentSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  amount: z.number().positive("Amount must be positive").max(1000000, "Amount exceeds maximum limit"),
  currency: z.string().length(3, "Currency must be a 3-character code").optional(),
  provider: z.enum(["stripe", "paystack", "flutterwave"]),
  redirectUrl: z.string().url("Invalid redirect URL").optional(),
  // Security: Timestamp to prevent replay attacks (must be within last 5 minutes)
  timestamp: z.number().int().positive().optional(),
  // Security: Idempotency key to prevent duplicate payments
  idempotencyKey: z.string().optional(),
  // Security: Request signature for additional validation
  signature: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    // Security: Rate limiting - 10 requests per IP per 15 minutes
    const clientIP = getClientIP(request);
    const rateLimitKey = `payment:${clientIP}`;
    const isRateLimited = rateLimiter.isRateLimited(rateLimitKey, 10, 15 * 60 * 1000);
    
    if (isRateLimited) {
      const remaining = rateLimiter.getRemaining(rateLimitKey, 10);
      const resetTime = rateLimiter.getResetTime(rateLimitKey);
      return NextResponse.json(
        { 
          error: "Too many payment requests. Please try again later.",
          retryAfter: resetTime ? Math.ceil((resetTime - Date.now()) / 1000) : 900
        },
        { 
          status: 429,
          headers: {
            "Retry-After": resetTime ? Math.ceil((resetTime - Date.now()) / 1000).toString() : "900",
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": resetTime ? Math.ceil(resetTime / 1000).toString() : "",
          }
        }
      );
    }

    // Security: Validate origin/referer
    const originValidation = validateOrigin(request);
    if (!originValidation.valid && process.env.NODE_ENV === "production") {
      console.warn("Invalid origin for payment request:", {
        origin: originValidation.origin,
        ip: clientIP,
        url: request.url,
      });
      // Don't block in development, but log it
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Invalid request origin" },
          { status: 403 }
        );
      }
    }

    // Security: Check if request is over HTTPS in production
    if (process.env.NODE_ENV === "production") {
      const protocol = request.headers.get("x-forwarded-proto") || 
                      (request.url.startsWith("https://") ? "https" : "http");
      if (protocol !== "https") {
        return NextResponse.json(
          { error: "HTTPS required for payment processing" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const validatedData = createPaymentSchema.parse(body);

    // Security: Verify timestamp to prevent replay attacks (if provided)
    if (validatedData.timestamp) {
      const now = Date.now();
      const requestTime = validatedData.timestamp;
      const timeDiff = Math.abs(now - requestTime);
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      if (timeDiff > maxAge) {
        return NextResponse.json(
          { error: "Request expired. Please try again." },
          { status: 400 }
        );
      }
    }

    // Security: Verify request signature (if provided)
    if (validatedData.signature && validatedData.timestamp) {
      const secret = process.env.PAYMENT_REQUEST_SECRET || "default-secret-change-in-production";
      if (!verifyRequestSignature(
        `${validatedData.bookingId}:${validatedData.amount}:${validatedData.currency || "USD"}:${validatedData.timestamp}`,
        validatedData.signature,
        secret
      )) {
        console.warn("Invalid payment request signature:", {
          bookingId: validatedData.bookingId,
          ip: clientIP,
        });
        return NextResponse.json(
          { error: "Invalid request signature" },
          { status: 403 }
        );
      }
    }

    // Note: Idempotency key check happens after booking fetch (below)

    // Fetch booking first to get businessId (allows public access for customer bookings)
    const booking = await prisma.booking.findUnique({
      where: {
        id: validatedData.bookingId,
      },
      include: {
        service: true,
        customer: true,
        business: {
          select: {
            id: true,
            name: true,
            paymentProvider: true,
            currency: true,
            requirePaymentDeposit: true,
            depositPercentage: true,
            stripeSecretKey: true,
            stripePublishableKey: true,
            paystackSecretKey: true,
            paystackPublicKey: true,
            flutterwaveSecretKey: true,
            flutterwavePublicKey: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Security: Validate booking age - don't allow payment for bookings older than 30 days
    const bookingAge = Date.now() - new Date(booking.startTime).getTime();
    const maxBookingAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    if (bookingAge > maxBookingAge) {
      return NextResponse.json(
        { error: "This booking is too old to process payment. Please contact the business." },
        { status: 400 }
      );
    }

    // Security: Validate booking status - only allow payment for PENDING bookings
    if (booking.status !== "PENDING") {
      return NextResponse.json(
        { error: `Payment cannot be processed for ${booking.status.toLowerCase()} bookings` },
        { status: 400 }
      );
    }

    // Note: Business model doesn't have an 'active' field in the schema
    // If you need to validate business status, add an 'isActive' field to the Business model

    // Check if booking already has payment completed
    if (booking.paymentStatus === "COMPLETED") {
      return NextResponse.json(
        { error: "Payment already completed for this booking" },
        { status: 400 }
      );
    }

    // Check if a payment already exists for this booking
    const existingPayment = await prisma.payment.findUnique({
      where: { bookingId: booking.id },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        provider: true,
        providerPaymentId: true,
        providerTransactionId: true,
        metadata: true,
      },
    });

    if (existingPayment) {
      // If payment exists and is pending/processing, return it
      if (existingPayment.status === "PENDING" || existingPayment.status === "PROCESSING") {
        // Check if we have authorization URL or client secret in metadata
        const metadata = existingPayment.metadata as any;
        
        return NextResponse.json({
          success: true,
          paymentId: existingPayment.id,
          paymentIntentId: existingPayment.providerPaymentId,
          clientSecret: metadata?.clientSecret,
          authorizationUrl: metadata?.authorizationUrl,
          link: metadata?.link,
          accessCode: existingPayment.providerTransactionId,
        });
      }

      // If payment failed, we can create a new one
      if (existingPayment.status === "FAILED") {
        // Delete the failed payment to allow retry
        await prisma.payment.delete({
          where: { id: existingPayment.id },
        });
      } else {
        // Payment is in another state (COMPLETED, REFUNDED, etc.)
        return NextResponse.json(
          { error: `Payment already exists with status: ${existingPayment.status}` },
          { status: 400 }
        );
      }
    }

    // Use business from booking include (already fetched)
    const business = booking.business;

    // Verify payment provider matches booking's payment provider (if set)
    if (booking.paymentProvider && booking.paymentProvider !== validatedData.provider) {
      return NextResponse.json(
        { error: `Payment provider mismatch. Expected ${booking.paymentProvider}, got ${validatedData.provider}` },
        { status: 400 }
      );
    }

    // Verify business has the payment provider configured
    if (!business.paymentProvider) {
      return NextResponse.json(
        { error: "No payment provider configured for this business" },
        { status: 400 }
      );
    }

    if (business.paymentProvider !== validatedData.provider) {
      return NextResponse.json(
        { error: `Payment provider ${validatedData.provider} is not configured for this business. Business is configured for ${business.paymentProvider}` },
        { status: 400 }
      );
    }

    // Use business currency if not provided in request
    const currency = validatedData.currency || business.currency || "USD";

    // Security: Verify payment amount matches booking amount (prevent amount tampering)
    const servicePrice = Number(booking.service.price);
    let expectedAmount = servicePrice;
    
    if (business.requirePaymentDeposit && business.depositPercentage && 
        business.depositPercentage > 0 && business.depositPercentage < 100) {
      expectedAmount = (servicePrice * business.depositPercentage) / 100;
    }
    
    // Use more precise rounding to avoid floating point issues
    // Round to 2 decimal places using proper method
    expectedAmount = Math.round(expectedAmount * 100) / 100;
    
    // Round received amount to 2 decimal places for consistent comparison
    const receivedAmount = Math.round(validatedData.amount * 100) / 100;
    
    // Use a more lenient tolerance for floating point comparison (0.02 instead of 0.01)
    // This accounts for potential rounding differences between frontend and backend
    const amountDifference = Math.abs(receivedAmount - expectedAmount);
    if (amountDifference > 0.02) {
      console.error("Payment amount mismatch:", {
        expected: expectedAmount,
        received: receivedAmount,
        originalReceived: validatedData.amount,
        bookingId: booking.id,
        servicePrice,
        depositPercentage: business.depositPercentage,
        difference: amountDifference,
        expectedFormatted: expectedAmount.toFixed(2),
        receivedFormatted: receivedAmount.toFixed(2),
      });
      return NextResponse.json(
        { 
          error: "Payment amount does not match booking amount",
          details: process.env.NODE_ENV === "development" 
            ? `Expected: ${expectedAmount.toFixed(2)}, Received: ${receivedAmount.toFixed(2)}`
            : undefined
        },
        { status: 400 }
      );
    }

    // Security: Check for existing payment with same idempotency key
    if (validatedData.idempotencyKey) {
      // Find payments for this booking and check metadata
      const existingPayments = await prisma.payment.findMany({
        where: {
          bookingId: booking.id,
        },
        select: {
          id: true,
          status: true,
          providerPaymentId: true,
          providerTransactionId: true,
          metadata: true,
        },
      });

      // Check if any payment has matching idempotency key
      for (const existingPayment of existingPayments) {
        const metadata = existingPayment.metadata as any;
        if (metadata?.idempotencyKey === validatedData.idempotencyKey) {
          // Return existing payment if idempotency key matches
          return NextResponse.json({
            success: true,
            paymentId: existingPayment.id,
            paymentIntentId: existingPayment.providerPaymentId,
            clientSecret: metadata?.clientSecret,
            authorizationUrl: metadata?.authorizationUrl,
            link: metadata?.link,
            accessCode: existingPayment.providerTransactionId,
            idempotent: true,
          });
        }
      }
    }

    // Create payment record (with error handling for unique constraint)
    let payment;
    try {
      payment = await prisma.payment.create({
        data: {
          businessId: booking.businessId,
          bookingId: booking.id,
          amount: validatedData.amount,
          currency: currency,
          provider: validatedData.provider,
          status: "PENDING",
          customerEmail: booking.customerEmail,
          customerName: booking.customerName,
          customerPhone: booking.customerPhone || null,
          metadata: {
            idempotencyKey: validatedData.idempotencyKey,
            requestIP: clientIP,
            requestOrigin: originValidation.origin,
            createdAt: new Date().toISOString(),
          },
        },
      });
    } catch (createError: any) {
      // Handle unique constraint violation (race condition)
      if (createError.code === "P2002" && createError.meta?.target?.includes("bookingId")) {
        // Payment was created by another request, fetch it
        const existingPayment = await prisma.payment.findUnique({
          where: { bookingId: booking.id },
          select: {
            id: true,
            status: true,
            amount: true,
            currency: true,
            provider: true,
            providerPaymentId: true,
            providerTransactionId: true,
            metadata: true,
          },
        });

        if (existingPayment) {
          const metadata = existingPayment.metadata as any;
          return NextResponse.json({
            success: true,
            paymentId: existingPayment.id,
            paymentIntentId: existingPayment.providerPaymentId,
            clientSecret: metadata?.clientSecret,
            authorizationUrl: metadata?.authorizationUrl,
            link: metadata?.link,
            accessCode: existingPayment.providerTransactionId,
          });
        }
      }
      throw createError; // Re-throw if it's not a unique constraint error
    }

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
            currency: currency,
            customerEmail: booking.customerEmail,
            customerName: booking.customerName,
            metadata: {
              bookingId: booking.id,
              paymentId: payment.id,
              businessId: booking.businessId,
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

        // Build callback URL for Paystack redirect
        // Paystack will redirect here after payment with ?reference=xxx&trxref=xxx
        // The callback page will then redirect to the final confirmation page
        const requestUrl = new URL(request.url);
        const baseUrl = validatedData.redirectUrl 
          ? new URL(validatedData.redirectUrl).origin
          : (process.env.NEXTAUTH_URL || `${requestUrl.protocol}//${requestUrl.host}`);
        
        // Callback URL points to our callback handler page
        // It includes the final redirect URL in the query params for the callback page to use
        const finalRedirectUrl = validatedData.redirectUrl || 
          `${baseUrl}/book/${booking.businessId}/confirmation?bookingId=${booking.id}`;
        const callbackUrl = `${baseUrl}/book/${booking.businessId}/payment/callback?bookingId=${booking.id}&paymentId=${payment.id}&redirect=${encodeURIComponent(finalRedirectUrl)}`;

        paymentResult = await createPaystackPayment(
          {
            secretKey: business.paystackSecretKey,
            publicKey: business.paystackPublicKey || undefined,
          },
          {
            amount: validatedData.amount,
            currency: currency,
            customerEmail: booking.customerEmail,
            customerName: booking.customerName,
            reference: `ref_${payment.id}_${Date.now()}`,
            callbackUrl: callbackUrl,
            metadata: {
              bookingId: booking.id,
              paymentId: payment.id,
              businessId: booking.businessId,
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
            currency: currency,
            customerEmail: booking.customerEmail,
            customerName: booking.customerName,
            customerPhone: booking.customerPhone || undefined,
            txRef: `tx_${payment.id}_${Date.now()}`,
            redirectUrl: validatedData.redirectUrl,
            metadata: {
              bookingId: booking.id,
              paymentId: payment.id,
              businessId: booking.businessId,
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
      const errorMessage = paymentResult.error || "Failed to create payment";
      console.error(`Payment creation failed for ${validatedData.provider}:`, errorMessage);
      
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: errorMessage,
        },
      });

      return NextResponse.json(
        { 
          error: errorMessage,
          provider: validatedData.provider,
          details: process.env.NODE_ENV === "development" ? `Payment provider: ${validatedData.provider}, Amount: ${validatedData.amount} ${currency}` : undefined
        },
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

    // Include public key for Paystack inline payment
    const responseData: any = {
      success: true,
      paymentId: payment.id,
      ...paymentResult,
    };

    // Add public key for Paystack inline payment modal
    if (validatedData.provider === "paystack" && business.paystackPublicKey) {
      responseData.publicKey = business.paystackPublicKey;
    }

    return NextResponse.json(responseData);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    // Security: Don't expose internal error details in production
    console.error("Payment creation error:", {
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    
    return NextResponse.json(
      { 
        error: process.env.NODE_ENV === "development" 
          ? (error.message || "Failed to create payment")
          : "Payment processing failed. Please try again or contact support.",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
