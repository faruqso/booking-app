"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Clock, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";

interface DayHours {
  open: string;
  close: string;
  isOpen: boolean;
}

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

type DayKey = typeof DAYS[number]["key"];

export default function AvailabilityPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [availability, setAvailability] = useState<Record<DayKey, DayHours | null>>({
    monday: { open: "09:00", close: "17:00", isOpen: true },
    tuesday: { open: "09:00", close: "17:00", isOpen: true },
    wednesday: { open: "09:00", close: "17:00", isOpen: true },
    thursday: { open: "09:00", close: "17:00", isOpen: true },
    friday: { open: "09:00", close: "17:00", isOpen: true },
    saturday: { open: "09:00", close: "17:00", isOpen: false },
    sunday: { open: "09:00", close: "17:00", isOpen: false },
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchAvailability();
    } else if (status === "unauthenticated") {
      window.location.href = "/auth/signin";
    }
  }, [status]);

  const fetchAvailability = async () => {
    try {
      const response = await fetch("/api/availability");
      if (response.ok) {
        const data = await response.json();
        const updated: Record<DayKey, DayHours | null> = {
          monday: data.monday as DayHours | null,
          tuesday: data.tuesday as DayHours | null,
          wednesday: data.wednesday as DayHours | null,
          thursday: data.thursday as DayHours | null,
          friday: data.friday as DayHours | null,
          saturday: data.saturday as DayHours | null,
          sunday: data.sunday as DayHours | null,
        };
        setAvailability(updated);
      }
    } catch (error) {
      console.error("Failed to fetch availability:", error);
      toast({
        title: "Error",
        description: "Failed to load availability",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const response = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(availability),
      });

      if (!response.ok) {
        throw new Error("Failed to save availability");
      }

      toast({
        title: "Success",
        description: "Business hours updated successfully",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save availability",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateDay = (day: DayKey, field: keyof DayHours, value: string | boolean) => {
    setAvailability((prev) => {
      const current = prev[day] || { open: "09:00", close: "17:00", isOpen: false };
      return {
        ...prev,
        [day]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-5 w-24" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-4 w-8" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Hours</h1>
          <p className="text-muted-foreground">
            Set your operating hours for each day of the week
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Availability Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Schedule
            <HelpTooltip content="Set your business hours for each day of the week. Customers can only book during these hours. Uncheck a day to mark it as closed." />
          </CardTitle>
          <CardDescription>
            Configure when your business is open for bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {DAYS.map((day, index) => {
              const dayData = availability[day.key] || {
                open: "09:00",
                close: "17:00",
                isOpen: false,
              };

              return (
                <div key={day.key}>
                  <div className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-6 flex-1">
                      <Label className="w-24 font-medium">{day.label}</Label>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`${day.key}-open`}
                            checked={dayData.isOpen}
                            onCheckedChange={(checked) =>
                              updateDay(day.key, "isOpen", checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`${day.key}-open`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            Open
                          </Label>
                        </div>
                        {dayData.isOpen && (
                          <>
                            <Input
                              type="time"
                              value={dayData.open}
                              onChange={(e) =>
                                updateDay(day.key, "open", e.target.value)
                              }
                              className="w-32"
                            />
                            <span className="text-muted-foreground text-sm">to</span>
                            <Input
                              type="time"
                              value={dayData.close}
                              onChange={(e) =>
                                updateDay(day.key, "close", e.target.value)
                              }
                              className="w-32"
                            />
                          </>
                        )}
                        {!dayData.isOpen && (
                          <span className="text-muted-foreground text-sm">Closed</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {index < DAYS.length - 1 && <Separator />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
