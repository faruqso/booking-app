"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function PaymentCallbackPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const businessId = params.businessId as string;
  const bookingId = searchParams?.get("bookingId");
  const paymentId = searchParams?.get("paymentId");
  const reference = searchParams?.get("reference"); // Paystack reference
  const trxref = searchParams?.get("trxref"); // Alternative Paystack reference
  const redirectUrl = searchParams?.get("redirect"); // Final redirect URL after verification
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your payment...");

  const checkPaymentStatus = useCallback(async () => {
    if (!paymentId) {
      const finalUrl = redirectUrl || `/book/${businessId}/confirmation?bookingId=${bookingId}`;
      setTimeout(() => router.push(finalUrl), 1500);
      return;
    }
    try {
      let attempts = 0;
      const maxAttempts = 3;
      const pollStatus = async () => {
        attempts++;
        const response = await fetch(`/api/payments/${paymentId}`);
        if (response.ok) {
          const payment = await response.json();
          if (payment.status === "COMPLETED") {
            setStatus("success");
            setMessage("Payment completed successfully!");
            const finalUrl = redirectUrl || `/book/${businessId}/confirmation?bookingId=${bookingId}`;
            setTimeout(() => router.push(finalUrl), 1500);
          } else if (payment.status === "FAILED") {
            setStatus("error");
            setMessage(payment.failureReason || "Payment failed");
          } else if (attempts < maxAttempts) {
            setTimeout(pollStatus, 2000);
          } else {
            setStatus("success");
            setMessage("Redirecting to your booking...");
            const finalUrl = redirectUrl || `/book/${businessId}/confirmation?bookingId=${bookingId}`;
            setTimeout(() => router.push(finalUrl), 1500);
          }
        } else {
          setStatus("success");
          setMessage("Redirecting to your booking...");
          setTimeout(() => router.push(`/book/${businessId}/confirmation?bookingId=${bookingId}`), 1500);
        }
      };
      pollStatus();
    } catch {
      setStatus("success");
      setMessage("Redirecting to your booking...");
      const finalUrl = redirectUrl || `/book/${businessId}/confirmation?bookingId=${bookingId}`;
      setTimeout(() => router.push(finalUrl), 1500);
    }
  }, [paymentId, bookingId, businessId, redirectUrl, router]);

  const verifyPayment = useCallback(async () => {
    try {
      const ref = reference || trxref;
      if (!ref) {
        // No reference in URL, check payment status directly
        checkPaymentStatus();
        return;
      }

      // First, check if payment is already completed
      if (paymentId) {
        const statusResponse = await fetch(`/api/payments/${paymentId}`);
        if (statusResponse.ok) {
          const payment = await statusResponse.json();
          if (payment.status === "COMPLETED") {
            setStatus("success");
            setMessage("Payment verified successfully!");
            const finalUrl = redirectUrl || `/book/${businessId}/confirmation?bookingId=${bookingId}`;
            setTimeout(() => {
              router.push(finalUrl);
            }, 1500);
            return;
          }
        }
      }

      // If payment not completed yet, show success message and redirect
      // Webhook will handle the actual verification
      setStatus("success");
      setMessage("Payment received! Redirecting to your booking...");
      const finalUrl = redirectUrl || `/book/${businessId}/confirmation?bookingId=${bookingId}`;
      setTimeout(() => {
        router.push(finalUrl);
      }, 1500);
    } catch (error: unknown) {
      console.error("Payment verification error:", error);
      setStatus("success");
      setMessage("Redirecting to your booking...");
      const finalUrl = redirectUrl || `/book/${businessId}/confirmation?bookingId=${bookingId}`;
      setTimeout(() => router.push(finalUrl), 1500);
    }
  }, [reference, trxref, paymentId, bookingId, businessId, redirectUrl, router, checkPaymentStatus]);

  useEffect(() => {
    if (bookingId && (reference || trxref)) {
      verifyPayment();
    } else if (bookingId && paymentId) {
      checkPaymentStatus();
    } else {
      setStatus("error");
      setMessage("Missing payment information. Please contact support.");
    }
  }, [bookingId, reference, trxref, paymentId, verifyPayment, checkPaymentStatus]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center pb-4">
            {status === "verifying" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </motion.div>
            )}
            {status === "success" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </motion.div>
            )}
            {status === "error" && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <XCircle className="h-12 w-12 text-red-600" />
              </motion.div>
            )}
            <CardTitle className="text-2xl font-bold">
              {status === "verifying" && "Verifying Payment"}
              {status === "success" && "Payment Successful!"}
              {status === "error" && "Payment Verification Failed"}
            </CardTitle>
            <CardDescription className="mt-2">{message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === "verifying" && (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Please wait while we verify your payment...
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>This may take a few seconds</span>
                </div>
              </div>
            )}
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  Redirecting you to your booking confirmation...
                </p>
                <Button
                  onClick={() => {
                    const finalUrl = redirectUrl || `/book/${businessId}/confirmation?bookingId=${bookingId}`;
                    router.push(finalUrl);
                  }}
                  className="w-full"
                >
                  View Booking Confirmation
                </Button>
              </motion.div>
            )}
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-red-800 font-medium">Payment Issue</p>
                      <p className="text-xs text-red-600 mt-1">{message}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/book/${businessId}`)}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => {
                      const finalUrl = redirectUrl || `/book/${businessId}/confirmation?bookingId=${bookingId}`;
                      router.push(finalUrl);
                    }}
                    className="flex-1"
                  >
                    View Booking
                  </Button>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
