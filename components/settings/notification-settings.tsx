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
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, MessageSquare, HelpCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const whatsappSettingsSchema = z.object({
  whatsappPhoneNumber: z.string().optional().nullable(),
  whatsappAccessToken: z.string().optional().nullable(),
  whatsappPhoneNumberId: z.string().optional().nullable(),
  whatsappBusinessAccountId: z.string().optional().nullable(),
  whatsappNotificationsEnabled: z.boolean().optional(),
});

const smsSettingsSchema = z.object({
  twilioAccountSid: z.string().optional().nullable(),
  twilioAuthToken: z.string().optional().nullable(),
  twilioPhoneNumber: z.string().optional().nullable(),
  smsRemindersEnabled: z.boolean().optional(),
});

type WhatsAppSettingsFormValues = z.infer<typeof whatsappSettingsSchema>;
type SMSSettingsFormValues = z.infer<typeof smsSettingsSchema>;

export default function NotificationSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [savingSMS, setSavingSMS] = useState(false);

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
    fetchWhatsAppSettings();
    fetchSMSSettings();
  }, []);

  const fetchWhatsAppSettings = async () => {
    try {
      const response = await fetch("/api/business/whatsapp-settings");
      if (response.ok) {
        const data = await response.json();
        whatsappForm.reset({
          whatsappPhoneNumber: data.whatsappPhoneNumber || "",
          whatsappAccessToken: data.hasAccessToken ? "••••••••" : "",
          whatsappPhoneNumberId: data.whatsappPhoneNumberId || "",
          whatsappBusinessAccountId: data.whatsappBusinessAccountId || "",
          whatsappNotificationsEnabled: data.whatsappNotificationsEnabled ?? false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch WhatsApp settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSMSSettings = async () => {
    try {
      const response = await fetch("/api/business/sms-config");
      if (response.ok) {
        const data = await response.json();
        smsForm.reset({
          twilioPhoneNumber: data.twilioPhoneNumber || "",
          twilioAccountSid: "",
          twilioAuthToken: "",
          smsRemindersEnabled: data.smsRemindersEnabled ?? false,
        });
      }
    } catch (error) {
      console.error("Failed to fetch SMS settings:", error);
    }
  };

  const onWhatsAppSubmit = async (data: WhatsAppSettingsFormValues) => {
    setSavingWhatsApp(true);
    try {
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp Settings */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>WhatsApp Notifications</CardTitle>
          </div>
          <CardDescription>
            Configure WhatsApp notifications for booking alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...whatsappForm}>
            <form onSubmit={whatsappForm.handleSubmit(onWhatsAppSubmit)} className="space-y-6">
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

              <div className="flex justify-end gap-4 pt-4">
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

      {/* SMS Settings */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle>SMS Notifications</CardTitle>
          </div>
          <CardDescription>
            Configure SMS notifications via Twilio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...smsForm}>
            <form onSubmit={smsForm.handleSubmit(onSMSSubmit)} className="space-y-6">
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

              <div className="flex justify-end gap-4 pt-4">
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
    </div>
  );
}
