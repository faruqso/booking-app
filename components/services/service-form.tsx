"use client";

import { useState, useRef, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Clock, DollarSign, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

const serviceSchema = z.object({
  name: z
    .string()
    .min(2, "Service name must be at least 2 characters")
    .max(100, "Service name must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  duration: z
    .number()
    .min(5, "Duration must be at least 5 minutes")
    .max(480, "Duration cannot exceed 8 hours")
    .int("Duration must be a whole number"),
  price: z
    .number()
    .min(0, "Price cannot be negative")
    .max(10000, "Price seems too high"),
  isActive: z.boolean().default(true),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface Service {
  id?: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  isActive: boolean;
}

interface ServiceFormProps {
  service?: Service;
  onSuccess: () => void;
  onCancel: () => void;
  hideActions?: boolean;
}

export function ServiceForm({ service, onSuccess, onCancel, hideActions = false }: ServiceFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name || "",
      description: service?.description || "",
      duration: service?.duration || 30,
      price: typeof service?.price === 'number' ? service.price : (service?.price ? Number(service.price) : 0),
      isActive: service?.isActive ?? true,
    },
  });

  // Reset form when service prop changes (e.g., when opening edit modal)
  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name || "",
        description: service.description || "",
        duration: service.duration || 30,
        price: typeof service.price === 'number' ? service.price : Number(service.price) || 0,
        isActive: service.isActive ?? true,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        duration: 30,
        price: 0,
        isActive: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service?.id]); // Reset when service ID changes

  // Expose submit function to parent when hideActions is true
  useEffect(() => {
    if (hideActions) {
      (window as any).__serviceFormSubmit = () => {
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      };
    }
    return () => {
      if (hideActions) {
        delete (window as any).__serviceFormSubmit;
      }
    };
  }, [hideActions]);

  const onSubmit = async (data: ServiceFormValues) => {
    setLoading(true);
    
    // Notify parent that form is submitting
    if (hideActions && (window as any).__serviceFormSetSubmitting) {
      (window as any).__serviceFormSetSubmitting(true);
    }

    try {
      const url = service?.id
        ? `/api/services/${service.id}`
        : "/api/services";
      const method = service?.id ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save service");
      }

      toast({
        title: "Success",
        description: service?.id
          ? "Service updated successfully"
          : "Service created successfully",
      });

      // Small delay to show success state
      setTimeout(() => {
        onSuccess();
      }, 100);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save service",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      if (hideActions && (window as any).__serviceFormSetSubmitting) {
        (window as any).__serviceFormSetSubmitting(false);
      }
    }
  };

  const watchedValues = form.watch();
  const hasPreview = watchedValues.name && watchedValues.name.length > 0;
  const isFormValid = form.formState.isValid && watchedValues.name.length > 0;
  
  // Ensure price is always a number for preview
  // Prioritize service prop when editing (more reliable), then fall back to form value
  const servicePriceValue = service?.price;
  const formPriceValue = watchedValues.price;
  
  let previewPrice = 0;
  
  // If we have a service prop (editing mode), use it first
  if (service && servicePriceValue !== undefined && servicePriceValue !== null) {
    const numPrice = typeof servicePriceValue === 'number' ? servicePriceValue : Number(servicePriceValue);
    if (!isNaN(numPrice)) {
      previewPrice = numPrice;
    }
  }
  // Otherwise, use the form value if it's valid
  else if (typeof formPriceValue === 'number' && !isNaN(formPriceValue)) {
    previewPrice = formPriceValue;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Form Section */}
      <div className="lg:col-span-2 space-y-6">
        <Form {...form}>
          <form ref={formRef} onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Basic Information</h3>
                <Separator className="mb-4" />
              </div>

              {/* Service Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Service Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Haircut, Consultation, Massage"
                        className="h-11"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-sm">
                      Choose a clear, descriptive name for your service
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe what customers can expect from this service..."
                        rows={4}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-sm">
                      Optional: Help customers understand what this service includes
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Pricing & Duration Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Pricing & Duration</h3>
                <Separator className="mb-4" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={5}
                          max={480}
                          step={5}
                          placeholder="30"
                          className="h-11"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription className="text-sm">
                        How long does this service take?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base">Price</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8 h-11"
                            {...field}
                            value={field.value ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              const numValue = value === "" ? 0 : parseFloat(value);
                              field.onChange(isNaN(numValue) ? 0 : numValue);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormDescription className="text-sm">
                        Set the price for this service
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Status Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Availability</h3>
                <Separator className="mb-4" />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-4 bg-muted/30">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none flex-1">
                      <FormLabel className="text-base cursor-pointer">
                        Service is active
                      </FormLabel>
                      <FormDescription className="text-sm">
                        Active services are visible to customers and can be booked.
                        Uncheck to temporarily hide this service.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions - hidden if using sticky footer */}
            {!hideActions && (
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || !isFormValid}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {service?.id ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    service?.id ? "Update Service" : "Create Service"
                  )}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>

      {/* Preview Section - Sticky Sidebar */}
      <div className="lg:col-span-1">
        <div className="lg:sticky lg:top-6">
          <AnimatePresence mode="wait">
            {hasPreview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-background shadow-lg">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs font-medium">
                        <Sparkles className="h-3 w-3 mr-1.5" />
                        Live Preview
                      </Badge>
                      {watchedValues.isActive ? (
                        <Badge className="gap-1.5 bg-green-500 hover:bg-green-600 text-white">
                          <CheckCircle2 className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1.5">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-xl font-bold text-foreground leading-tight">
                          {watchedValues.name}
                        </h3>
                        {watchedValues.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-3 leading-relaxed">
                            {watchedValues.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 pt-3 border-t">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{watchedValues.duration || 0} min</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-bold text-lg text-foreground">
                            {previewPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground italic">
                          This is how customers will see your service
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-2 border-dashed bg-muted/30">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl" />
                        <Sparkles className="h-12 w-12 text-primary/40 relative z-10" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Start typing to see a live preview
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Your service will appear here as you fill out the form. The preview updates in real-time.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
