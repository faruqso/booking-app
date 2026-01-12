"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Settings as SettingsIcon, Clock, X, AlertCircle, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Separator } from "@/components/ui/separator";

const bookingRulesSchema = z.object({
  minimumAdvanceBookingHours: z.number().int().min(0).max(168),
  cancellationPolicyHours: z.number().int().min(0).max(720),
  bookingBufferMinutes: z.number().int().min(0).max(120),
});

type BookingRulesFormValues = z.infer<typeof bookingRulesSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<BookingRulesFormValues>({
    resolver: zodResolver(bookingRulesSchema),
    defaultValues: {
      minimumAdvanceBookingHours: 2,
      cancellationPolicyHours: 24,
      bookingBufferMinutes: 15,
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchBookingRules();
    }
  }, [status, router]);

  const fetchBookingRules = async () => {
    try {
      const response = await fetch("/api/business/booking-rules");
      if (response.ok) {
        const data = await response.json();
        form.reset({
          minimumAdvanceBookingHours: data.minimumAdvanceBookingHours ?? 2,
          cancellationPolicyHours: data.cancellationPolicyHours ?? 24,
          bookingBufferMinutes: data.bookingBufferMinutes ?? 15,
        });
      }
    } catch (error) {
      console.error("Failed to fetch booking rules:", error);
      toast({
        title: "Error",
        description: "Failed to load booking rules",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: BookingRulesFormValues) => {
    setSaving(true);
    try {
      const response = await fetch("/api/business/booking-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update booking rules");
      }

      toast({
        title: "Success",
        description: "Booking rules updated successfully!",
      });
    } catch (error: any) {
      console.error("Failed to update booking rules:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update booking rules",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Booking Rules & Settings</h1>
            <HelpTooltip content="Configure rules that apply to all bookings, such as minimum advance booking time, cancellation policies, and buffer times between appointments." />
          </div>
          <p className="text-muted-foreground">
            Set rules and policies that apply to all bookings
          </p>
        </div>
      </div>

      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-primary" />
            <CardTitle>Booking Rules</CardTitle>
          </div>
          <CardDescription>
            Configure how bookings work for your business. These rules apply to all services and bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Minimum Advance Booking */}
              <FormField
                control={form.control}
                name="minimumAdvanceBookingHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Minimum Advance Booking Time
                    </FormLabel>
                    <FormDescription className="text-sm">
                      The minimum number of hours in advance customers must book. Prevents last-minute bookings.
                    </FormDescription>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          min={0}
                          max={168}
                          className="h-11 text-base max-w-[120px]"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                        <span className="text-muted-foreground">hours</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-muted-foreground">
                      Example: 2 hours means customers must book at least 2 hours before the appointment time.
                    </div>
                  </FormItem>
                )}
              />

              <Separator />

              {/* Cancellation Policy */}
              <FormField
                control={form.control}
                name="cancellationPolicyHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base flex items-center gap-2">
                      <X className="h-4 w-4" />
                      Cancellation Policy
                    </FormLabel>
                    <FormDescription className="text-sm">
                      Customers can cancel bookings up to this many hours before the appointment time.
                    </FormDescription>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          min={0}
                          max={720}
                          className="h-11 text-base max-w-[120px]"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                        <span className="text-muted-foreground">hours before</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-muted-foreground">
                      Example: 24 hours means customers can cancel up to 24 hours before the appointment.
                    </div>
                  </FormItem>
                )}
              />

              <Separator />

              {/* Booking Buffer */}
              <FormField
                control={form.control}
                name="bookingBufferMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Buffer Time Between Bookings
                    </FormLabel>
                    <FormDescription className="text-sm">
                      Minimum time gap (in minutes) between consecutive bookings. Helps prevent back-to-back appointments.
                    </FormDescription>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input
                          type="number"
                          min={0}
                          max={120}
                          className="h-11 text-base max-w-[120px]"
                          {...field}
                          value={field.value || 0}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                        <span className="text-muted-foreground">minutes</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                    <div className="text-xs text-muted-foreground">
                      Example: 15 minutes means there will be a 15-minute gap between the end of one booking and the start of the next.
                    </div>
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-2 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <CardTitle className="text-base">How Booking Rules Work</CardTitle>
              <CardDescription className="text-sm mt-1">
                These rules help you manage your schedule effectively:
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span><strong>Minimum Advance Booking:</strong> Customers cannot book appointments that are too soon. This gives you time to prepare.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span><strong>Cancellation Policy:</strong> Customers can only cancel bookings up to the specified time before the appointment. After that, they&apos;ll need to contact you.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span><strong>Buffer Time:</strong> Automatically adds time gaps between bookings, giving you time to reset, prepare, or take breaks.</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

