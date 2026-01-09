/**
 * Basic Time Slot Suggestions
 * Rule-based algorithm analyzing booking patterns to suggest optimal time slots
 */

import { addMinutes, startOfDay, format, getHours, getMinutes } from "date-fns";

export interface BookingPattern {
  hour: number;
  minute: number;
  bookingCount: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
}

export interface TimeSlotSuggestion {
  time: string; // HH:mm format
  date: Date;
  score: number; // Higher = more popular
  reason: string;
}

/**
 * Analyze booking patterns from historical bookings
 */
export function analyzeBookingPatterns(
  bookings: Array<{ startTime: Date; status?: string }>,
  daysToAnalyze: number = 30
): BookingPattern[] {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - daysToAnalyze * 24 * 60 * 60 * 1000);

  // Filter to only confirmed/completed bookings in the analysis period
  const relevantBookings = bookings.filter(
    (booking) =>
      booking.startTime >= cutoffDate &&
      (booking.status === "CONFIRMED" || booking.status === "COMPLETED")
  );

  // Group bookings by hour and minute
  const patternMap = new Map<string, BookingPattern>();

  relevantBookings.forEach((booking) => {
    const hour = getHours(booking.startTime);
    const minute = getMinutes(booking.startTime);
    const dayOfWeek = booking.startTime.getDay();
    const key = `${dayOfWeek}-${hour}-${minute}`;

    const existing = patternMap.get(key);
    if (existing) {
      existing.bookingCount += 1;
    } else {
      patternMap.set(key, {
        hour,
        minute,
        bookingCount: 1,
        dayOfWeek,
      });
    }
  });

  return Array.from(patternMap.values()).sort((a, b) => b.bookingCount - a.bookingCount);
}

/**
 * Suggest optimal time slots based on booking patterns
 */
export function suggestOptimalTimeSlots(
  patterns: BookingPattern[],
  targetDate: Date,
  duration: number = 60, // Service duration in minutes
  maxSuggestions: number = 5
): TimeSlotSuggestion[] {
  if (patterns.length === 0) {
    return [];
  }

  const targetDayOfWeek = targetDate.getDay();
  
  // Filter patterns for the same day of week
  const dayPatterns = patterns.filter((p) => p.dayOfWeek === targetDayOfWeek);

  if (dayPatterns.length === 0) {
    // Fallback: use all patterns
    return patterns.slice(0, maxSuggestions).map((pattern, index) => {
      const date = new Date(targetDate);
      date.setHours(pattern.hour, pattern.minute, 0, 0);
      return {
        time: format(date, "HH:mm"),
        date,
        score: pattern.bookingCount,
        reason: `Popular time slot (${pattern.bookingCount} bookings)`,
      };
    });
  }

  // Sort by booking count (most popular first)
  const sortedPatterns = dayPatterns.sort((a, b) => b.bookingCount - a.bookingCount);

  return sortedPatterns.slice(0, maxSuggestions).map((pattern) => {
    const date = new Date(targetDate);
    date.setHours(pattern.hour, pattern.minute, 0, 0);
    
    let reason = "";
    if (pattern.bookingCount >= 10) {
      reason = `Very popular time (${pattern.bookingCount} bookings)`;
    } else if (pattern.bookingCount >= 5) {
      reason = `Popular time slot (${pattern.bookingCount} bookings)`;
    } else {
      reason = `Good time slot (${pattern.bookingCount} bookings)`;
    }

    return {
      time: format(date, "HH:mm"),
      date,
      score: pattern.bookingCount,
      reason,
    };
  });
}

/**
 * Get basic time slot suggestions (simple rule-based)
 * This doesn't require historical data - just suggests common business hours
 */
export function getBasicTimeSlotSuggestions(
  date: Date,
  businessOpenHour: number = 9,
  businessCloseHour: number = 17,
  intervalMinutes: number = 60
): TimeSlotSuggestion[] {
  const suggestions: TimeSlotSuggestion[] = [];
  const dayStart = startOfDay(date);

  // Suggest slots at common times: 9 AM, 12 PM, 2 PM, 4 PM
  const commonTimes = [
    { hour: 9, minute: 0, label: "Morning (9:00 AM)" },
    { hour: 12, minute: 0, label: "Lunch time (12:00 PM)" },
    { hour: 14, minute: 0, label: "Afternoon (2:00 PM)" },
    { hour: 16, minute: 0, label: "Late afternoon (4:00 PM)" },
  ];

  commonTimes.forEach((time) => {
    if (time.hour >= businessOpenHour && time.hour < businessCloseHour) {
      const slotDate = new Date(dayStart);
      slotDate.setHours(time.hour, time.minute, 0, 0);
      suggestions.push({
        time: format(slotDate, "HH:mm"),
        date: slotDate,
        score: 5,
        reason: time.label,
      });
    }
  });

  return suggestions;
}

