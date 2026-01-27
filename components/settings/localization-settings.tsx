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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Globe, Clock, Calendar, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { detectDateFormat, detectTimeFormat, detectTimezone } from "@/lib/locale-detection";

const localizationSchema = z.object({
  timezone: z.string().min(1, "Timezone is required"),
  dateFormat: z.enum(["MMM d, yyyy", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "MMMM d, yyyy", "d MMM yyyy"]),
  timeFormat: z.enum(["h:mm a", "HH:mm"]),
});

type LocalizationFormValues = z.infer<typeof localizationSchema>;

// Common timezones
const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "Eastern Time (US & Canada)" },
  { value: "America/Chicago", label: "Central Time (US & Canada)" },
  { value: "America/Denver", label: "Mountain Time (US & Canada)" },
  { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
  { value: "Europe/London", label: "London" },
  { value: "Europe/Paris", label: "Paris" },
  { value: "Europe/Berlin", label: "Berlin" },
  { value: "Asia/Tokyo", label: "Tokyo" },
  { value: "Asia/Shanghai", label: "Shanghai" },
  { value: "Asia/Dubai", label: "Dubai" },
  { value: "Australia/Sydney", label: "Sydney" },
  { value: "America/Toronto", label: "Toronto" },
  { value: "America/Mexico_City", label: "Mexico City" },
  { value: "America/Sao_Paulo", label: "São Paulo" },
  { value: "Asia/Kolkata", label: "Mumbai, Kolkata" },
  { value: "Asia/Singapore", label: "Singapore" },
];

const DATE_FORMATS = [
  { value: "MMM d, yyyy", label: "Jan 15, 2024", example: "Jan 15, 2024" },
  { value: "MM/dd/yyyy", label: "01/15/2024", example: "01/15/2024" },
  { value: "dd/MM/yyyy", label: "15/01/2024", example: "15/01/2024" },
  { value: "yyyy-MM-dd", label: "2024-01-15", example: "2024-01-15" },
  { value: "MMMM d, yyyy", label: "January 15, 2024", example: "January 15, 2024" },
  { value: "d MMM yyyy", label: "15 Jan 2024", example: "15 Jan 2024" },
];

const TIME_FORMATS = [
  { value: "h:mm a", label: "12-hour (3:45 PM)", example: "3:45 PM" },
  { value: "HH:mm", label: "24-hour (15:45)", example: "15:45" },
];

export default function LocalizationSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoDetectEnabled, setAutoDetectEnabled] = useState(false);

  const form = useForm<LocalizationFormValues>({
    resolver: zodResolver(localizationSchema),
    defaultValues: {
      timezone: "UTC",
      dateFormat: "MMM d, yyyy",
      timeFormat: "h:mm a",
    },
  });

  useEffect(() => {
    fetchLocalization();
  }, []);

  const fetchLocalization = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/business/localization");
      if (response.ok) {
        const data = await response.json();
        form.reset({
          timezone: data.timezone || "UTC",
          dateFormat: data.dateFormat || "MMM d, yyyy",
          timeFormat: data.timeFormat || "h:mm a",
        });
      }
    } catch (error) {
      console.error("Failed to fetch localization settings:", error);
      toast({
        title: "Error",
        description: "Failed to load localization settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDetect = (showToast = true) => {
    try {
      const detectedDateFormat = detectDateFormat();
      const detectedTimeFormat = detectTimeFormat();
      const detectedTimezone = detectTimezone();
      
      form.setValue("dateFormat", detectedDateFormat);
      form.setValue("timeFormat", detectedTimeFormat);
      form.setValue("timezone", detectedTimezone);
      
      if (showToast) {
        toast({
          title: "Settings Detected",
          description: `Detected date format: ${detectedDateFormat}, time format: ${detectedTimeFormat}, timezone: ${detectedTimezone}`,
        });
      }
    } catch (error) {
      console.error("Failed to auto-detect settings:", error);
      if (showToast) {
        toast({
          title: "Detection Failed",
          description: "Could not detect system settings. Please select manually.",
          variant: "destructive",
        });
      }
    }
  };

  const onSubmit = async (data: LocalizationFormValues) => {
    setSaving(true);
    try {
      const response = await fetch("/api/business/localization", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update localization settings");
      }

      toast({
        title: "Success",
        description: "Localization settings updated successfully!",
      });
    } catch (error: any) {
      console.error("Failed to update localization settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update localization settings",
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
          <Globe className="h-5 w-5 text-primary" />
          <CardTitle>Localization Settings</CardTitle>
          <HelpTooltip content="Configure timezone, date format, and time format for your business. These settings affect how dates and times are displayed throughout the application." />
        </div>
        <CardDescription>
          Set your timezone and preferred date/time display formats
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Auto-detect Option */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="auto-detect"
                    checked={autoDetectEnabled}
                    onCheckedChange={(checked) => {
                      setAutoDetectEnabled(checked as boolean);
                      if (checked) {
                        handleAutoDetect(true);
                      }
                    }}
                  />
                  <Label
                    htmlFor="auto-detect"
                    className="text-sm font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                    Automatically detect from system settings
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoDetect(true)}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Detect Now
                </Button>
              </div>
              <p className="text-xs text-muted-foreground px-1">
                {autoDetectEnabled 
                  ? "Auto-detection is enabled. Settings will be automatically detected from your browser/system preferences."
                  : "Enable auto-detection to automatically set date format, time format, and timezone from your system settings. You can also click 'Detect Now' to detect once."}
              </p>
            </div>

            <Separator />

            {/* Timezone */}
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timezone
                  </FormLabel>
                  <FormDescription className="text-sm">
                    Select your business timezone. All times will be displayed in this timezone.
                  </FormDescription>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            {/* Date Format */}
            <FormField
              control={form.control}
              name="dateFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Date Format
                  </FormLabel>
                  <FormDescription className="text-sm">
                    Choose how dates are displayed throughout the application.
                  </FormDescription>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="Select date format" />
                      </SelectTrigger>
                      <SelectContent>
                        {DATE_FORMATS.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label} ({format.example})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-muted-foreground">
                    Example: {DATE_FORMATS.find(f => f.value === field.value)?.example || "Jan 15, 2024"}
                  </div>
                </FormItem>
              )}
            />

            <Separator />

            {/* Time Format */}
            <FormField
              control={form.control}
              name="timeFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time Format
                  </FormLabel>
                  <FormDescription className="text-sm">
                    Choose between 12-hour (AM/PM) or 24-hour time format.
                  </FormDescription>
                  <FormControl>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-11 text-base">
                        <SelectValue placeholder="Select time format" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_FORMATS.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            {format.label} ({format.example})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                  <div className="text-xs text-muted-foreground">
                    Example: {TIME_FORMATS.find(f => f.value === field.value)?.example || "3:45 PM"}
                  </div>
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Localization Settings"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
