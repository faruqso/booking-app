"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
import { Autocomplete, AutocompleteOption } from "@/components/ui/autocomplete";
import { Loader2, Clock, DollarSign, CheckCircle2, XCircle, Sparkles, Wand2, Lightbulb, Image, Tag, Users, CalendarX, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { 
  getServiceSuggestions, 
  detectCategory, 
  getDurationSuggestion, 
  getPriceSuggestion,
  type ServiceCategory 
} from "@/lib/ai/service-database";
import { formatValidationError, getValidationTip } from "@/lib/ai/form-validation";

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
  isActive: z.boolean(),
  bufferTimeBefore: z.number().min(0).max(60).int().optional(),
  bufferTimeAfter: z.number().min(0).max(60).int().optional(),
  imageUrl: z.union([z.string().url("Must be a valid URL"), z.literal("")]).optional(),
  category: z.string().max(50, "Category must be less than 50 characters").optional(),
  maxCapacity: z.number().min(1).max(100).int().optional(),
  cancellationPolicyHours: z.number().min(0).int().optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface Service {
  id?: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  isActive: boolean;
  bufferTimeBefore?: number;
  bufferTimeAfter?: number;
  imageUrl?: string;
  category?: string;
  maxCapacity?: number;
  cancellationPolicyHours?: number;
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
  const [autocompleteOptions, setAutocompleteOptions] = useState<AutocompleteOption[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [detectedCategory, setDetectedCategory] = useState<ServiceCategory | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name || "",
      description: service?.description || "",
      duration: service?.duration || 30,
      price: typeof service?.price === 'number' ? service.price : (service?.price ? Number(service.price) : 0),
      isActive: service?.isActive ?? true,
      bufferTimeBefore: service?.bufferTimeBefore ?? 0,
      bufferTimeAfter: service?.bufferTimeAfter ?? 0,
      imageUrl: service?.imageUrl || "",
      category: service?.category || "",
      maxCapacity: service?.maxCapacity ?? 1,
      cancellationPolicyHours: service?.cancellationPolicyHours,
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
        bufferTimeBefore: service.bufferTimeBefore ?? 0,
        bufferTimeAfter: service.bufferTimeAfter ?? 0,
        imageUrl: service.imageUrl || "",
        category: service.category || "",
        maxCapacity: service.maxCapacity ?? 1,
        cancellationPolicyHours: service.cancellationPolicyHours,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        duration: 30,
        price: 0,
        isActive: true,
        bufferTimeBefore: 0,
        bufferTimeAfter: 0,
        imageUrl: "",
        category: "",
        maxCapacity: 1,
        cancellationPolicyHours: undefined,
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

      // Clean up data: convert empty strings to undefined for optional fields
      const cleanedData = {
        ...data,
        imageUrl: data.imageUrl === "" ? undefined : data.imageUrl,
        category: data.category === "" ? undefined : data.category,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanedData),
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
  const serviceName = watchedValues.name || "";
  const hasPreview = serviceName && serviceName.length > 0;
  const isFormValid = form.formState.isValid && serviceName.length > 0;

  // Fetch autocomplete suggestions
  useEffect(() => {
    if (serviceName.length >= 2) {
      setLoadingSuggestions(true);
      const suggestions = getServiceSuggestions(serviceName, 10);
      setAutocompleteOptions(
        suggestions.map(s => ({
          value: s.name,
          label: s.name,
          description: `${s.category} • ${s.typicalDuration} min • $${s.priceRange.typical}`,
          metadata: {
            category: s.category,
            typicalDuration: s.typicalDuration,
            priceRange: s.priceRange,
            tags: s.tags,
          },
        }))
      );
      setLoadingSuggestions(false);
    } else {
      setAutocompleteOptions([]);
    }
  }, [serviceName]);

  // Detect category when service name changes
  useEffect(() => {
    if (serviceName.length >= 2) {
      const category = detectCategory(serviceName);
      setDetectedCategory(category);
    } else {
      setDetectedCategory(null);
    }
  }, [serviceName]);

  // Handle service selection from autocomplete
  const handleServiceSelect = (option: AutocompleteOption) => {
    const metadata = option.metadata as any;
    if (metadata) {
      // Auto-fill duration and price
      if (metadata.typicalDuration) {
        form.setValue("duration", metadata.typicalDuration);
      }
      if (metadata.priceRange?.typical) {
        form.setValue("price", metadata.priceRange.typical);
      }
      
      // Show success toast
      toast({
        title: "Service selected",
        description: `Auto-filled duration and price for ${metadata.category || "this service"}`,
      });
      
      setShowSuggestions(true);
    }
  };

  // Get duration and price suggestions for current service name
  const durationSuggestion = useMemo(() => {
    if (serviceName.length >= 2) {
      return getDurationSuggestion(serviceName, detectedCategory || undefined);
    }
    return null;
  }, [serviceName, detectedCategory]);

  const priceSuggestion = useMemo(() => {
    if (serviceName.length >= 2) {
      return getPriceSuggestion(serviceName, detectedCategory || undefined);
    }
    return null;
  }, [serviceName, detectedCategory]);

  // Generate service description using AI
  const handleGenerateDescription = async () => {
    if (!serviceName || serviceName.length < 2) {
      toast({
        title: "Service name required",
        description: "Please enter a service name first",
        variant: "destructive",
      });
      return;
    }

    setGeneratingDescription(true);
    try {
      const response = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceName,
          category: detectedCategory || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate description");
      }

      const data = await response.json();
      form.setValue("description", data.description);
      
      toast({
        title: data.fallback ? "Template description added" : "Description generated",
        description: data.fallback 
          ? "Added a template description. Install Ollama for AI-powered descriptions."
          : "AI-generated description added. Feel free to edit it.",
      });
    } catch (error: any) {
      console.error("Failed to generate description:", error);
      // Fallback to template-based description
      const templateDescription = `Professional ${serviceName} service. Experience quality and expertise tailored to your needs.${detectedCategory ? ` Our ${detectedCategory.toLowerCase()} services are designed to meet your expectations.` : ""}`;
      form.setValue("description", templateDescription);
      toast({
        title: "Description added",
        description: "Added a template description. You can customize it.",
      });
    } finally {
      setGeneratingDescription(false);
    }
  };

  // Enhanced validation messages
  const getFieldError = (fieldName: keyof ServiceFormValues) => {
    const error = form.formState.errors[fieldName];
    if (!error) return null;

    const fieldValue = watchedValues[fieldName];
    return formatValidationError(
      fieldName,
      { type: error.type || "validation", message: error.message },
      fieldValue
    );
  };
  
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

              {/* Service Name with Autocomplete */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => {
                  const nameError = getFieldError("name");
                  const nameTip = getValidationTip("name", field.value);
                  
                  return (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-2">
                        Service Name
                        {detectedCategory && (
                          <Badge variant="secondary" className="text-xs">
                            <Wand2 className="h-3 w-3 mr-1" />
                            {detectedCategory}
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Autocomplete
                          value={field.value}
                          onChange={field.onChange}
                          onSelect={handleServiceSelect}
                          options={autocompleteOptions}
                          placeholder="Start typing... (e.g., Haircut, Consultation, Massage)"
                          className="w-full"
                          inputClassName="h-11"
                          emptyMessage="Keep typing to see suggestions"
                          disabled={loading}
                        />
                      </FormControl>
                      {nameTip && (
                        <FormDescription className="text-sm flex items-start gap-2 text-muted-foreground">
                          <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{nameTip}</span>
                        </FormDescription>
                      )}
                      {!nameTip && (
                        <FormDescription className="text-sm">
                          Choose a clear, descriptive name. Suggestions will appear as you type.
                        </FormDescription>
                      )}
                      {nameError && (
                        <p className="text-sm font-medium text-destructive">{nameError.message}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => {
                  const descriptionError = getFieldError("description");
                  const descriptionTip = getValidationTip("description", field.value);
                  const canGenerate = serviceName && serviceName.length >= 2;
                  
                  return (
                    <FormItem>
                      <FormLabel className="text-base flex items-center justify-between">
                        <span>Description</span>
                        {canGenerate && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleGenerateDescription}
                            disabled={generatingDescription || loading}
                            className="h-8 text-xs"
                          >
                            {generatingDescription ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-3 w-3 mr-1.5" />
                                Generate with AI
                              </>
                            )}
                          </Button>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what customers can expect from this service..."
                          rows={4}
                          className="resize-none"
                          {...field}
                          disabled={generatingDescription}
                        />
                      </FormControl>
                      {descriptionTip && (
                        <FormDescription className="text-sm flex items-start gap-2 text-muted-foreground">
                          <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>{descriptionTip}</span>
                        </FormDescription>
                      )}
                      {!descriptionTip && (
                        <FormDescription className="text-sm">
                          Optional: Help customers understand what this service includes. Click &quot;Generate with AI&quot; to auto-create a description.
                        </FormDescription>
                      )}
                      {descriptionError && (
                        <p className="text-sm font-medium text-destructive">{descriptionError.message}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
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
                  render={({ field }) => {
                    const durationError = getFieldError("duration");
                    const durationTip = getValidationTip("duration", field.value);
                    const shouldShowSuggestion = durationSuggestion && (field.value === undefined || field.value === null || field.value === 0);
                    
                    return (
                      <FormItem>
                        <FormLabel className="text-base">Duration (minutes)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              min={5}
                              max={480}
                              step={5}
                              placeholder={durationSuggestion ? `${durationSuggestion} (suggested)` : "30"}
                              className="h-11"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                            {shouldShowSuggestion && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1 h-9 text-xs"
                                onClick={() => {
                                  field.onChange(durationSuggestion);
                                  toast({
                                    title: "Duration auto-filled",
                                    description: `Based on similar services in ${detectedCategory || "this category"}`,
                                  });
                                }}
                              >
                                <Wand2 className="h-3 w-3 mr-1" />
                                Use {durationSuggestion} min
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        {durationTip && (
                          <FormDescription className="text-sm flex items-start gap-2 text-muted-foreground">
                            <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{durationTip}</span>
                          </FormDescription>
                        )}
                        {!durationTip && durationSuggestion && field.value && (
                          <FormDescription className="text-sm">
                            Typical duration for similar services: {durationSuggestion} minutes
                          </FormDescription>
                        )}
                        {!durationTip && !durationSuggestion && (
                          <FormDescription className="text-sm">
                            How long does this service take?
                          </FormDescription>
                        )}
                        {durationError && (
                          <p className="text-sm font-medium text-destructive">{durationError.message}</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => {
                    const priceError = getFieldError("price");
                    const priceTip = getValidationTip("price", field.value);
                    const shouldShowSuggestion = priceSuggestion && (field.value === undefined || field.value === null || field.value === 0);
                    
                    return (
                      <FormItem>
                        <FormLabel className="text-base">Price</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              placeholder={priceSuggestion ? `${priceSuggestion.typical.toFixed(2)} (suggested)` : "0.00"}
                              className="pl-8 h-11"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                const numValue = value === "" ? 0 : parseFloat(value);
                                field.onChange(isNaN(numValue) ? 0 : numValue);
                              }}
                            />
                            {shouldShowSuggestion && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1 h-9 text-xs"
                                onClick={() => {
                                  field.onChange(priceSuggestion.typical);
                                  toast({
                                    title: "Price auto-filled",
                                    description: `Based on market rates: $${priceSuggestion.min}-$${priceSuggestion.max}`,
                                  });
                                }}
                              >
                                <Wand2 className="h-3 w-3 mr-1" />
                                Use ${priceSuggestion.typical}
                              </Button>
                            )}
                          </div>
                        </FormControl>
                        {priceTip && (
                          <FormDescription className="text-sm flex items-start gap-2 text-muted-foreground">
                            <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{priceTip}</span>
                          </FormDescription>
                        )}
                        {!priceTip && priceSuggestion && field.value && (
                          <FormDescription className="text-sm">
                            Market range: ${priceSuggestion.min}-${priceSuggestion.max} (typical: ${priceSuggestion.typical})
                          </FormDescription>
                        )}
                        {!priceTip && !priceSuggestion && (
                          <FormDescription className="text-sm">
                            Set the price for this service
                          </FormDescription>
                        )}
                        {priceError && (
                          <p className="text-sm font-medium text-destructive">{priceError.message}</p>
                        )}
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
            </div>

            {/* Buffer Time Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Buffer Time</h3>
                <Separator className="mb-4" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="bufferTimeBefore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        Buffer Time Before (minutes)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={60}
                          step={5}
                          placeholder="0"
                          className="h-11"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription className="text-sm">
                        Time needed before service starts (setup/preparation)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bufferTimeAfter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-2">
                        <Timer className="h-4 w-4" />
                        Buffer Time After (minutes)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={60}
                          step={5}
                          placeholder="0"
                          className="h-11"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription className="text-sm">
                        Time needed after service ends (cleanup)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Details Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-4">Additional Details</h3>
                <Separator className="mb-4" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Image URL
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/image.jpg"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-sm">
                        Optional: Add an image URL to showcase your service
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Category
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Hair Services, Massage, Consultation"
                          className="h-11"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-sm">
                        Optional: Group similar services together
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maxCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Max Capacity
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={100}
                          placeholder="1"
                          className="h-11"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormDescription className="text-sm">
                        Maximum number of people for this service (default: 1)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cancellationPolicyHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base flex items-center gap-2">
                        <CalendarX className="h-4 w-4" />
                        Cancellation Policy (hours)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Leave empty for no cancellation"
                          className="h-11"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value;
                            field.onChange(value === "" ? undefined : (parseInt(value) || undefined));
                          }}
                        />
                      </FormControl>
                      <FormDescription className="text-sm">
                        Hours before booking that cancellation is allowed (leave empty to disable cancellation)
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
