"use client";

import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Calendar, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BookingTimeStepProps {
  selectedDate: Date;
  selectedTime: string;
  timeSlots: string[];
  loadingTimeSlots: boolean;
  onBack: () => void;
  onTimeSelect: (time: string) => void;
}

export function BookingTimeStep({
  selectedDate,
  selectedTime,
  timeSlots,
  loadingTimeSlots,
  onBack,
  onTimeSelect,
}: BookingTimeStepProps) {
  return (
    <motion.div
      key="time"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Button variant="ghost" onClick={onBack} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to date selection
      </Button>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">
          Select a Time for {format(selectedDate, "EEEE, MMMM d")}
        </h2>
        {timeSlots.length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => timeSlots[0] && onTimeSelect(timeSlots[0])}
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            Select First Available
          </Button>
        )}
      </div>
      {loadingTimeSlots ? (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading available time slots...</p>
        </div>
      ) : timeSlots.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No available time slots for this date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3 md:grid-cols-6">
          {timeSlots.map((slot) => {
            const isSelected = selectedTime === slot;
            return (
              <motion.button
                key={slot}
                type="button"
                onClick={() => onTimeSelect(slot)}
                className={`p-4 rounded-lg border-2 transition-all font-medium ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-lg"
                    : "border-muted hover:border-primary/50 bg-card"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {format(parseISO(slot), "h:mm a")}
              </motion.button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
