"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Calendar, Clock, Loader2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

interface Booking {
  id: string;
  customerName: string;
  startTime: string;
  service: {
    name: string;
    price: number;
  };
  business: {
    businessName: string;
    primaryColor: string;
  };
}

export default function ConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams?.get("bookingId");
  const businessId = params.businessId as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingId) {
      // In a real app, you'd fetch the booking details
      // For now, we'll just show a confirmation message
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [bookingId]);

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
                className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 className="h-12 w-12 text-primary" />
              </motion.div>
              <CardTitle className="text-3xl font-bold">Booking Confirmed!</CardTitle>
              <CardDescription className="text-base">
                Your booking has been successfully confirmed. You will receive a confirmation email shortly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {bookingId && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Booking ID:</span>
                        <span className="font-mono font-medium">{bookingId}</span>
                      </div>
                    </div>
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
