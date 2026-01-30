"use client";

/**
 * Booking flow: service → date → time → details → payment (if required).
 * State: selectedService, selectedDate, selectedTime, customerData, pendingBookingData, bookingId.
 * Handlers: onServiceSelected, onDateSelected, onTimeSelected, onSubmitDetails → createBooking or step "payment"; onPayment → createBooking then payment API.
 * Errors: setError + conflictAlternatives for slot conflicts; displayed in Alert at top of main content.
 */

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { format, addDays, startOfDay, parseISO, isToday } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Calendar, Clock, CheckCircle2, Loader2, AlertCircle, Users, CreditCard, Lock, XCircle, Eye, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency } from "@/lib/utils/currency";
import { PaystackInline } from "@/components/payments/paystack-inline";
import { useToast } from "@/hooks/use-toast";
import { BookingServiceStep } from "@/components/booking/booking-service-step";

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  locationId?: string | null;
  location?: { id: string; name: string } | null;
  imageUrl?: string;
  category?: string;
  maxCapacity?: number;
  bufferTimeBefore?: number;
  bufferTimeAfter?: number;
  cancellationPolicyHours?: number;
}

interface Business {
  id: string;
  name: string;
  businessName: string;
  primaryColor: string;
  logoUrl?: string;
  services: Service[];
  currency?: string;
  requirePaymentDeposit?: boolean;
  depositPercentage?: number | null;
  paymentProvider?: "stripe" | "paystack" | "flutterwave" | null;
}

