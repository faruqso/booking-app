"use client";

import { motion } from "framer-motion";
import { format, isToday } from "date-fns";
import { ArrowLeft, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface BookingDateStepProps {
  availableDates: Date[];
  selectedDate: Date | null;
  autoSelectEnabled: boolean;
  onAutoSelectEnabledChange: (checked: boolean) => void;
  autoSelecting: boolean;
  loadingDatesWithSlots: boolean;
  datesWithSlots: Set<string> | null;
  onBack: () => void;
  onDateSelect: (date: Date) => void;
  onAutoSelect: () => void;
}

export function BookingDateStep({
  availableDates,
  selectedDate,
  autoSelectEnabled,
  onAutoSelectEnabledChange,
  autoSelecting,
  loadingDatesWithSlots,
  datesWithSlots,
  onBack,
  onDateSelect,
  onAutoSelect,
}: BookingDateStepProps) {
  return (
    <motion.div
      key="date"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Button variant="ghost" onClick={onBack} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to services
      </Button>
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-2xl font-semibold">Select a Date</h2>
          <Button
            type="button"
            variant="outline"
            onClick={onAutoSelect}
            disabled={autoSelecting}
            className="gap-2 shrink-0"
          >
            {autoSelecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Finding...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                Book Earliest
              </>
            )}
          </Button>
        </div>
        <div className="flex items-center gap-3 mb-1">
          <Checkbox
            id="auto-select"
            checked={autoSelectEnabled}
            onCheckedChange={(checked) => onAutoSelectEnabledChange(checked as boolean)}
          />
          <Label htmlFor="auto-select" className="text-sm font-normal cursor-pointer">
            Auto-select earliest slot
          </Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Or pick a date below. Unavailable days are greyed out.
        </p>
      </div>
      <p className="text-xs font-medium text-muted-foreground mb-2">
        {loadingDatesWithSlots || datesWithSlots === null
          ? "Checking availability..."
          : "Next 30 days — greyed dates have no times left"}
      </p>
      <div
        className={`grid grid-cols-7 gap-2 transition-opacity duration-200 ${
          loadingDatesWithSlots || datesWithSlots === null ? "opacity-80" : ""
        }`}
      >
        {availableDates.map((date) => {
          const isSelected = selectedDate?.toDateString() === date.toDateString();
          const isTodayDate = isToday(date);
          const dateKey = format(date, "yyyy-MM-dd");
          const isLoading = loadingDatesWithSlots || datesWithSlots === null;
          const hasSlots = !isLoading && datesWithSlots !== null && datesWithSlots.has(dateKey);
          const isDisabled = isLoading || !hasSlots;
          return (
            <motion.button
              key={date.toISOString()}
              type="button"
              onClick={() => !isDisabled && onDateSelect(date)}
              disabled={isDisabled}
              className={`p-4 rounded-lg border-2 transition-all ${
                isLoading
                  ? "border-muted bg-muted/30 text-muted-foreground cursor-wait animate-pulse"
                  : !hasSlots
                    ? "border-muted bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60"
                    : isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : isTodayDate
                        ? "border-primary/50 hover:border-primary/70 bg-card"
                        : "border-muted hover:border-primary/50 bg-card"
              }`}
              whileHover={!isDisabled ? { scale: 1.02 } : undefined}
              whileTap={!isDisabled ? { scale: 0.98 } : undefined}
              title={
                isLoading ? undefined : !hasSlots ? "No times available this day" : undefined
              }
            >
              <div className="text-xs font-medium mb-1">{format(date, "EEE")}</div>
              <div className="text-lg font-semibold">{format(date, "d")}</div>
              <div className="text-xs mt-1">
                {isTodayDate ? "Today" : format(date, "MMM")}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
