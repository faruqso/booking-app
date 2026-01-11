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
import { Loader2, Palette, Building2, Upload, X, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Separator } from "@/components/ui/separator";

const brandingSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
  logoUrl: z.string().optional(),
});

type BrandingFormValues = z.infer<typeof brandingSchema>;

export default function BrandingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const form = useForm<BrandingFormValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      businessName: "",
      primaryColor: "#3b82f6",
      logoUrl: "",
    },
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchBranding();
    }
  }, [status, router]);

  const fetchBranding = async () => {
    try {
      const response = await fetch("/api/business/branding");
      if (response.ok) {
        const data = await response.json();
        form.reset({
          businessName: data.businessName || "",
          primaryColor: data.primaryColor || "#3b82f6",
          logoUrl: data.logoUrl || "",
        });
        if (data.logoUrl) {
          setLogoPreview(data.logoUrl);
        }
      }
    } catch (error) {
      console.error("Failed to fetch branding:", error);
      toast({
        title: "Error",
        description: "Failed to load branding settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      setLogoPreview(result);
      form.setValue("logoUrl", result);
    };
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    form.setValue("logoUrl", "");
  };

  const onSubmit = async (data: BrandingFormValues) => {
    setSaving(true);
    try {
      const response = await fetch("/api/business/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update branding");
      }

      toast({
        title: "Success",
        description: "Branding updated successfully! Your changes will appear on your booking page.",
      });

      // Update CSS variable for immediate preview
      if (data.primaryColor) {
        document.documentElement.style.setProperty("--brand-primary", data.primaryColor);
      }
    } catch (error: any) {
      console.error("Failed to update branding:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update branding",
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
            <Skeleton className="h-32 w-full" />
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
            <h1 className="text-3xl font-bold tracking-tight">Branding & Settings</h1>
            <HelpTooltip content="Customize your business branding that customers see on your booking page and emails. Your logo and brand colors will appear throughout your booking experience." />
          </div>
          <p className="text-muted-foreground">
            Customize how your business appears to customers
          </p>
        </div>
      </div>

      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Branding Customization</CardTitle>
          </div>
          <CardDescription>
            These settings control how your business appears on your public booking page and in customer communications.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Business Name */}
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Business Name
                    </FormLabel>
                    <FormDescription className="text-sm">
                      This is how customers will see your business name on the booking page and in emails
                    </FormDescription>
                    <FormControl>
                      <Input
                        placeholder="Your Business Name"
                        className="h-11 text-base"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Logo Upload */}
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Business Logo
                    </FormLabel>
                    <FormDescription className="text-sm">
                      Upload your business logo (max 2MB, PNG/JPG). This will appear on your booking page and in email notifications.
                    </FormDescription>
                    <FormControl>
                      <div className="space-y-4">
                        {logoPreview ? (
                          <div className="relative inline-block">
                            <div className="relative w-32 h-32 border-2 border-dashed border-muted rounded-lg overflow-hidden bg-muted/50">
                              <img
                                src={logoPreview}
                                alt="Logo preview"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                              onClick={removeLogo}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted rounded-lg cursor-pointer bg-muted/50 hover:bg-muted/70 transition-colors">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">
                                <span className="font-semibold">Click to upload</span> or drag and drop
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                PNG, JPG up to 2MB
                              </p>
                            </div>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleLogoChange}
                            />
                          </label>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Primary Color */}
              <FormField
                control={form.control}
                name="primaryColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Primary Brand Color
                    </FormLabel>
                    <FormDescription className="text-sm">
                      Choose your primary brand color. This color will be used for buttons, links, and highlights on your booking page.
                    </FormDescription>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <Input
                          type="color"
                          className="h-12 w-24 cursor-pointer"
                          {...field}
                        />
                        <Input
                          type="text"
                          placeholder="#3b82f6"
                          className="h-11 text-base font-mono max-w-[120px]"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.startsWith("#") || value === "") {
                              field.onChange(value);
                            } else {
                              field.onChange(`#${value}`);
                            }
                          }}
                        />
                        <div
                          className="h-12 w-24 rounded-md border-2 border-muted"
                          style={{ backgroundColor: field.value }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Preview Section */}
              <div className="rounded-lg border-2 bg-muted/30 p-6">
                <h3 className="text-sm font-semibold mb-4">Preview</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="h-12 object-contain"
                      />
                    )}
                    <div>
                      <p className="font-semibold">{form.watch("businessName") || "Your Business Name"}</p>
                      <p className="text-sm text-muted-foreground">This is how customers will see your branding</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      style={{ backgroundColor: form.watch("primaryColor") }}
                      className="text-white"
                    >
                      Preview Button
                    </Button>
                    <Button type="button" variant="outline">
                      Secondary Button
                    </Button>
                  </div>
                </div>
              </div>

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
              <CardTitle className="text-base">Where Your Branding Appears</CardTitle>
              <CardDescription className="text-sm mt-1">
                Your branding settings affect:
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Your public booking page (visible to customers)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Booking confirmation emails</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Booking reminder emails</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1">•</span>
              <span>Booking cancellation emails</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

