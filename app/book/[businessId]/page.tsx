"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, addDays, startOfDay, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Clock, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
}

interface Business {
  id: string;
  name: string;
  businessName: string;
  primaryColor: string;
  logoUrl?: string;
  services: Service[];
}

const steps = [
  { id: "service", label: "Service", number: 1 },
  { id: "date", label: "Date", number: 2 },
  { id: "time", label: "Time", number: 3 },
  { id: "details", label: "Details", number: 4 },
];

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const businessId = params.businessId as string;

  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"service" | "date" | "time" | "details">("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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

    try {
      const response = await fetch(
        `/api/availability/slots?businessId=${businessId}&serviceId=${selectedService.id}&date=${selectedDate.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setTimeSlots(data.slots);
      }
    } catch (err) {
      console.error("Failed to fetch time slots:", err);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep("date");
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep("time");
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep("details");
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
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          serviceId: selectedService.id,
          customerName: customerData.name,
          customerEmail: customerData.email,
          customerPhone: customerData.phone,
          startTime: startTime.toISOString(),
          notes: customerData.notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create booking");
      }

      const booking = await response.json();
      router.push(`/book/${businessId}/confirmation?bookingId=${booking.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
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
                <motion.div
                  key="service"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-2xl font-semibold mb-6">Select a Service</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {business.services.map((service) => (
                      <motion.button
                        key={service.id}
                        onClick={() => handleServiceSelect(service)}
                        className="text-left p-6 border-2 rounded-lg transition-all hover:border-primary hover:shadow-lg hover:scale-[1.02] bg-card"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{service.name}</h3>
                          <Badge variant="secondary" className="ml-2">
                            ${Number(service.price).toFixed(2)}
                          </Badge>
                        </div>
                        {service.description && (
                          <p className="text-sm text-muted-foreground mb-3">
                            {service.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{service.duration} min</span>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
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
                  <h2 className="text-2xl font-semibold mb-6">Select a Date</h2>
                  <div className="grid grid-cols-7 gap-2">
                    {availableDates.map((date) => {
                      const isSelected =
                        selectedDate?.toDateString() === date.toDateString();
                      return (
                        <motion.button
                          key={date.toISOString()}
                          onClick={() => handleDateSelect(date)}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground shadow-lg"
                              : "border-muted hover:border-primary/50 bg-card"
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <div className="text-xs font-medium mb-1">
                            {format(date, "EEE")}
                          </div>
                          <div className="text-lg font-semibold">{format(date, "d")}</div>
                          <div className="text-xs mt-1">{format(date, "MMM")}</div>
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
                  <h2 className="text-2xl font-semibold mb-6">
                    Select a Time for {format(selectedDate, "EEEE, MMMM d")}
                  </h2>
                  {timeSlots.length === 0 ? (
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
                    onClick={() => setStep("time")}
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
                          <span>${Number(selectedService.price).toFixed(2)}</span>
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
                          Booking...
                        </>
                      ) : (
                        <>
                          Confirm Booking
                          <CheckCircle2 className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
