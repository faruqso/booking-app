"use client";

import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, Shield, AlertCircle, CheckCircle2, XCircle, Info, ExternalLink, Copy, Check, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { getCurrenciesForProvider } from "@/lib/utils/currency";

const paymentConfigSchema = z.object({
  paymentProvider: z.enum(["stripe", "paystack", "flutterwave"]).nullable(),
  currency: z.string().min(3).max(3),
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

export default function PaymentSettings() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<{
    isConfigured: boolean;
    isWebhookConfigured: boolean;
    providerStatus: any;
  } | null>(null);

  const form = useForm<PaymentConfigFormValues>({
    resolver: zodResolver(paymentConfigSchema),
    defaultValues: {
      paymentProvider: null,
      currency: "USD",
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
  const selectedCurrency = form.watch("currency");
  const requirePayment = form.watch("requirePaymentDeposit");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  // Real-time validation for currency compatibility
  const getCurrencyValidation = () => {
    if (!selectedProvider || !selectedCurrency) return null;
    const availableCurrencies = getCurrenciesForProvider(selectedProvider);
    const isSupported = availableCurrencies.some(c => c.code === selectedCurrency);
    return {
      isValid: isSupported,
      message: isSupported 
        ? `${selectedCurrency} is supported by ${selectedProvider}`
        : `${selectedCurrency} is not supported by ${selectedProvider}. Please select a supported currency.`,
      supportedCurrencies: availableCurrencies.map(c => c.code)
    };
  };

  const currencyValidation = getCurrencyValidation();
  const isConfigurationValid = !selectedProvider || (selectedProvider && currencyValidation?.isValid !== false);

  const getWebhookUrl = (provider: string) => {
    if (typeof window === "undefined") return "";
    const baseUrl = window.location.origin;
    return `${baseUrl}/api/webhooks/${provider}`;
  };

  const copyWebhookUrl = (provider: string) => {
    const url = getWebhookUrl(provider);
    navigator.clipboard.writeText(url);
    setCopiedUrl(provider);
    setTimeout(() => setCopiedUrl(null), 2000);
    toast({
      title: "Copied!",
      description: "Webhook URL copied to clipboard",
    });
  };

  // Check if keys are test or production
  const getKeyType = (key: string | null | undefined): "test" | "live" | "none" => {
    if (!key) return "none";
    if (key.includes("test") || key.includes("TEST") || key.includes("FLWPUBK_TEST")) return "test";
    if (key.includes("live") || key.includes("LIVE") || key.includes("FLWPUBK")) return "live";
    return "none";
  };

  const stripePublishableKey = form.watch("stripePublishableKey");
  const paystackPublicKey = form.watch("paystackPublicKey");
  const flutterwavePublicKey = form.watch("flutterwavePublicKey");

  const stripeKeyType = getKeyType(stripePublishableKey);
  const paystackKeyType = getKeyType(paystackPublicKey);
  const flutterwaveKeyType = getKeyType(flutterwavePublicKey);

  useEffect(() => {
    if (status === "authenticated") {
      fetchPaymentConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Real-time currency validation when provider changes (only auto-correct on provider change, not currency change)
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  useEffect(() => {
    if (selectedProvider && selectedProvider !== lastProvider) {
      setLastProvider(selectedProvider);
      const availableCurrencies = getCurrenciesForProvider(selectedProvider);
      const currentCurrency = form.getValues("currency") || "USD";
      const isSupported = availableCurrencies.some(c => c.code === currentCurrency);
      
      if (!isSupported && availableCurrencies.length > 0) {
        // Auto-correct invalid currency only when provider changes
        const defaultCurrency = availableCurrencies.find(c => c.code === "USD") || availableCurrencies[0];
        form.setValue("currency", defaultCurrency.code, { shouldValidate: true });
        
        toast({
          title: "Currency Auto-Corrected",
          description: `${currentCurrency} is not supported by ${selectedProvider}. Changed to ${defaultCurrency.code}.`,
          variant: "default",
          duration: 5000,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider, lastProvider]);

  const fetchPaymentConfig = async () => {
    try {
      const response = await fetch("/api/business/payment-config");
      if (response.ok) {
        const data = await response.json();
        form.reset({
          paymentProvider: data.paymentProvider || null,
          currency: data.currency || "USD",
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
      // Also fetch webhook status
      await fetchWebhookStatus();
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

  const fetchWebhookStatus = async () => {
    try {
      const response = await fetch("/api/business/payment-config/status");
      if (response.ok) {
        const data = await response.json();
        setWebhookStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch webhook status:", error);
    }
  };

  // Refetch webhook status after saving
  useEffect(() => {
    if (!saving && selectedProvider) {
      fetchWebhookStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, selectedProvider]);

  const onSubmit = async (data: PaymentConfigFormValues) => {
    setSaving(true);
    try {
      // Only send secret keys if they were changed (not null/empty)
      const payload: any = {
        paymentProvider: data.paymentProvider,
        requirePaymentDeposit: data.requirePaymentDeposit,
        depositPercentage: data.depositPercentage,
      };

      // Always include currency (default to USD if not set)
      let currency = "USD";
      if (data.currency && data.currency.length === 3) {
        currency = data.currency;
      }
      
      // Validate currency is supported by the payment provider
      if (data.paymentProvider && currency) {
        const supportedCurrencies = getCurrenciesForProvider(data.paymentProvider);
        const isSupported = supportedCurrencies.some(c => c.code === currency);
        
        if (!isSupported) {
          const supportedCodes = supportedCurrencies.map(c => c.code).join(", ");
          toast({
            title: "Invalid Currency",
            description: `${currency} is not supported by ${data.paymentProvider}. Supported currencies: ${supportedCodes}`,
            variant: "destructive",
            duration: 8000,
          });
          setSaving(false);
          return;
        }
      }
      
      payload.currency = currency;

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
      // Refetch webhook status after successful save
      await fetchWebhookStatus();

      // Refresh config to get updated public keys, but preserve secret keys in form
      const currentFormValues = form.getValues();
      await fetchPaymentConfig();
      
      // Restore secret keys and currency that were just saved (they won't be in the fetched data for security)
      form.reset({
        ...form.getValues(), // Get the fresh values from fetchPaymentConfig
        // Preserve secret keys that were just saved
        stripeSecretKey: currentFormValues.stripeSecretKey || null,
        stripeWebhookSecret: currentFormValues.stripeWebhookSecret || null,
        paystackSecretKey: currentFormValues.paystackSecretKey || null,
        paystackWebhookSecret: currentFormValues.paystackWebhookSecret || null,
        flutterwaveSecretKey: currentFormValues.flutterwaveSecretKey || null,
        flutterwaveWebhookSecret: currentFormValues.flutterwaveWebhookSecret || null,
        // Preserve currency selection
        currency: currentFormValues.currency || "USD",
      });
    } catch (error: any) {
      console.error("Failed to update payment config:", error);
      
      // Handle specific error cases
      let errorMessage = error.message || "Failed to update payment configuration";
      let errorTitle = "Error";
      
      if (error.message?.includes("Database connection failed") || 
          error.message?.includes("Can't reach database server")) {
        errorTitle = "Database Connection Error";
        errorMessage = "Your database server is not reachable. This is usually because your Neon database is paused. Please check your Neon dashboard and ensure the database is active, then try again.";
      } else if (error.message?.includes("webhook")) {
        // Webhooks are optional, so this shouldn't happen, but just in case
        errorTitle = "Configuration Error";
        errorMessage = "Note: Webhook secrets are optional. You can save your payment configuration without them, though webhooks are recommended for production use.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <Card className="border-2">
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
    <div className="space-y-6">

      {/* Status Overview Card */}
      {selectedProvider && (
        <Card className={`border-2 ${isConfigurationValid ? "bg-gradient-to-r from-primary/5 to-primary/10" : "bg-destructive/5 border-destructive/20"}`}>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  {isConfigurationValid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{selectedProvider.charAt(0).toUpperCase() + selectedProvider.slice(1)}</span>
                      {selectedProvider === "stripe" && stripeKeyType !== "none" && (
                        <Badge variant={stripeKeyType === "test" ? "secondary" : "default"} className="text-xs">
                          {stripeKeyType === "test" ? "Test" : "Live"}
                        </Badge>
                      )}
                      {selectedProvider === "paystack" && paystackKeyType !== "none" && (
                        <Badge variant={paystackKeyType === "test" ? "secondary" : "default"} className="text-xs">
                          {paystackKeyType === "test" ? "Test" : "Live"}
                        </Badge>
                      )}
                      {selectedProvider === "flutterwave" && flutterwaveKeyType !== "none" && (
                        <Badge variant={flutterwaveKeyType === "test" ? "secondary" : "default"} className="text-xs">
                          {flutterwaveKeyType === "test" ? "Test" : "Live"}
                        </Badge>
                      )}
                      {selectedCurrency && currencyValidation?.isValid && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          {selectedCurrency}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {requirePayment 
                        ? form.watch("depositPercentage") 
                          ? `${form.watch("depositPercentage")}% deposit required`
                          : "Full payment required"
                        : "Payment disabled"}
                      {selectedCurrency && currencyValidation?.isValid && (
                        <span className="ml-2">• {selectedCurrency} currency</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Webhook Status */}
              {webhookStatus?.providerStatus && (
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Webhook Configuration</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {webhookStatus.isWebhookConfigured ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            Configured
                          </Badge>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">
                            Not Configured
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  {!webhookStatus.isWebhookConfigured && webhookStatus.providerStatus.isFullyConfigured && (
                    <Alert className="mt-2 bg-yellow-50 border-yellow-200">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-xs text-yellow-800">
                        Webhooks are not configured. Payments will work, but status updates may be delayed. 
                        Configure webhooks below for real-time payment confirmations.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>Payment Provider</CardTitle>
              </div>
              <CardDescription>
                Choose a payment provider
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
                      onValueChange={(value) => {
                        const newProvider = value === "none" ? null : (value as "stripe" | "paystack" | "flutterwave");
                        field.onChange(newProvider);
                        
                        // Reset currency to a supported default when provider changes
                        if (newProvider) {
                          const supportedCurrencies = getCurrenciesForProvider(newProvider);
                          const currentCurrency = form.getValues("currency") || "USD";
                          const isCurrentSupported = supportedCurrencies.some(c => c.code === currentCurrency);
                          
                          if (!isCurrentSupported && supportedCurrencies.length > 0) {
                            // Set to first supported currency (usually USD if available)
                            const defaultCurrency = supportedCurrencies.find(c => c.code === "USD") || supportedCurrencies[0];
                            form.setValue("currency", defaultCurrency.code, { shouldValidate: true });
                            
                            // Show toast notification about auto-correction
                            toast({
                              title: "Currency Updated",
                              description: `Currency automatically set to ${defaultCurrency.code} (supported by ${newProvider})`,
                              duration: 4000,
                            });
                          }
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Select provider" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (Disabled)</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="paystack">Paystack</SelectItem>
                        <SelectItem value="flutterwave">Flutterwave</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedProvider && (
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => {
                    const availableCurrencies = getCurrenciesForProvider(selectedProvider);
                    const currentCurrency = field.value || "USD";
                    const isSupported = availableCurrencies.some(c => c.code === currentCurrency);
                    const currencyInfo = availableCurrencies.find(c => c.code === currentCurrency);
                    
                    return (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <span>Currency</span>
                          {isSupported && currencyInfo && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Supported
                            </Badge>
                          )}
                          {!isSupported && currentCurrency && (
                            <Badge variant="destructive" className="text-xs">
                              <XCircle className="h-3 w-3 mr-1" />
                              Not Supported
                            </Badge>
                          )}
                        </FormLabel>
                        <Select
                          value={currentCurrency}
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Ensure we always set a supported currency
                            const selectedIsSupported = availableCurrencies.some(c => c.code === value);
                            if (!selectedIsSupported && availableCurrencies.length > 0) {
                              // Auto-correct to first supported currency if invalid
                              const defaultCurrency = availableCurrencies.find(c => c.code === "USD") || availableCurrencies[0];
                              field.onChange(defaultCurrency.code);
                            }
                          }}
                        >
                          <FormControl>
                            <SelectTrigger className={`h-11 ${!isSupported && currentCurrency ? "border-destructive focus:border-destructive" : ""}`}>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {availableCurrencies.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{currency.code}</span>
                                  <span className="text-muted-foreground">-</span>
                                  <span>{currency.name}</span>
                                  <span className="text-muted-foreground">({currency.symbol})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Only currencies supported by <strong>{selectedProvider}</strong> are available. This prevents payment errors for your customers.
                        </FormDescription>
                        {!isSupported && currentCurrency && (
                          <div className="mt-2 space-y-2">
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                <div className="space-y-1">
                                  <p className="font-medium">
                                    <strong>{currentCurrency}</strong> is not supported by <strong>{selectedProvider}</strong>.
                                  </p>
                                  <p className="text-sm">
                                    Supported currencies: {availableCurrencies.map(c => c.code).join(", ")}
                                  </p>
                                  <p className="text-sm mt-2">
                                    Please select a supported currency above to continue.
                                  </p>
                                </div>
                              </AlertDescription>
                            </Alert>
                          </div>
                        )}
                        {isSupported && currencyInfo && (
                          <Alert className="mt-2 bg-green-50 border-green-200">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                              <strong>{currentCurrency}</strong> ({currencyInfo.name}) is fully supported. Your customers will be able to pay in this currency.
                            </AlertDescription>
                          </Alert>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              )}

              {selectedProvider && (
                <div className="space-y-4 pt-4 border-t">

                  {selectedProvider === "stripe" && (
                    <>
                      <FormField
                        control={form.control}
                        name="stripePublishableKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center justify-between">
                              <span>Publishable Key</span>
                              <div className="flex items-center gap-2">
                                {field.value && (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    <Badge variant={stripeKeyType === "test" ? "secondary" : "default"} className="text-xs">
                                      {stripeKeyType === "test" ? "Test" : "Live"}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="pk_test_..."
                                className="h-11"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="stripeSecretKey"
                        render={({ field }) => {
                          const fieldId = "stripeSecretKey";
                          const hasValue = !!field.value;
                          const showValue = showSecrets[fieldId];
                          return (
                            <FormItem>
                              <FormLabel className="flex items-center justify-between">
                                <span>Secret Key</span>
                                {hasValue && (
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    <span className="text-xs text-muted-foreground">Configured</span>
                                  </div>
                                )}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showValue ? "text" : "password"}
                                    placeholder={hasValue ? "••••••••••••" : "sk_test_..."}
                                    className="h-11 pr-10"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                  {hasValue && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                                      onClick={() => setShowSecrets(prev => ({ ...prev, [fieldId]: !prev[fieldId] }))}
                                    >
                                      {showValue ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name="stripeWebhookSecret"
                        render={({ field }) => {
                          const fieldId = "stripeWebhookSecret";
                          const hasValue = !!field.value;
                          const showValue = showSecrets[fieldId];
                          return (
                            <FormItem>
                            <FormLabel className="flex items-center justify-between">
                              <span>
                                Webhook Secret
                                <span className="text-xs text-muted-foreground font-normal ml-2">(Optional)</span>
                              </span>
                              {hasValue && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                  <span className="text-xs text-muted-foreground">Configured</span>
                                </div>
                              )}
                            </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showValue ? "text" : "password"}
                                    placeholder={hasValue ? "••••••••••••" : "whsec_..."}
                                    className="h-11 pr-10"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                  {hasValue && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                                      onClick={() => setShowSecrets(prev => ({ ...prev, [fieldId]: !prev[fieldId] }))}
                                    >
                                      {showValue ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </FormControl>
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground mb-1.5">
                                Webhook URL <span className="text-muted-foreground/70">(Optional - recommended for production)</span>:
                              </p>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-3 py-2 rounded flex-1 font-mono truncate">
                                  {getWebhookUrl("stripe")}
                                </code>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyWebhookUrl("stripe")}
                                  className="h-9 flex-shrink-0"
                                >
                                  {copiedUrl === "stripe" ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1.5">
                                You can save your configuration without webhooks. Webhooks are optional but recommended for automatic payment status updates.
                              </p>
                            </div>
                            <FormMessage />
                          </FormItem>
                          );
                        }}
                      />
                    </>
                  )}

                  {selectedProvider === "paystack" && (
                    <>
                      <FormField
                        control={form.control}
                        name="paystackPublicKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center justify-between">
                              <span>Public Key</span>
                              <div className="flex items-center gap-2">
                                {field.value && (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    <Badge variant={paystackKeyType === "test" ? "secondary" : "default"} className="text-xs">
                                      {paystackKeyType === "test" ? "Test" : "Live"}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="pk_test_..."
                                className="h-11"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="paystackSecretKey"
                        render={({ field }) => {
                          const fieldId = "paystackSecretKey";
                          const hasValue = !!field.value;
                          const showValue = showSecrets[fieldId];
                          return (
                            <FormItem>
                              <FormLabel className="flex items-center justify-between">
                                <span>Secret Key</span>
                                {hasValue && (
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    <span className="text-xs text-muted-foreground">Configured</span>
                                  </div>
                                )}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showValue ? "text" : "password"}
                                    placeholder={hasValue ? "••••••••••••" : "sk_test_..."}
                                    className="h-11 pr-10"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                  {hasValue && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                                      onClick={() => setShowSecrets(prev => ({ ...prev, [fieldId]: !prev[fieldId] }))}
                                    >
                                      {showValue ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name="paystackWebhookSecret"
                        render={({ field }) => {
                          const fieldId = "paystackWebhookSecret";
                          const hasValue = !!field.value;
                          const showValue = showSecrets[fieldId];
                          return (
                            <FormItem>
                            <FormLabel className="flex items-center justify-between">
                              <span>
                                Webhook Secret
                                <span className="text-xs text-muted-foreground font-normal ml-2">(Optional)</span>
                              </span>
                              {hasValue && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                  <span className="text-xs text-muted-foreground">Configured</span>
                                </div>
                              )}
                            </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showValue ? "text" : "password"}
                                    placeholder={hasValue ? "••••••••••••" : "Webhook secret"}
                                    className="h-11 pr-10"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                  {hasValue && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                                      onClick={() => setShowSecrets(prev => ({ ...prev, [fieldId]: !prev[fieldId] }))}
                                    >
                                      {showValue ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </FormControl>
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground mb-1.5">Webhook URL:</p>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-3 py-2 rounded flex-1 font-mono truncate">
                                  {getWebhookUrl("paystack")}
                                </code>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyWebhookUrl("paystack")}
                                  className="h-9 flex-shrink-0"
                                >
                                  {copiedUrl === "paystack" ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                          );
                        }}
                      />
                    </>
                  )}

                  {selectedProvider === "flutterwave" && (
                    <>
                      <FormField
                        control={form.control}
                        name="flutterwavePublicKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center justify-between">
                              <span>Public Key</span>
                              <div className="flex items-center gap-2">
                                {field.value && (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    <Badge variant={flutterwaveKeyType === "test" ? "secondary" : "default"} className="text-xs">
                                      {flutterwaveKeyType === "test" ? "Test" : "Live"}
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="FLWPUBK-..."
                                className="h-11"
                                {...field}
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="flutterwaveSecretKey"
                        render={({ field }) => {
                          const fieldId = "flutterwaveSecretKey";
                          const hasValue = !!field.value;
                          const showValue = showSecrets[fieldId];
                          return (
                            <FormItem>
                              <FormLabel className="flex items-center justify-between">
                                <span>Secret Key</span>
                                {hasValue && (
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                    <span className="text-xs text-muted-foreground">Configured</span>
                                  </div>
                                )}
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showValue ? "text" : "password"}
                                    placeholder={hasValue ? "••••••••••••" : "FLWSECK-..."}
                                    className="h-11 pr-10"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                  {hasValue && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                                      onClick={() => setShowSecrets(prev => ({ ...prev, [fieldId]: !prev[fieldId] }))}
                                    >
                                      {showValue ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name="flutterwaveWebhookSecret"
                        render={({ field }) => {
                          const fieldId = "flutterwaveWebhookSecret";
                          const hasValue = !!field.value;
                          const showValue = showSecrets[fieldId];
                          return (
                            <FormItem>
                            <FormLabel className="flex items-center justify-between">
                              <span>
                                Webhook Secret
                                <span className="text-xs text-muted-foreground font-normal ml-2">(Optional)</span>
                              </span>
                              {hasValue && (
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                                  <span className="text-xs text-muted-foreground">Configured</span>
                                </div>
                              )}
                            </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Input
                                    type={showValue ? "text" : "password"}
                                    placeholder={hasValue ? "••••••••••••" : "Webhook secret"}
                                    className="h-11 pr-10"
                                    {...field}
                                    value={field.value || ""}
                                  />
                                  {hasValue && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                                      onClick={() => setShowSecrets(prev => ({ ...prev, [fieldId]: !prev[fieldId] }))}
                                    >
                                      {showValue ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                      ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </FormControl>
                            <div className="mt-2">
                              <p className="text-xs text-muted-foreground mb-1.5">Webhook URL:</p>
                              <div className="flex items-center gap-2">
                                <code className="text-xs bg-muted px-3 py-2 rounded flex-1 font-mono truncate">
                                  {getWebhookUrl("flutterwave")}
                                </code>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyWebhookUrl("flutterwave")}
                                  className="h-9 flex-shrink-0"
                                >
                                  {copiedUrl === "flutterwave" ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>
                            <FormMessage />
                          </FormItem>
                          );
                        }}
                      />
                    </>
                  )}
                </div>
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
                Configure payment requirements
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
                      <FormLabel>Deposit Percentage</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            className="h-11 text-base max-w-[120px]"
                            placeholder="0"
                            {...field}
                            value={field.value || ""}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : null)}
                          />
                          <span className="text-muted-foreground text-sm">% (leave empty for full payment)</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          {/* Configuration Status */}
          {selectedProvider && (
            <Card className={`border-2 ${isConfigurationValid ? "border-green-200 bg-green-50/50" : "border-destructive bg-destructive/5"}`}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  {isConfigurationValid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className={`font-semibold ${isConfigurationValid ? "text-green-900" : "text-destructive"}`}>
                      {isConfigurationValid ? "Configuration Ready" : "Configuration Issue"}
                    </p>
                    {isConfigurationValid ? (
                      <p className="text-sm text-green-700">
                        Your payment configuration is valid and ready to save. Customers will be able to complete payments successfully.
                      </p>
                    ) : (
                      <div className="space-y-2 text-sm text-destructive">
                        {currencyValidation && !currencyValidation.isValid && (
                          <p>
                            <strong>Currency Issue:</strong> {currencyValidation.message}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Please fix the issues above before saving. Invalid configurations will cause payment errors for your customers.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button 
              type="submit" 
              disabled={saving || !isConfigurationValid}
              className={!isConfigurationValid ? "opacity-50 cursor-not-allowed" : ""}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Payment Configuration"
              )}
            </Button>
          </div>
        </form>
      </Form>

      {/* Quick Reference */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4" />
              Testing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">Use test keys and test cards:</p>
            <ul className="text-xs text-muted-foreground ml-4 list-disc space-y-1">
              <li><strong>Stripe:</strong> 4242 4242 4242 4242</li>
              <li><strong>Paystack:</strong> 4084 0840 8408 4081</li>
              <li><strong>Flutterwave:</strong> 5531 8866 5214 2950</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Get API Keys
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                Stripe <ExternalLink className="h-3 w-3" />
              </a>
              <a href="https://dashboard.paystack.com/#/settings/developer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                Paystack <ExternalLink className="h-3 w-3" />
              </a>
              <a href="https://dashboard.flutterwave.com/settings/apis" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1">
                Flutterwave <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
