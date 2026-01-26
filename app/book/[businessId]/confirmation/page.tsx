"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Calendar, Clock, Loader2, ArrowLeft, CreditCard, AlertCircle, Building2, MapPin, Mail, Phone, Receipt } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils/currency";

interface Booking {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string | null;
  startTime: string;
  service: {
    name: string;
    price: number;
  };
  business: {
    businessName: string;
    primaryColor: string;
    currency?: string;
  };
  location?: {
    id: string;
    name: string;
  } | null;
  paymentStatus?: string;
  paymentProvider?: string | null;
  paymentIntentId?: string | null;
  amountPaid?: number | null;
  currency?: string;
}

export default function ConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams?.get("bookingId");
  const businessId = params.businessId as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetails();
    }
  }, [bookingId]);

  // Poll for payment status updates if payment is PROCESSING
  useEffect(() => {
    if (!booking || booking.paymentStatus !== "PROCESSING") {
      return;
    }

    // Poll every 3 seconds, max 20 times (1 minute total)
    const maxPolls = 20;
    if (pollingCount >= maxPolls) {
      return;
    }

    const pollInterval = setInterval(() => {
      setPollingCount((prev) => prev + 1);
      fetchBookingDetails();
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [booking?.paymentStatus, bookingId, pollingCount]);

  const fetchBookingDetails = async () => {
    try {
      // Fetch booking details from API
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (response.ok) {
        const data = await response.json();
        setBooking(data);
        
        // Stop polling if payment is completed
        if (data.paymentStatus === "COMPLETED") {
          setPollingCount(1000); // Stop polling
        }
      }
    } catch (error) {
      console.error("Failed to fetch booking:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-8 w-48 mx-auto" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-2 shadow-xl">
            <CardHeader className="text-center pb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  booking?.paymentStatus === "PROCESSING" 
                    ? "bg-yellow-100 dark:bg-yellow-900/20" 
                    : booking?.paymentStatus === "COMPLETED" || !booking?.paymentStatus
                    ? "bg-green-100 dark:bg-green-900/20"
                    : "bg-primary/10"
                }`}
              >
                {booking?.paymentStatus === "PROCESSING" ? (
                  <Loader2 className="h-12 w-12 text-yellow-600 dark:text-yellow-400 animate-spin" />
                ) : (
                  <CheckCircle2 className={`h-12 w-12 ${
                    booking?.paymentStatus === "COMPLETED" || !booking?.paymentStatus
                      ? "text-green-600 dark:text-green-400"
                      : "text-primary"
                  }`} />
                )}
              </motion.div>
              <CardTitle className="text-3xl font-bold">
                {booking?.paymentStatus === "COMPLETED" || !booking?.paymentStatus || booking?.paymentStatus === "PENDING" 
                  ? "Booking Confirmed!" 
                  : booking?.paymentStatus === "PROCESSING"
                  ? "Payment Processing"
                  : "Booking Created"}
              </CardTitle>
              <CardDescription className="text-base">
                {booking?.paymentStatus === "COMPLETED" || !booking?.paymentStatus
                  ? "Your booking has been successfully confirmed. You will receive a confirmation email shortly."
                  : booking?.paymentStatus === "PROCESSING"
                  ? "Your payment is being processed. This usually takes a few seconds. You will receive a confirmation email once payment is confirmed."
                  : booking?.paymentStatus === "PENDING"
                  ? "Your booking is pending payment. Please complete the payment to confirm your booking."
                  : "Your booking has been created. You will receive a confirmation email shortly."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {booking && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Booking ID:</span>
                        <span className="font-mono font-medium">{booking.id}</span>
                      </div>
                      {booking.startTime && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Date & Time:</span>
                          <span className="font-medium">
                            {format(parseISO(booking.startTime), "PPpp")}
                          </span>
                        </div>
                      )}
                      {booking.service && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Service:</span>
                          <span className="font-medium">{booking.service.name}</span>
                        </div>
                      )}
                    </div>
                    {/* Payment Information */}
                    {(booking.paymentStatus || booking.service) && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                            <span>Payment Information</span>
                          </div>
                          
                          {/* Service Price */}
                          {booking.service && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Service Price:</span>
                              <span className="font-medium">
                                {formatCurrency(Number(booking.service.price), booking.currency || booking.business?.currency || "USD")}
                              </span>
                            </div>
                          )}

                          {/* Amount Paid */}
                          {booking.amountPaid && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Amount Paid:</span>
                              <span className="font-semibold text-base">
                                {formatCurrency(booking.amountPaid, booking.currency || booking.business?.currency || "USD")}
                              </span>
                            </div>
                          )}

                          {/* Payment Status */}
                          {booking.paymentStatus && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />
                                Payment Status:
                              </span>
                              <span className={`font-medium px-2 py-1 rounded ${
                                booking.paymentStatus === "COMPLETED" 
                                  ? "text-green-600 bg-green-50 dark:bg-green-900/20" :
                                booking.paymentStatus === "PROCESSING" 
                                  ? "text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20" :
                                booking.paymentStatus === "PENDING" 
                                  ? "text-orange-600 bg-orange-50 dark:bg-orange-900/20" :
                                booking.paymentStatus === "FAILED" 
                                  ? "text-red-600 bg-red-50 dark:bg-red-900/20" :
                                  "text-muted-foreground"
                              }`}>
                                {booking.paymentStatus}
                                {booking.paymentStatus === "PROCESSING" && (
                                  <Loader2 className="h-3 w-3 inline-block ml-1 animate-spin" />
                                )}
                              </span>
                            </div>
                          )}

                          {/* Payment Provider */}
                          {booking.paymentProvider && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Payment Method:</span>
                              <span className="font-medium capitalize">{booking.paymentProvider}</span>
                            </div>
                          )}

                          {/* Transaction ID */}
                          {booking.paymentIntentId && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Transaction ID:</span>
                              <span className="font-mono text-xs">{booking.paymentIntentId}</span>
                            </div>
                          )}

                          {/* Processing Message */}
                          {booking.paymentStatus === "PROCESSING" && (
                            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                              <div className="flex items-start gap-2">
                                <Loader2 className="h-4 w-4 text-yellow-600 mt-0.5 animate-spin" />
                                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                  Your payment is being verified. This page will automatically update when confirmation is received. 
                                  Usually takes 10-30 seconds.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Pending Payment Message */}
                          {booking.paymentStatus === "PENDING" && (
                            <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                              <div className="space-y-3">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                                    Please complete your payment to confirm this booking. Your time slot is reserved but will expire if payment is not completed.
                                  </p>
                                </div>
                                <Button
                                  onClick={() => router.push(`/book/${businessId}?bookingId=${booking.id}&step=payment`)}
                                  size="sm"
                                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                                >
                                  <CreditCard className="h-3 w-3 mr-2" />
                                  Complete Payment Now
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => router.push(`/book/${businessId}`)}
                  className="w-full h-11"
                >
                  Make Another Booking
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/")}
                  className="w-full h-11"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
