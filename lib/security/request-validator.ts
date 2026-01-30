/**
 * Request validation utilities for security
 */

import crypto from "crypto";

/**
 * Validate request origin/referer
 */
export function validateOrigin(
  request: Request,
  allowedOrigins?: string[]
): { valid: boolean; origin?: string } {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  
  // In development, allow localhost
  if (process.env.NODE_ENV === "development") {
    if (origin?.includes("localhost") || origin?.includes("127.0.0.1")) {
      return { valid: true, origin: origin || undefined };
    }
    if (referer?.includes("localhost") || referer?.includes("127.0.0.1")) {
      return { valid: true, origin: referer || undefined };
    }
  }

  // If no allowed origins specified, check against NEXTAUTH_URL
  const allowed = allowedOrigins || [process.env.NEXTAUTH_URL].filter(Boolean);
  
  if (allowed.length === 0) {
    // No restrictions
    return { valid: true, origin: origin || referer || undefined };
  }

  // Check origin
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const isValid = allowed.some((allowedOrigin) => {
        if (allowedOrigin == null) return false;
        try {
          const allowedUrl = new URL(allowedOrigin);
          return originUrl.origin === allowedUrl.origin;
        } catch {
          return origin === allowedOrigin;
        }
      });
      
      if (isValid) {
        return { valid: true, origin };
      }
    } catch {
      // Invalid origin URL
    }
  }

  // Check referer as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const isValid = allowed.some((allowedOrigin) => {
        if (allowedOrigin == null) return false;
        try {
          const allowedUrl = new URL(allowedOrigin);
          return refererUrl.origin === allowedUrl.origin;
        } catch {
          return referer === allowedOrigin;
        }
      });
      
      if (isValid) {
        return { valid: true, origin: referer };
      }
    } catch {
      // Invalid referer URL
    }
  }

  return { valid: false, origin: origin || referer || undefined };
}

/**
 * Generate a request signature for idempotency
 */
export function generateIdempotencyKey(bookingId: string, amount: number, timestamp: number): string {
  const data = `${bookingId}:${amount}:${timestamp}`;
  return crypto.createHash("sha256").update(data).digest("hex");
}

/**
 * Verify request signature
 */
export function verifyRequestSignature(
  data: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Create a signed payment request
 */
export function signPaymentRequest(
  bookingId: string,
  amount: number,
  currency: string,
  timestamp: number,
  secret: string = process.env.PAYMENT_REQUEST_SECRET || "default-secret-change-in-production"
): string {
  const data = `${bookingId}:${amount}:${currency}:${timestamp}`;
  return crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("hex");
}