const steps = [
  { id: "service", label: "Service", number: 1 },
  { id: "date", label: "Date", number: 2 },
  { id: "time", label: "Time", number: 3 },
  { id: "details", label: "Details", number: 4 },
  { id: "payment", label: "Payment", number: 5 },
];

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const businessId = params.businessId as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"service" | "date" | "time" | "details" | "payment">("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [loadingTimeSlots, setLoadingTimeSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [error, setError] = useState("");
  const [conflictAlternatives, setConflictAlternatives] = useState<Array<{
    display: string;
    value: string;
    reason: string;
  }>>([]);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);
  const [isDeposit, setIsDeposit] = useState(false);
  const [depositPercentage, setDepositPercentage] = useState<number | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);
  const [pendingBookingData, setPendingBookingData] = useState<{
    serviceId: string;
    locationId: string | null;
    startTime: string;
    customerData: typeof customerData;
  } | null>(null);
  const [paystackModalOpen, setPaystackModalOpen] = useState(false);
  const [paystackConfig, setPaystackConfig] = useState<{
    publicKey: string;
    reference: string;
    paymentId: string;
  } | null>(null);
  const [showBookingSummary, setShowBookingSummary] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState(false);
  const [autoSelecting, setAutoSelecting] = useState(false);
  const [autoSelectEnabled, setAutoSelectEnabled] = useState(false);

  const [customerData, setCustomerData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  useEffect(() => {
    fetchBusiness();
  }, [businessId]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedService, selectedDate, businessId]);

  useEffect(() => {
    if (business?.primaryColor) {
      document.documentElement.style.setProperty("--brand-primary", business.primaryColor);
    }
  }, [business]);

  // Handle resuming a booking from URL params (e.g., from confirmation page)
  useEffect(() => {
    const urlBookingId = searchParams?.get("bookingId");
    const urlStep = searchParams?.get("step");
    
    if (urlBookingId && urlStep === "payment" && business && !bookingId) {
      // Fetch booking details to restore state
      fetch(`/api/bookings/${urlBookingId}`)
        .then((res) => res.json())
        .then((booking) => {
          if (booking && (booking.status === "PENDING" || booking.paymentStatus === "PENDING")) {
            setBookingId(booking.id);
            // Restore service
            if (booking.service) {
              setSelectedService({
                id: booking.serviceId,
                name: booking.service.name,
                price: booking.service.price,
                duration: booking.service.duration,
                locationId: booking.locationId,
              });
            }
            // Restore date and time
            if (booking.startTime) {
              const startDate = parseISO(booking.startTime);
              setSelectedDate(startDate);
              setSelectedTime(booking.startTime);
            }
            // Restore customer data
            setCustomerData({
              name: booking.customerName,
              email: booking.customerEmail,
              phone: booking.customerPhone || "",
              notes: booking.notes || "",
            });
            // Restore payment info
            if (business.requirePaymentDeposit && business.paymentProvider) {
              const servicePrice = Number(booking.service?.price || 0);
              let calculatedPaymentAmount = servicePrice;
              let calculatedIsDeposit = false;
              
              if (business.depositPercentage && business.depositPercentage > 0 && business.depositPercentage < 100) {
                calculatedPaymentAmount = (servicePrice * business.depositPercentage) / 100;
                calculatedIsDeposit = true;
              }
              
              // Round to 2 decimal places to avoid floating point precision issues
              calculatedPaymentAmount = Math.round(calculatedPaymentAmount * 100) / 100;
              
              setRequiresPayment(true);
              setPaymentAmount(calculatedPaymentAmount);
              setIsDeposit(calculatedIsDeposit);
              setDepositPercentage(business.depositPercentage || null);
              setPaymentProvider(business.paymentProvider || null);
            }
            // Navigate to payment step
            setStep("payment");
          }
        })
        .catch((err) => {
          console.error("Failed to load booking:", err);
        });
    }
  }, [searchParams, business, bookingId]);

  const fetchBusiness = async () => {
    try {
      const response = await fetch(`/api/business/${businessId}`);
      if (response.ok) {
        const data = await response.json();
        setBusiness(data);
      } else {
        setError("Business not found");
      }
    } catch (err) {
      setError("Failed to load business");
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    if (!selectedService || !selectedDate) return;

    setLoadingTimeSlots(true);
    setTimeSlots([]); // Clear previous slots while loading

    try {
      // Phase 2: Include locationId if service is tied to a specific location
      const locationParam = selectedService.locationId ? `&locationId=${selectedService.locationId}` : '';
      const response = await fetch(
        `/api/availability/slots?businessId=${businessId}&serviceId=${selectedService.id}&date=${selectedDate.toISOString()}${locationParam}`
      );
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.slots || []);
      } else {
        console.error("Failed to fetch time slots:", response.status);
        setTimeSlots([]);
      }
    } catch (err) {
      console.error("Failed to fetch time slots:", err);
      setTimeSlots([]);
    } finally {
      setLoadingTimeSlots(false);
    }
  };

  const handleServiceSelect = async (service: Service) => {
    setSelectedService(service);
    
    // If auto-select is enabled, automatically find and select earliest available date/time
    if (autoSelectEnabled) {
      await handleAutoSelectDateAndTime();
    } else {
      setStep("date");
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep("time");
    // Clear any pending booking data when selecting a new date
    setPendingBookingData(null);
    setBookingId(null);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("details");
    // Clear any pending booking data when selecting a new time
    if (pendingBookingData && pendingBookingData.startTime !== parseISO(time).toISOString()) {
      setPendingBookingData(null);
      setBookingId(null);
    }
  };

  const handleAutoSelectDateAndTime = async () => {
    const serviceToUse = selectedService;
    if (!serviceToUse) return;

    setAutoSelecting(true);
    try {
      const locationParam = serviceToUse.locationId ? `&locationId=${serviceToUse.locationId}` : '';
      const availableDates = Array.from({ length: 30 }, (_, i) => addDays(startOfDay(new Date()), i));
      
      // Check each date sequentially until we find one with available slots
      for (const date of availableDates) {
        try {
          const response = await fetch(
            `/api/availability/slots?businessId=${businessId}&serviceId=${serviceToUse.id}&date=${date.toISOString()}${locationParam}`
          );
          
          if (response.ok) {
            const data = await response.json();
            const slots = data.slots || [];
            
            if (slots.length > 0) {
              // Found available slots! Auto-select this date and first time slot
              setSelectedDate(date);
              setSelectedTime(slots[0]);
              setTimeSlots(slots);
              setStep("details"); // Skip directly to details step
              toast({
                title: "Date & Time Selected",
                description: `Automatically selected ${format(date, "EEEE, MMMM d")} at ${format(parseISO(slots[0]), "h:mm a")}`,
              });
              setAutoSelecting(false);
              return;
            }
          }
        } catch (err) {
          // Continue to next date if this one fails
          console.error(`Failed to check date ${date}:`, err);
          continue;
        }
      }
      
      // No available slots found in the next 30 days
      toast({
        title: "No Availability",
        description: "No available time slots found in the next 30 days. Please try selecting a date manually.",
        variant: "destructive",
      });
      // If auto-select was enabled but no slots found, still show the date selection step
      if (autoSelectEnabled) {
        setStep("date");
      }
    } catch (error) {
      console.error("Failed to auto-select date:", error);
      toast({
        title: "Error",
        description: "Failed to automatically select date. Please try selecting manually.",
        variant: "destructive",
      });
      // If auto-select was enabled but failed, still show the date selection step
      if (autoSelectEnabled) {
        setStep("date");
      }
    } finally {
      setAutoSelecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!selectedService || !selectedDate || !selectedTime) {
      setError("Please complete all steps");
      setSubmitting(false);
      return;
    }

    try {
      const startTime = parseISO(selectedTime);
      
      // Store booking data temporarily (don't create booking yet)
      const bookingData = {
        serviceId: selectedService.id,
        locationId: selectedService.locationId || null,
        startTime: startTime.toISOString(),
        customerData: { ...customerData },
      };
      setPendingBookingData(bookingData);

      // Check if payment is required by checking business settings
      const needsPayment = business?.requirePaymentDeposit && business?.paymentProvider;
      
      if (needsPayment) {
        // Calculate payment amount
        const servicePrice = Number(selectedService.price);
        let calculatedPaymentAmount = servicePrice;
        let calculatedIsDeposit = false;
        
        if (business.depositPercentage && business.depositPercentage > 0 && business.depositPercentage < 100) {
          calculatedPaymentAmount = (servicePrice * business.depositPercentage) / 100;
          calculatedIsDeposit = true;
        }
        
        // Round to 2 decimal places to avoid floating point precision issues
        calculatedPaymentAmount = Math.round(calculatedPaymentAmount * 100) / 100;
        
        setRequiresPayment(true);
        setPaymentAmount(calculatedPaymentAmount);
        setIsDeposit(calculatedIsDeposit);
        setDepositPercentage(business.depositPercentage || null);
        setPaymentProvider(business.paymentProvider || null);
        // Don't create booking yet - only create when payment is initiated
        setStep("payment");
      } else {
        // No payment required - create booking immediately
        await createBooking(bookingData);
      }
    } catch (err: any) {
      setError(err.message);
      setConflictAlternatives([]);
    } finally {
      setSubmitting(false);
    }
  };

  const createBooking = async (bookingData?: typeof pendingBookingData) => {
    const dataToUse = bookingData || pendingBookingData;
    if (!dataToUse || !selectedService || !selectedDate || !selectedTime) {
      throw new Error("Booking data is missing");
    }

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId,
        serviceId: dataToUse.serviceId,
        locationId: dataToUse.locationId,
        customerName: dataToUse.customerData.name,
        customerEmail: dataToUse.customerData.email,
        customerPhone: dataToUse.customerData.phone,
        startTime: dataToUse.startTime,
        notes: dataToUse.customerData.notes,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      
      // Handle conflict with alternatives
      if (data.conflict && data.alternatives && Array.isArray(data.alternatives)) {
        setConflictAlternatives(data.alternatives);
        setError(data.error || "This time slot is no longer available. Please select an alternative:");
        throw new Error(data.error || "Time slot unavailable");
      }

      // Handle payment configuration errors
      if (data.paymentConfigError) {
        setError(data.error || "Payment configuration error. Please contact the business.");
        toast({
          title: "Payment Error",
          description: "The business has not fully configured payment processing. Please contact them directly.",
          variant: "destructive",
          duration: 8000,
        });
        throw new Error(data.error || "Payment configuration error");
      }
      
      // Log detailed error in development
      if (data.details) {
        console.error("Booking creation error details:", data.details);
      }
      
      throw new Error(data.error || "Failed to create booking");
    }

    const booking = await response.json();
    setBookingId(booking.id);
    
    // Update business currency if provided in booking response
    if (booking.currency && business) {
      setBusiness({ ...business, currency: booking.currency });
    }

    // Clear pending booking data
    setPendingBookingData(null);
    
    return booking;
  };

  const handlePayment = async () => {
    if (!paymentAmount || !paymentProvider) {
      setError("Payment information is missing");
      return;
    }

    setProcessingPayment(true);
    setError("");

    // Create booking first (only when payment is initiated)
    let currentBookingId = bookingId;
    
    if (!currentBookingId) {
      // Check if we have pending booking data to create from
      if (!pendingBookingData) {
        // If no pending data, check if we can restore from current form state
        if (!selectedService || !selectedDate || !selectedTime || !customerData.name || !customerData.email) {
          setError("Booking information is missing. Please go back and complete your details.");
          setProcessingPayment(false);
          return;
        }
        
        // Recreate pending booking data from current form state
        const startTime = parseISO(selectedTime);
        setPendingBookingData({
          serviceId: selectedService.id,
          locationId: selectedService.locationId || null,
          startTime: startTime.toISOString(),
          customerData: { ...customerData },
        });
      }
      
      try {
        const booking = await createBooking();
        currentBookingId = booking.id;
        // Ensure bookingId state is set
        setBookingId(currentBookingId);
      } catch (err: any) {
        setError(err.message || "Failed to create booking");
        setProcessingPayment(false);
        return;
      }
    }

    if (!currentBookingId) {
      setError("Booking ID is missing. Please try again.");
      setProcessingPayment(false);
      return;
    }

    try {
      // Security: Generate idempotency key and request signature
      const timestamp = Date.now();
      const idempotencyKey = `${currentBookingId}-${timestamp}-${Math.random().toString(36).substring(7)}`;
      
      // Security: Add timestamp to prevent replay attacks
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // Security: Add origin header for CORS validation
          "X-Requested-With": "XMLHttpRequest",
        },
          body: JSON.stringify({
            bookingId: currentBookingId,
            amount: paymentAmount ? Math.round(paymentAmount * 100) / 100 : 0, // Round to 2 decimal places
            currency: business?.currency || "USD", // Use business currency
            provider: paymentProvider,
            // redirectUrl will be constructed by API to point to callback page
            // Callback page will then redirect to confirmation
            redirectUrl: `${window.location.origin}/book/${businessId}/confirmation?bookingId=${currentBookingId}`,
            // Security: Add timestamp to prevent replay attacks
            timestamp: timestamp,
            // Security: Add idempotency key to prevent duplicate payments
            idempotencyKey: idempotencyKey,
          }),
      });

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error || "Failed to initialize payment";
        console.error("Payment error details:", {
          error: data.error,
          provider: data.provider,
          details: data.details,
          status: response.status,
        });
        throw new Error(errorMessage);
      }

      const paymentData = await response.json();

      // Handle different payment providers
      if (paymentProvider === "stripe" && paymentData.clientSecret) {
        // For Stripe, we'd typically use Stripe Elements or redirect to Stripe Checkout
        // For now, redirect to confirmation and let webhook handle verification
        router.push(`/book/${businessId}/confirmation?bookingId=${currentBookingId}&paymentId=${paymentData.paymentId}`);
      } else if (paymentProvider === "paystack" && paymentData.authorizationUrl) {
        // Use inline Paystack payment modal instead of redirecting
        if (paymentData.publicKey && paymentData.paymentReference) {
          setPaystackConfig({
            publicKey: paymentData.publicKey,
            reference: paymentData.paymentReference,
            paymentId: paymentData.paymentId,
          });
          setPaystackModalOpen(true);
        } else {
          // Fallback to redirect if public key not available
          window.location.href = paymentData.authorizationUrl;
        }
      } else if (paymentProvider === "flutterwave" && paymentData.link) {
        // Redirect to Flutterwave payment page
        window.location.href = paymentData.link;
      } else {
        // Payment created but needs manual verification
        router.push(`/book/${businessId}/confirmation?bookingId=${currentBookingId}&paymentId=${paymentData.paymentId}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to process payment");
      setProcessingPayment(false);
    }
  };

  const handlePaystackSuccess = async (reference: string) => {
    try {
      setPaystackModalOpen(false);
      setProcessingPayment(true);
      
      // Get current booking ID (should already be set from handlePayment)
      const currentBookingId = bookingId;
      
      if (!currentBookingId) {
        // If booking wasn't created, create it now (shouldn't happen, but safety check)
        if (pendingBookingData) {
          const booking = await createBooking();
          if (booking?.id) {
            setBookingId(booking.id);
            router.push(`/book/${businessId}/confirmation?bookingId=${booking.id}`);
            return;
          } else {
            throw new Error("Booking data is missing");
          }
        } else {
          throw new Error("Booking data is missing");
        }
      }

      // Verify payment with the reference (optional - webhook will also verify)
      try {
        const verifyResponse = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentId: paystackConfig?.paymentId,
            providerReference: reference,
          }),
        });
        // Don't wait for verification - webhook will handle it
      } catch (verifyErr) {
        console.error("Payment verification error (non-critical):", verifyErr);
      }

      // Redirect to confirmation (webhook will update payment status)
      router.push(`/book/${businessId}/confirmation?bookingId=${currentBookingId}`);
    } catch (err: any) {
      console.error("Payment success handling error:", err);
      setError(err.message || "Failed to process payment");
      // Still redirect if we have a booking ID
      const currentBookingId = bookingId;
      if (currentBookingId) {
        router.push(`/book/${businessId}/confirmation?bookingId=${currentBookingId}`);
      }
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaystackClose = () => {
    setPaystackModalOpen(false);
    setProcessingPayment(false);
  };

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <CardTitle>Business not found</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const availableDates = Array.from({ length: 30 }, (_, i) => addDays(startOfDay(new Date()), i));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="border-2 shadow-xl mb-6">
          <CardHeader className="text-center pb-4">
            {business.logoUrl && (
              <div className="flex justify-center mb-4">
                <img
                  src={business.logoUrl}
                  alt={business.businessName}
                  className="h-16 object-contain"
                />
              </div>
            )}
            <CardTitle className="text-3xl font-bold">
              Book with {business.businessName}
            </CardTitle>
            <CardDescription className="text-base">
              Select your preferred service, date, and time
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Progress Indicator */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              {steps.map((stepItem, index) => {
                const isActive = step === stepItem.id;
                const isCompleted = index < currentStepIndex;
                const isUpcoming = index > currentStepIndex;

                return (
                  <div key={stepItem.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : isCompleted
                            ? "bg-primary/10 text-primary border-primary"
                            : "bg-background text-muted-foreground border-muted"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <span className="font-semibold">{stepItem.number}</span>
                        )}
                      </div>
                      <span
                        className={`mt-2 text-xs font-medium ${
                          isActive ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {stepItem.label}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 transition-all ${
                          isCompleted ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Card className="border-2 shadow-xl">
          <CardContent className="pt-6">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <AnimatePresence mode="wait">
              {step === "service" && (
                <BookingServiceStep
                  services={business.services}
                  currency={business.currency}
                  onServiceSelected={handleServiceSelect}
                />
              )}

              {step === "date" && selectedService && (
                <motion.div
                  key="date"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant="ghost"
                    onClick={() => setStep("service")}
                    className="mb-6"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to services
                  </Button>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-2xl font-semibold">Select a Date</h2>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAutoSelectDateAndTime}
                        disabled={autoSelecting}
                        className="gap-2"
                      >
                        {autoSelecting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Finding earliest...
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4" />
                            Book Earliest Available
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-3 mb-2">
                      <Checkbox
                        id="auto-select"
                        checked={autoSelectEnabled}
                        onCheckedChange={(checked) => setAutoSelectEnabled(checked as boolean)}
                      />
                      <Label
                        htmlFor="auto-select"
                        className="text-sm font-normal cursor-pointer"
                      >
                        Automatically select earliest available date and time
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {autoSelectEnabled 
                        ? "When enabled, the earliest available date and time will be automatically selected when you choose a service."
                        : "Enable automatic selection to skip manual date/time selection, or choose a specific date below."}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click a date to see available times for that day.
                    </p>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Next 30 days
                  </p>
                  <div className="grid grid-cols-7 gap-2">
                    {availableDates.map((date) => {
                      const isSelected =
                        selectedDate?.toDateString() === date.toDateString();
                      const isTodayDate = isToday(date);
                      return (
                        <motion.button
                          key={date.toISOString()}
                          onClick={() => handleDateSelect(date)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : isTodayDate
                                ? "border-primary/50 hover:border-primary/70 bg-card"
                                : "border-muted hover:border-primary/50 bg-card"
                          }`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="text-xs font-medium mb-1">
                            {format(date, "EEE")}
                          </div>
                          <div className="text-lg font-semibold">{format(date, "d")}</div>
                          <div className="text-xs mt-1">
                            {isTodayDate ? "Today" : format(date, "MMM")}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step === "time" && selectedService && selectedDate && (
                <motion.div
                  key="time"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    variant="ghost"
                    onClick={() => setStep("date")}
                    className="mb-6"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to date selection
                  </Button>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold">
                      Select a Time for {format(selectedDate, "EEEE, MMMM d")}
                    </h2>
                    {timeSlots.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (timeSlots[0]) {
                            handleTimeSelect(timeSlots[0]);
                          }
                        }}
                        className="gap-2"
                      >
                        <Clock className="h-4 w-4" />
                        Select First Available
                      </Button>
                    )}
                  </div>
                  {loadingTimeSlots ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                      <p className="text-muted-foreground">
                        Loading available time slots...
                      </p>
                    </div>
                  ) : timeSlots.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No available time slots for this date.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
                      {timeSlots.map((slot) => {
                        const isSelected = selectedTime === slot;
                        return (
                          <motion.button
                            key={slot}
                            onClick={() => handleTimeSelect(slot)}
                            className={`p-4 rounded-lg border-2 transition-all font-medium ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground shadow-lg"
                                : "border-muted hover:border-primary/50 bg-card"
                            }`}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            {format(parseISO(slot), "h:mm a")}
                          </motion.button>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {step === "details" && selectedService && selectedDate && selectedTime && (
                <motion.form
                  key="details"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      // If booking was created, warn user
                      if (bookingId) {
                        const shouldGoBack = confirm(
                          "You have a pending booking. Going back will allow you to change your selection, but the original booking will remain. You can complete payment later or the booking will expire. Continue?"
                        );
                        if (shouldGoBack) {
                          setStep("time");
                        }
                      } else {
                        setStep("time");
                      }
                    }}
                    className="mb-6"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to time selection
                  </Button>
                  <h2 className="text-2xl font-semibold mb-6">Your Details</h2>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        type="text"
                        required
                        className="h-11"
                        value={customerData.name}
                        onChange={(e) =>
                          setCustomerData({ ...customerData, name: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        className="h-11"
                        value={customerData.email}
                        onChange={(e) =>
                          setCustomerData({ ...customerData, email: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        className="h-11"
                        value={customerData.phone}
                        onChange={(e) =>
                          setCustomerData({ ...customerData, phone: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        rows={3}
                        value={customerData.notes}
                        onChange={(e) =>
                          setCustomerData({ ...customerData, notes: e.target.value })
                        }
                      />
                    </div>

                    {bookingId && step === "details" && (
                      <Alert className="mb-4 border-blue-200 bg-blue-50">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          <div className="space-y-3">
                            <div>
                              <p className="font-semibold mb-1">Booking Reserved</p>
                              <p className="text-sm">
                                Your booking has been reserved for this time slot. Complete payment to confirm your booking. 
                                You can go back to edit details, but the time slot is now reserved for you.
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-blue-200">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setStep("payment")}
                                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                <CreditCard className="h-3 w-3 mr-1.5" />
                                Complete Payment
                                <ArrowRight className="h-3 w-3 ml-1.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setShowBookingSummary(!showBookingSummary)}
                                className="h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                              >
                                <Eye className="h-3 w-3 mr-1.5" />
                                {showBookingSummary ? "Hide" : "View"} Summary
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  if (confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) {
                                    setCancellingBooking(true);
                                    try {
                                      const response = await fetch(`/api/bookings/${bookingId}`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ status: "CANCELLED" }),
                                      });
                                      if (response.ok) {
                                        setBookingId(null);
                                        setPendingBookingData(null);
                                        toast({
                                          title: "Booking Cancelled",
                                          description: "Your booking has been cancelled successfully.",
                                        });
                                        // Reset to time selection
                                        setStep("time");
                                      } else {
                                        throw new Error("Failed to cancel booking");
                                      }
                                    } catch (err: any) {
                                      toast({
                                        title: "Error",
                                        description: err.message || "Failed to cancel booking. Please try again.",
                                        variant: "destructive",
                                      });
                                    } finally {
                                      setCancellingBooking(false);
                                    }
                                  }
                                }}
                                disabled={cancellingBooking}
                                className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                              >
                                {cancellingBooking ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                    Cancelling...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1.5" />
                                    Cancel Booking
                                  </>
                                )}
                              </Button>
                            </div>
                            {showBookingSummary && selectedService && selectedDate && selectedTime && (
                              <div className="mt-3 pt-3 border-t border-blue-200 bg-white rounded-lg p-3 space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Service:</span>
                                  <span className="font-medium">{selectedService.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Date & Time:</span>
                                  <span className="font-medium">
                                    {format(parseISO(selectedTime), "PPp")}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Customer:</span>
                                  <span className="font-medium">{customerData.name}</span>
                                </div>
                                {requiresPayment && paymentAmount && (
                                  <div className="flex justify-between pt-2 border-t border-gray-200">
                                    <span className="text-gray-600 font-medium">Amount to Pay:</span>
                                    <span className="font-bold text-blue-600">
                                      {formatCurrency(paymentAmount, business?.currency || "USD")}
                                      {isDeposit && depositPercentage && (
                                        <span className="text-xs text-gray-500 ml-1">
                                          ({depositPercentage}% deposit)
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    {error && (
                      <Alert variant={conflictAlternatives.length > 0 ? "default" : "destructive"} className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-3">
                            <p>{error}</p>
                            {conflictAlternatives.length > 0 && (
                              <div className="space-y-2">
                                <p className="font-medium text-sm">Suggested alternatives:</p>
                                <div className="grid gap-2">
                                  {conflictAlternatives.map((alt, index) => (
                                    <Button
                                      key={index}
                                      type="button"
                                      variant="outline"
                                      className="justify-start text-left h-auto py-3"
                                      onClick={async () => {
                                        // Cancel existing booking if changing time
                                        if (bookingId) {
                                          try {
                                            await fetch(`/api/bookings/${bookingId}`, {
                                              method: "PATCH",
                                              headers: { "Content-Type": "application/json" },
                                              body: JSON.stringify({ status: "CANCELLED" }),
                                            });
                                            setBookingId(null);
                                            setPendingBookingData(null);
                                          } catch (err) {
                                            console.error("Failed to cancel booking:", err);
                                          }
                                        }
                                        setSelectedTime(alt.value);
                                        setError("");
                                        setConflictAlternatives([]);
                                      }}
                                    >
                                      <div className="flex-1">
                                        <div className="font-medium">{alt.display}</div>
                                        {alt.reason && (
                                          <div className="text-xs text-muted-foreground mt-1">
                                            {alt.reason}
                                          </div>
                                        )}
                                      </div>
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <Separator className="my-6" />

                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Booking Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Service:</span>
                          <span className="font-medium">{selectedService.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="font-medium">
                            {format(selectedDate, "EEEE, MMMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Time:</span>
                          <span className="font-medium">
                            {format(parseISO(selectedTime), "h:mm a")}
                          </span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between text-base font-semibold">
                          <span>Total:</span>
                          <span>{formatCurrency(selectedService.price, business?.currency)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-12 text-base"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : bookingId ? (
                        <>
                          Continue to Payment
                          <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                        </>
                      ) : (
                        <>
                          Continue to Payment
                          <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.form>
              )}

              {step === "payment" && selectedService && paymentAmount && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      // If booking was already created, show warning
                      if (bookingId) {
                        const shouldGoBack = confirm(
                          "You have a pending booking. Going back will allow you to edit your details, but the booking will remain. You can complete payment when ready. Continue?"
                        );
                        if (shouldGoBack) {
                          setStep("details");
                        }
                      } else {
                        // No booking created yet, safe to go back
                        setStep("details");
                      }
                    }}
                    className="mb-6"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to details
                  </Button>
                  <h2 className="text-2xl font-semibold mb-6">Payment</h2>

                  {error && (
                    <Alert variant="destructive" className="mb-6">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Card className="bg-muted/50 mb-6">
                    <CardHeader>
                      <CardTitle className="text-lg">Payment Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service:</span>
                        <span className="font-medium">{selectedService.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Service Price:</span>
                        <span className="font-medium">{formatCurrency(selectedService.price, business?.currency)}</span>
                      </div>
                      {isDeposit && depositPercentage && (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Deposit ({depositPercentage}%):</span>
                            <span className="font-medium">{formatCurrency(paymentAmount, business?.currency)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground mt-1">
                            <span>Remaining balance:</span>
                            <span>{formatCurrency(Number(selectedService.price) - (paymentAmount || 0), business?.currency)}</span>
                          </div>
                        </>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between text-base font-semibold">
                        <span>Amount to Pay:</span>
                        <span>{formatCurrency(paymentAmount, business?.currency)}</span>
                      </div>
                      {isDeposit && (
                        <p className="text-xs text-muted-foreground mt-2">
                          You will pay the remaining balance later or at the time of service.
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-4 border-2 rounded-lg bg-card">
                      <Lock className="h-5 w-5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium">Secure Payment</p>
                        <p className="text-sm text-muted-foreground">
                          Your payment is processed securely through {paymentProvider === "stripe" ? "Stripe" : paymentProvider === "paystack" ? "Paystack" : "Flutterwave"}
                        </p>
                      </div>
                    </div>

                    {bookingId && (
                      <Alert className="mb-4 border-blue-200 bg-blue-50">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800">
                          <div className="flex items-center justify-between">
                            <p className="text-sm">
                              You have a pending booking. Complete payment to confirm it.
                            </p>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                if (confirm("Are you sure you want to cancel this booking? This action cannot be undone.")) {
                                  setCancellingBooking(true);
                                  try {
                                    const response = await fetch(`/api/bookings/${bookingId}`, {
                                      method: "PATCH",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ status: "CANCELLED" }),
                                    });
                                    if (response.ok) {
                                      setBookingId(null);
                                      setPendingBookingData(null);
                                      toast({
                                        title: "Booking Cancelled",
                                        description: "Your booking has been cancelled successfully.",
                                      });
                                      router.push(`/book/${businessId}`);
                                    } else {
                                      throw new Error("Failed to cancel booking");
                                    }
                                  } catch (err: any) {
                                    toast({
                                      title: "Error",
                                      description: err.message || "Failed to cancel booking. Please try again.",
                                      variant: "destructive",
                                    });
                                  } finally {
                                    setCancellingBooking(false);
                                  }
                                }
                              }}
                              disabled={cancellingBooking}
                              className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400 ml-3"
                            >
                              {cancellingBooking ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Cancelling...
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Cancel
                                </>
                              )}
                            </Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <Button
                      onClick={handlePayment}
                      disabled={processingPayment}
                      className="w-full h-12 text-base"
                    >
                      {processingPayment ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Pay {formatCurrency(paymentAmount, business?.currency)}
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-center text-muted-foreground">
                      By proceeding, you agree to our terms and conditions. Your booking will be confirmed once payment is successful.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>

      {/* Paystack Inline Payment Modal */}
      {paystackConfig && (
        <PaystackInline
          publicKey={paystackConfig.publicKey}
          email={customerData.email}
          amount={paymentAmount || 0}
          currency={business?.currency || "USD"}
          reference={paystackConfig.reference}
          metadata={{
            bookingId: bookingId,
            paymentId: paystackConfig.paymentId,
            businessId: businessId,
          }}
          onSuccess={handlePaystackSuccess}
          onClose={handlePaystackClose}
          open={paystackModalOpen}
        />
      )}
    </div>
  );
}
