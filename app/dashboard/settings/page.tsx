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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Settings as SettingsIcon, Clock, X, AlertCircle, HelpCircle, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Separator } from "@/components/ui/separator";

const bookingRulesSchema = z.object({
  minimumAdvanceBookingHours: z.number().int().min(0).max(168),
  cancellationPolicyHours: z.number().int().min(0).max(720),
  bookingBufferMinutes: z.number().int().min(0).max(120),
});

type BookingRulesFormValues = z.infer<typeof bookingRulesSchema>;

const whatsappSettingsSchema = z.object({
  whatsappPhoneNumber: z.string().optional().nullable(),
  whatsappAccessToken: z.string().optional().nullable(),
  whatsappPhoneNumberId: z.string().optional().nullable(),
  whatsappBusinessAccountId: z.string().optional().nullable(),
  whatsappNotificationsEnabled: z.boolean().optional(),
});

type WhatsAppSettingsFormValues = z.infer<typeof whatsappSettingsSchema>;

const smsSettingsSchema = z.object({
  twilioAccountSid: z.string().optional().nullable(),
  twilioAuthToken: z.string().optional().nullable(),
  twilioPhoneNumber: z.string().optional().nullable(),
  smsRemindersEnabled: z.boolean().optional(),
});

type SMSSettingsFormValues = z.infer<typeof smsSettingsSchema>;

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [savingSMS, setSavingSMS] = useState(false);

  const form = useForm<BookingRulesFormValues>({
    resolver: zodResolver(bookingRulesSchema),
    defaultValues: {
      minimumAdvanceBookingHours: 2,
      cancellationPolicyHours: 24,
      bookingBufferMinutes: 15,
    },
  });

  const whatsappForm = useForm<WhatsAppSettingsFormValues>({
    resolver: zodResolver(whatsappSettingsSchema),
    defaultValues: {
      whatsappPhoneNumber: "",
      whatsappAccessToken: "",
      whatsappPhoneNumberId: "",
      whatsappBusinessAccountId: "",
      whatsappNotificationsEnabled: false,
    },
  });

  const smsForm = useForm<SMSSettingsFormValues>({
    resolver: zodResolver(smsSettingsSchema),
    defaultValues: {
      twilioAccountSid: "",
      twilioAuthToken: "",
      twilioPhoneNumber: "",
      smsRemindersEnabled: false,
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchBookingRules();
      fetchWhatsAppSettings();
      fetchSMSSettings();
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

  const fetchWhatsAppSettings = async () => {
    try {
      const response = await fetch("/api/business/whatsapp-settings");
      if (response.ok) {
        const data = await response.json();
        whatsappForm.reset({
          whatsappPhoneNumber: data.whatsappPhoneNumber || "",
          whatsappAccessToken: data.hasAccessToken ? "••••••••" : "", // Don't show actual token
          whatsappPhoneNumberId: data.whatsappPhoneNumberId || "",
          whatsappBusinessAccountId: data.whatsappBusinessAccountId || "",
          whatsappNotificationsEnabled: data.whatsappNotificationsEnabled ?? false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch WhatsApp settings:", error);
    }
  };

  const fetchSMSSettings = async () => {
    try {
      const response = await fetch("/api/business/sms-config");
      if (response.ok) {
        const data = await response.json();
        smsForm.reset({
          twilioPhoneNumber: data.twilioPhoneNumber || "",
          twilioAccountSid: "", // Don't show actual credentials
          twilioAuthToken: "", // Don't show actual credentials
          smsRemindersEnabled: data.smsRemindersEnabled ?? false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch SMS settings:", error);
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

  const onWhatsAppSubmit = async (data: WhatsAppSettingsFormValues) => {
    setSavingWhatsApp(true);
    try {
      // If access token is masked (••••••••), don't send it (keep existing)
      const updateData = { ...data };
      if (data.whatsappAccessToken === "••••••••") {
        delete updateData.whatsappAccessToken;
      }

      const response = await fetch("/api/business/whatsapp-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update WhatsApp settings");
      }

      toast({
        title: "Success",
        description: "WhatsApp settings updated successfully!",
      });

      // Refresh settings to get updated data
      await fetchWhatsAppSettings();
    } catch (error: any) {
      console.error("Failed to update WhatsApp settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update WhatsApp settings",
        variant: "destructive",
      });
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const onSMSSubmit = async (data: SMSSettingsFormValues) => {
    setSavingSMS(true);
    try {
      // If auth token is empty/masked, don't send it (keep existing)
      const updateData: any = { ...data };
      if (!data.twilioAuthToken || data.twilioAuthToken === "") {
        delete updateData.twilioAuthToken;
      }
      if (!data.twilioAccountSid || data.twilioAccountSid === "") {
        delete updateData.twilioAccountSid;
      }

      const response = await fetch("/api/business/sms-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update SMS settings");
      }

      toast({
        title: "Success",
        description: "SMS settings updated successfully!",
      });

      // Refresh settings to get updated data
      await fetchSMSSettings();
    } catch (error: any) {
      console.error("Failed to update SMS settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update SMS settings",
        variant: "destructive",
      });
    } finally {
      setSavingSMS(false);
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

      {/* WhatsApp Settings Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>WhatsApp Notifications</CardTitle>
          </div>
          <CardDescription>
            Configure WhatsApp notifications to receive real-time alerts when customers create, cancel, or modify bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...whatsappForm}>
            <form onSubmit={whatsappForm.handleSubmit(onWhatsAppSubmit)} className="space-y-6">
              {/* Enable Notifications Toggle */}
              <FormField
                control={whatsappForm.control}
                name="whatsappNotificationsEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-base">
                        Enable WhatsApp Notifications
                      </FormLabel>
                      <FormDescription className="text-sm">
                        Receive WhatsApp messages when bookings are created, cancelled, or modified.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <Separator />

              {/* WhatsApp Phone Number */}
              <FormField
                control={whatsappForm.control}
                name="whatsappPhoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">WhatsApp Phone Number</FormLabel>
                    <FormDescription className="text-sm">
                      Your business WhatsApp number in E.164 format (e.g., +1234567890)
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1234567890"
                        className="h-11 text-base"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Access Token */}
              <FormField
                control={whatsappForm.control}
                name="whatsappAccessToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Access Token</FormLabel>
                    <FormDescription className="text-sm">
                      WhatsApp Cloud API access token from Meta Business Manager
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter access token"
                        className="h-11 text-base font-mono"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Phone Number ID */}
              <FormField
                control={whatsappForm.control}
                name="whatsappPhoneNumberId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Phone Number ID</FormLabel>
                    <FormDescription className="text-sm">
                      WhatsApp phone number ID from Meta Business Manager
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Phone number ID"
                        className="h-11 text-base"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Business Account ID */}
              <FormField
                control={whatsappForm.control}
                name="whatsappBusinessAccountId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Business Account ID (Optional)</FormLabel>
                    <FormDescription className="text-sm">
                      WhatsApp Business Account ID (optional, for advanced configurations)
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Business account ID"
                        className="h-11 text-base"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  disabled={savingWhatsApp}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingWhatsApp}>
                  {savingWhatsApp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save WhatsApp Settings"
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

      {/* SMS Settings Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>SMS Notifications</CardTitle>
          </div>
          <CardDescription>
            Configure SMS notifications to send booking confirmations and reminders to customers via Twilio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...smsForm}>
            <form onSubmit={smsForm.handleSubmit(onSMSSubmit)} className="space-y-6">
              {/* Enable SMS Reminders Toggle */}
              <FormField
                control={smsForm.control}
                name="smsRemindersEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-base">
                        Enable SMS Reminders
                      </FormLabel>
                      <FormDescription className="text-sm">
                        Send SMS reminders to customers about their upcoming bookings.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <Separator />

              {/* Twilio Phone Number */}
              <FormField
                control={smsForm.control}
                name="twilioPhoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Twilio Phone Number</FormLabel>
                    <FormDescription className="text-sm">
                      Your Twilio phone number in E.164 format (e.g., +1234567890)
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1234567890"
                        className="h-11 text-base"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Twilio Account SID */}
              <FormField
                control={smsForm.control}
                name="twilioAccountSid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Twilio Account SID</FormLabel>
                    <FormDescription className="text-sm">
                      Your Twilio Account SID from the Twilio Console
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter Account SID (leave blank to keep current)"
                        className="h-11 text-base font-mono"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Twilio Auth Token */}
              <FormField
                control={smsForm.control}
                name="twilioAuthToken"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Twilio Auth Token</FormLabel>
                    <FormDescription className="text-sm">
                      Your Twilio Auth Token from the Twilio Console
                    </FormDescription>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter Auth Token (leave blank to keep current)"
                        className="h-11 text-base font-mono"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <div className="flex justify-end gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/dashboard")}
                  disabled={savingSMS}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingSMS}>
                  {savingSMS ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save SMS Settings"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* WhatsApp Setup Info Card */}
      <Card className="border-2 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-start gap-2">
            <HelpCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div>
              <CardTitle className="text-base">WhatsApp Setup Instructions</CardTitle>
              <CardDescription className="text-sm mt-1">
                To enable WhatsApp notifications, you need to set up WhatsApp Cloud API:
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Create a Meta Business Account at <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">business.facebook.com</a></li>
            <li>Set up a WhatsApp Business Account</li>
            <li>Get your access token and phone number ID from Meta Business Manager</li>
            <li>Create and approve message templates (see documentation for details)</li>
            <li>Enter your credentials above and enable notifications</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-4">
            Note: The first 1,000 conversations per month are typically free. Template messages must be approved by Meta before use.
          </p>
        </CardContent>
      </Card>

      {/* SMS Setup Info Card */}
      <Card className="border-2 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-start gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <CardTitle className="text-base">SMS Setup Instructions</CardTitle>
              <CardDescription className="text-sm mt-1">
                To enable SMS notifications, you need to set up a Twilio account:
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Create a Twilio account at <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">twilio.com</a></li>
            <li>Purchase a phone number from Twilio (or use a trial number for testing)</li>
            <li>Get your Account SID and Auth Token from the Twilio Console</li>
            <li>Enter your credentials above and enable SMS reminders</li>
          </ol>
          <p className="text-xs text-muted-foreground mt-4">
            Note: SMS messages are sent automatically when customers create or cancel bookings. Reminders are sent based on your booking settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

