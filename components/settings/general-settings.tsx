"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Settings as SettingsIcon, Clock, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Separator } from "@/components/ui/separator";

const bookingRulesSchema = z.object({
  minimumAdvanceBookingHours: z.number().int().min(0).max(168),
  cancellationPolicyHours: z.number().int().min(0).max(720),
  bookingBufferMinutes: z.number().int().min(0).max(120),
});

type BookingRulesFormValues = z.infer<typeof bookingRulesSchema>;

export default function GeneralSettings() {
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
    fetchBookingRules();
  }, []);

  const fetchBookingRules = async () => {
    try {
      setLoading(true);
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

  if (loading) {
    return (
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
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <CardTitle>Booking Rules</CardTitle>
          <HelpTooltip content="Configure rules that apply to all bookings, such as minimum advance booking time, cancellation policies, and buffer times between appointments." />
        </div>
        <CardDescription>
          Set rules and policies that apply to all bookings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    The minimum number of hours in advance customers must book.
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
                </FormItem>
              )}
            />

            <Separator />

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
                </FormItem>
              )}
            />

            <Separator />

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
                    Minimum time gap (in minutes) between consecutive bookings.
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
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-4 pt-4">
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
  );
}
