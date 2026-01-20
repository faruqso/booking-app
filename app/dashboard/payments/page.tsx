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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CreditCard, Shield, HelpCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const paymentConfigSchema = z.object({
  paymentProvider: z.enum(["stripe", "paystack", "flutterwave"]).nullable(),
  stripePublishableKey: z.string().optional().nullable(),
  stripeSecretKey: z.string().optional().nullable(),
  stripeWebhookSecret: z.string().optional().nullable(),
  paystackPublicKey: z.string().optional().nullable(),
  paystackSecretKey: z.string().optional().nullable(),
  paystackWebhookSecret: z.string().optional().nullable(),
  flutterwavePublicKey: z.string().optional().nullable(),
  flutterwaveSecretKey: z.string().optional().nullable(),
  flutterwaveWebhookSecret: z.string().optional().nullable(),
  requirePaymentDeposit: z.boolean(),
  depositPercentage: z.number().min(0).max(100).nullable().optional(),
});

type PaymentConfigFormValues = z.infer<typeof paymentConfigSchema>;

export default function PaymentsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const form = useForm<PaymentConfigFormValues>({
    resolver: zodResolver(paymentConfigSchema),
    defaultValues: {
      paymentProvider: null,
      stripePublishableKey: null,
      stripeSecretKey: null,
      stripeWebhookSecret: null,
      paystackPublicKey: null,
      paystackSecretKey: null,
      paystackWebhookSecret: null,
      flutterwavePublicKey: null,
      flutterwaveSecretKey: null,
      flutterwaveWebhookSecret: null,
      requirePaymentDeposit: false,
      depositPercentage: null,
    },
  });

  const selectedProvider = form.watch("paymentProvider");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== "BUSINESS_OWNER") {
      router.push("/dashboard");
    } else if (status === "authenticated") {
      fetchPaymentConfig();
    }
  }, [status, router, session]);

  const fetchPaymentConfig = async () => {
    try {
      const response = await fetch("/api/business/payment-config");
      if (response.ok) {
        const data = await response.json();
        form.reset({
          paymentProvider: data.paymentProvider || null,
          stripePublishableKey: data.stripePublishableKey || null,
          stripeSecretKey: null, // Never populate secret keys
          stripeWebhookSecret: null,
          paystackPublicKey: data.paystackPublicKey || null,
          paystackSecretKey: null,
          paystackWebhookSecret: null,
          flutterwavePublicKey: data.flutterwavePublicKey || null,
          flutterwaveSecretKey: null,
          flutterwaveWebhookSecret: null,
          requirePaymentDeposit: data.requirePaymentDeposit ?? false,
          depositPercentage: data.depositPercentage || null,
        });
      }
    } catch (error) {
      console.error("Failed to fetch payment config:", error);
      toast({
        title: "Error",
        description: "Failed to load payment configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: PaymentConfigFormValues) => {
    setSaving(true);
    try {
      // Only send secret keys if they were changed (not null/empty)
      const payload: any = {
        paymentProvider: data.paymentProvider,
        requirePaymentDeposit: data.requirePaymentDeposit,
        depositPercentage: data.depositPercentage,
      };

      // Stripe keys (only if provider is stripe)
      if (data.paymentProvider === "stripe") {
        if (data.stripePublishableKey !== undefined) {
          payload.stripePublishableKey = data.stripePublishableKey || null;
        }
        if (data.stripeSecretKey) {
          payload.stripeSecretKey = data.stripeSecretKey;
        }
        if (data.stripeWebhookSecret) {
          payload.stripeWebhookSecret = data.stripeWebhookSecret;
        }
      }

      // Paystack keys (only if provider is paystack)
      if (data.paymentProvider === "paystack") {
        if (data.paystackPublicKey !== undefined) {
          payload.paystackPublicKey = data.paystackPublicKey || null;
        }
        if (data.paystackSecretKey) {
          payload.paystackSecretKey = data.paystackSecretKey;
        }
        if (data.paystackWebhookSecret) {
          payload.paystackWebhookSecret = data.paystackWebhookSecret;
        }
      }

      // Flutterwave keys (only if provider is flutterwave)
      if (data.paymentProvider === "flutterwave") {
        if (data.flutterwavePublicKey !== undefined) {
          payload.flutterwavePublicKey = data.flutterwavePublicKey || null;
        }
        if (data.flutterwaveSecretKey) {
          payload.flutterwaveSecretKey = data.flutterwaveSecretKey;
        }
        if (data.flutterwaveWebhookSecret) {
          payload.flutterwaveWebhookSecret = data.flutterwaveWebhookSecret;
        }
      }

      const response = await fetch("/api/business/payment-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update payment configuration");
      }

      toast({
        title: "Success",
        description: "Payment configuration updated successfully!",
      });

      // Refresh config to get updated public keys
      fetchPaymentConfig();
    } catch (error: any) {
      console.error("Failed to update payment config:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update payment configuration",
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

  const getWebhookUrl = (provider: string) => {
    if (typeof window === "undefined") return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/webhooks/${provider}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Payment Configuration</h1>
          <HelpTooltip content="Configure payment providers to accept deposits or full payments for bookings. You can enable Stripe, Paystack, or Flutterwave." />
        </div>
        <p className="text-muted-foreground">
          Set up payment processing for your bookings
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Payment Provider</CardTitle>
              </div>
              <CardDescription>
                Select which payment provider you want to use for processing bookings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="paymentProvider"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Provider</FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a payment provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Payment Provider (Disabled)</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="paystack">Paystack</SelectItem>
                        <SelectItem value="flutterwave">Flutterwave</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Choose a payment provider to accept payments for bookings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedProvider && (
                <>
                  <Separator />
                  <Tabs defaultValue={selectedProvider} value={selectedProvider}>
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="stripe" disabled={selectedProvider !== "stripe"}>
                        Stripe
                      </TabsTrigger>
                      <TabsTrigger value="paystack" disabled={selectedProvider !== "paystack"}>
                        Paystack
                      </TabsTrigger>
                      <TabsTrigger value="flutterwave" disabled={selectedProvider !== "flutterwave"}>
                        Flutterwave
                      </TabsTrigger>
                    </TabsList>

                    {/* Stripe Configuration */}
                    <TabsContent value="stripe" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="stripePublishableKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stripe Publishable Key</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="pk_test_..."
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Your Stripe publishable key (starts with pk_test_ or pk_live_)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="stripeSecretKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stripe Secret Key</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="sk_test_... (leave blank to keep current)"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Your Stripe secret key (starts with sk_test_ or sk_live_). Leave blank to keep the current key.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="stripeWebhookSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stripe Webhook Secret</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="whsec_... (leave blank to keep current)"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Webhook signing secret from Stripe. Use this URL:{" "}
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {getWebhookUrl("stripe")}
                              </code>
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    {/* Paystack Configuration */}
                    <TabsContent value="paystack" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="paystackPublicKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Paystack Public Key</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="pk_test_..."
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Your Paystack public key (starts with pk_test_ or pk_live_)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="paystackSecretKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Paystack Secret Key</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="sk_test_... (leave blank to keep current)"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Your Paystack secret key (starts with sk_test_ or sk_live_). Leave blank to keep the current key.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="paystackWebhookSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Paystack Webhook Secret</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Webhook secret (leave blank to keep current)"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Webhook signing secret from Paystack. Use this URL:{" "}
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {getWebhookUrl("paystack")}
                              </code>
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>

                    {/* Flutterwave Configuration */}
                    <TabsContent value="flutterwave" className="space-y-4">
                      <FormField
                        control={form.control}
                        name="flutterwavePublicKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flutterwave Public Key</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="FLWPUBK-..."
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Your Flutterwave public key (starts with FLWPUBK-)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="flutterwaveSecretKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flutterwave Secret Key</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="FLWSECK-... (leave blank to keep current)"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Your Flutterwave secret key (starts with FLWSECK-). Leave blank to keep the current key.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="flutterwaveWebhookSecret"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Flutterwave Webhook Secret</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Webhook secret (leave blank to keep current)"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormDescription>
                              Webhook signing secret from Flutterwave. Use this URL:{" "}
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {getWebhookUrl("flutterwave")}
                              </code>
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </CardContent>
          </Card>

          {/* Deposit Settings */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Deposit Settings</CardTitle>
              </div>
              <CardDescription>
                Configure whether customers need to pay a deposit or full amount when booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="requirePaymentDeposit"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Require Payment at Booking</FormLabel>
                      <FormDescription>
                        When enabled, customers must pay a deposit or full amount when creating a booking
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {form.watch("requirePaymentDeposit") && (
                <FormField
                  control={form.control}
                  name="depositPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deposit Percentage (Optional)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="h-11 text-base max-w-[120px]"
                            placeholder="50"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                          <span className="text-muted-foreground">%</span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Percentage of total service price required as deposit. Leave empty for full payment.
                      </FormDescription>
                      <FormMessage />
                      <div className="text-xs text-muted-foreground">
                        Example: 50 means customers pay 50% of the service price as a deposit, remaining 50% can be paid later.
                      </div>
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
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
                "Save Configuration"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Info Card */}
      <Card className="border-2 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <CardTitle className="text-base">Payment Provider Setup</CardTitle>
              <CardDescription className="text-sm mt-1">
                Get your API keys from your payment provider dashboard:
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span><strong>Stripe:</strong> Get keys from <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary underline">Stripe Dashboard</a> → API Keys</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span><strong>Paystack:</strong> Get keys from <a href="https://dashboard.paystack.com/#/settings/developer" target="_blank" rel="noopener noreferrer" className="text-primary underline">Paystack Dashboard</a> → Settings → API Keys & Webhooks</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span><strong>Flutterwave:</strong> Get keys from <a href="https://dashboard.flutterwave.com/settings/apis" target="_blank" rel="noopener noreferrer" className="text-primary underline">Flutterwave Dashboard</a> → Settings → API</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
