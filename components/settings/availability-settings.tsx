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

export default function AvailabilitySettings() {
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Business Hours</CardTitle>
          <HelpTooltip content="Set your weekly business operating hours. Customers can only book appointments during these hours." />
        </div>
        <CardDescription>
          Configure when your business is open for bookings
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {DAYS.map((day) => {
            const dayData = availability[day.key];
            const isOpen = dayData?.isOpen ?? false;

            return (
              <div
                key={day.key}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Checkbox
                    id={day.key}
                    checked={isOpen}
                    onCheckedChange={(checked) =>
                      updateDay(day.key, "isOpen", checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={day.key}
                    className="text-base font-medium cursor-pointer flex-1"
                  >
                    {day.label}
                  </Label>
                </div>

                {isOpen && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`${day.key}-open`} className="text-sm text-muted-foreground">
                        Open:
                      </Label>
                      <Input
                        id={`${day.key}-open`}
                        type="time"
                        value={dayData?.open || "09:00"}
                        onChange={(e) => updateDay(day.key, "open", e.target.value)}
                        className="w-32"
                        disabled={!isOpen}
                      />
                    </div>
                    <span className="text-muted-foreground">-</span>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`${day.key}-close`} className="text-sm text-muted-foreground">
                        Close:
                      </Label>
                      <Input
                        id={`${day.key}-close`}
                        type="time"
                        value={dayData?.close || "17:00"}
                        onChange={(e) => updateDay(day.key, "close", e.target.value)}
                        className="w-32"
                        disabled={!isOpen}
                      />
                    </div>
                  </div>
                )}

                {!isOpen && (
                  <span className="text-sm text-muted-foreground">Closed</span>
                )}
              </div>
            );
          })}

          <Separator />

          <div className="flex justify-end gap-4 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Business Hours
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
