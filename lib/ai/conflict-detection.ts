/**
 * Booking Conflict Detection & Alternative Suggestions
 * Provides intelligent conflict detection and alternative time slot suggestions
 */

import { addMinutes, isBefore, isAfter, startOfDay, format, setHours, setMinutes } from "date-fns";
import { parseTime, generateTimeSlots, type DayHours } from "@/lib/availability";

export interface ConflictResult {
  hasConflict: boolean;
  conflictingBookings?: Array<{ startTime: Date; endTime: Date }>;
  alternativeSlots?: Array<{
    startTime: Date;
    endTime: Date;
    reason: string;
    score: number; // Higher score = better alternative
  }>;
}

export interface BookingSlot {
  startTime: Date;
  endTime: Date;
}

/**
 * Check if a booking slot conflicts with existing bookings
 */
export function checkConflict(
  requestedSlot: BookingSlot,
  existingBookings: BookingSlot[]
): boolean {
  return existingBookings.some((booking) => {
    // Check for any overlap
    return (
      (isAfter(requestedSlot.startTime, booking.startTime) && 
       isBefore(requestedSlot.startTime, booking.endTime)) ||
      (isAfter(requestedSlot.endTime, booking.startTime) && 
       isBefore(requestedSlot.endTime, booking.endTime)) ||
      (isBefore(requestedSlot.startTime, booking.startTime) && 
       isAfter(requestedSlot.endTime, booking.endTime)) ||
      (requestedSlot.startTime.getTime() === booking.startTime.getTime())
    );
  });
}

/**
 * Find alternative time slots when a conflict is detected
 * 
 * @param requestedSlot The originally requested booking slot
 * @param duration Duration of the service in minutes
 * @param existingBookings Existing bookings for the day
 * @param dayHours Business hours for the day
 * @param maxAlternatives Maximum number of alternatives to return
 */
export function findAlternativeSlots(
  requestedSlot: BookingSlot,
  duration: number,
  existingBookings: BookingSlot[],
  dayHours: DayHours | null,
  maxAlternatives: number = 5
): Array<{
  startTime: Date;
  endTime: Date;
  reason: string;
  score: number;
}> {
  if (!dayHours || !dayHours.isOpen) {
    return [];
  }

  const alternatives: Array<{
    startTime: Date;
    endTime: Date;
    reason: string;
    score: number;
  }> = [];

  const date = startOfDay(requestedSlot.startTime);
  const slotStart = parseTime(dayHours.open);
  const slotEnd = parseTime(dayHours.close);

  const dayStart = startOfDay(date);
  const openTime = setMinutes(
    setHours(dayStart, slotStart.getHours()),
    slotStart.getMinutes()
  );
  const closeTime = setMinutes(
    setHours(dayStart, slotEnd.getHours()),
    slotEnd.getMinutes()
  );

  // Generate all possible slots for the day
  const allSlots = generateTimeSlots(date, dayHours, duration, existingBookings);

  // Score and rank alternatives
  allSlots.forEach((slotStartTime) => {
    // Skip the requested slot itself
    if (slotStartTime.getTime() === requestedSlot.startTime.getTime()) {
      return;
    }

    const slotEndTime = addMinutes(slotStartTime, duration);

    // Check if this slot would conflict
    if (checkConflict({ startTime: slotStartTime, endTime: slotEndTime }, existingBookings)) {
      return;
    }

    // Check if slot is within business hours
    if (isBefore(slotEndTime, openTime) || isAfter(slotEndTime, closeTime)) {
      return;
    }

    // Calculate score based on proximity to requested time
    const timeDiff = Math.abs(slotStartTime.getTime() - requestedSlot.startTime.getTime());
    const minutesDiff = timeDiff / (1000 * 60);

    // Prefer slots closer to requested time
    let score = 100 - minutesDiff / 10; // Decrease score by 0.1 per minute difference

    // Bonus for slots earlier in the day (if requested was early)
    if (requestedSlot.startTime.getHours() < 12 && slotStartTime.getHours() < 12) {
      score += 10;
    }

    // Bonus for slots later in the day (if requested was late)
    if (requestedSlot.startTime.getHours() >= 12 && slotStartTime.getHours() >= 12) {
      score += 10;
    }

    // Prefer slots on the same day
    if (slotStartTime.getDate() === requestedSlot.startTime.getDate()) {
      score += 20;
    }

    // Determine reason
    let reason = "";
    if (minutesDiff < 30) {
      reason = `Same time slot, just ${Math.round(minutesDiff)} minutes ${slotStartTime.getTime() > requestedSlot.startTime.getTime() ? 'later' : 'earlier'}`;
    } else if (minutesDiff < 60) {
      reason = `Close alternative: ${format(slotStartTime, "h:mm a")}`;
    } else if (minutesDiff < 180) {
      reason = `Alternative time: ${format(slotStartTime, "h:mm a")}`;
    } else {
      reason = `Available at ${format(slotStartTime, "h:mm a")}`;
    }

    alternatives.push({
      startTime: slotStartTime,
      endTime: slotEndTime,
      reason,
      score: Math.max(0, score), // Ensure non-negative
    });
  });

  // Sort by score (highest first) and take top alternatives
  return alternatives
    .sort((a, b) => b.score - a.score)
    .slice(0, maxAlternatives);
}

/**
 * Get conflict detection result with alternatives
 */
export function detectConflictWithAlternatives(
  requestedSlot: BookingSlot,
  duration: number,
  existingBookings: BookingSlot[],
  dayHours: DayHours | null
): ConflictResult {
  const hasConflict = checkConflict(requestedSlot, existingBookings);

  if (!hasConflict) {
    return { hasConflict: false };
  }

  const conflictingBookings = existingBookings.filter((booking) =>
    checkConflict(requestedSlot, [booking])
  );

  const alternativeSlots = findAlternativeSlots(
    requestedSlot,
    duration,
    existingBookings,
    dayHours
  );

  return {
    hasConflict: true,
    conflictingBookings,
    alternativeSlots: alternativeSlots.length > 0 ? alternativeSlots : undefined,
  };
}

/**
 * Format alternative slots for display to users
 */
export function formatAlternativeSlots(
  alternatives: Array<{ startTime: Date; endTime: Date; reason: string; score: number }>
): Array<{
  display: string;
  value: string;
  reason: string;
}> {
  return alternatives.map((alt) => ({
    display: format(alt.startTime, "EEEE, MMMM d 'at' h:mm a"),
    value: alt.startTime.toISOString(),
    reason: alt.reason,
  }));
}

