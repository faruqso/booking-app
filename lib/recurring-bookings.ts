import { prisma } from "@/lib/prisma";
import { addDays, addWeeks, addMonths, startOfDay, getDay, setDate, setHours, setMinutes } from "date-fns";

interface RecurringBooking {
  id: string;
  businessId: string;
  locationId: string | null;
  serviceId: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  frequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  startTime: string; // e.g., "14:00" or "2:00 PM"
  startDate: Date;
  endDate: Date | null;
  numberOfOccurrences: number | null;
  lastGeneratedDate: Date | null;
  notes: string | null;
}

/**
 * Parse time string (e.g., "14:00" or "2:00 PM") into hours and minutes
 */
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  // Handle 24-hour format (e.g., "14:00")
  if (timeStr.includes(":") && !timeStr.toLowerCase().includes("pm") && !timeStr.toLowerCase().includes("am")) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
  }

  // Handle 12-hour format (e.g., "2:00 PM")
  const isPM = timeStr.toLowerCase().includes("pm");
  const timePart = timeStr.replace(/[^\d:]/g, "");
  const [hours, minutes] = timePart.split(":").map(Number);
  let adjustedHours = hours || 0;
  
  if (isPM && adjustedHours !== 12) {
    adjustedHours += 12;
  } else if (!isPM && adjustedHours === 12) {
    adjustedHours = 0;
  }

  return { hours: adjustedHours, minutes: minutes || 0 };
}


/**
 * Generate all valid occurrence dates for a recurring booking
 */
export function generateOccurrenceDates(
  recurring: RecurringBooking,
  upToDate: Date = new Date()
): Date[] {
  const dates: Date[] = [];
  const startDate = new Date(recurring.startDate);
  const endDate = recurring.endDate ? new Date(recurring.endDate) : null;
  const { hours, minutes } = parseTimeString(recurring.startTime);

  // Determine starting point: use last generated date + 1 day, or start date
  let baseDate = recurring.lastGeneratedDate
    ? new Date(recurring.lastGeneratedDate)
    : new Date(startDate);

  // Set base date to start of day for comparison
  baseDate = startOfDay(baseDate);
  const startDay = startOfDay(startDate);

  // If base date is before start date, start from start date
  if (baseDate < startDay) {
    baseDate = new Date(startDay);
  }

  // Calculate how many occurrences we've already generated
  let existingCount = 0;
  const maxOccurrences = recurring.numberOfOccurrences || Infinity;

  // Start from the day after the last generated date, or from start date
  let currentDate = baseDate < startDay ? new Date(startDay) : addDays(baseDate, 1);

  let iterationCount = 0;
  const maxIterations = 1000; // Safety limit

  // Keep generating dates until we reach the target date or max occurrences
  while (iterationCount < maxIterations && dates.length + existingCount < maxOccurrences) {
    // Get next valid date based on frequency
    let candidateDate = getNextDate(currentDate, recurring);

    if (!candidateDate) {
      break;
    }

    // Set the time
    candidateDate = setHours(candidateDate, hours);
    candidateDate = setMinutes(candidateDate, minutes);

    // Check if candidate is before start date (shouldn't happen, but safety check)
    if (candidateDate < startDate) {
      currentDate = candidateDate;
      iterationCount++;
      continue;
    }

    // Check if candidate is after end date
    if (endDate && candidateDate > endDate) {
      break;
    }

    // Check if candidate is after target date (upToDate)
    if (candidateDate > upToDate) {
      break;
    }

    // Valid date - add it
    dates.push(new Date(candidateDate));

    // Move to next date for next iteration
    currentDate = getNextDate(candidateDate, recurring);
    
    if (!currentDate) {
      break;
    }

    iterationCount++;
  }

  return dates;
}

/**
 * Get next date based on frequency pattern
 * Returns the next occurrence date that matches the pattern
 */
function getNextDate(
  currentDate: Date,
  recurring: RecurringBooking
): Date | null {
  const { frequency, dayOfWeek, dayOfMonth, startDate } = recurring;
  const start = new Date(startDate);
  let nextDate = new Date(currentDate);

  switch (frequency) {
    case "DAILY":
      // Next occurrence is always the next day
      nextDate = addDays(startOfDay(currentDate), 1);
      break;

    case "WEEKLY":
      if (dayOfWeek === null) return null;
      const currentDay = getDay(currentDate);
      
      // Calculate days until next occurrence of the target day
      let daysToAdd = dayOfWeek - currentDay;
      if (daysToAdd <= 0) {
        daysToAdd += 7; // Next week
      }
      
      nextDate = addDays(startOfDay(currentDate), daysToAdd);
      break;

    case "BIWEEKLY":
      if (dayOfWeek === null) return null;
      const currentDayBW = getDay(currentDate);
      
      // For bi-weekly, we need to check if we're on the right week cycle
      // Calculate weeks since start date
      const weeksSinceStart = Math.floor(
        (startOfDay(currentDate).getTime() - startOfDay(start).getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      
      let daysToAddBW = dayOfWeek - currentDayBW;
      
      // If we're on the target day, move to next cycle (2 weeks)
      if (daysToAddBW === 0) {
        daysToAddBW = 14;
      } else if (daysToAddBW < 0) {
        // If we've passed the day this week, check if we're on the right week cycle
        if (weeksSinceStart % 2 === 0) {
          daysToAddBW += 7; // Same cycle next week
        } else {
          daysToAddBW += 14; // Next cycle (2 weeks)
        }
      } else {
        // If we haven't reached the day yet this week
        if (weeksSinceStart % 2 === 0) {
          // Already on right cycle, just add days
          // daysToAddBW is already correct
        } else {
          // Wrong cycle, need to move to next cycle
          daysToAddBW += 7;
        }
      }
      
      nextDate = addDays(startOfDay(currentDate), daysToAddBW);
      break;

    case "MONTHLY":
      if (dayOfMonth === null) return null;
      nextDate = new Date(currentDate);
      
      // Set to the day of month
      try {
        nextDate = setDate(nextDate, dayOfMonth);
        
        // If the date is today or in the past, move to next month
        if (startOfDay(nextDate) <= startOfDay(currentDate)) {
          nextDate = addMonths(nextDate, 1);
          // Recalculate day of month for the new month
          try {
            nextDate = setDate(nextDate, dayOfMonth);
          } catch {
            // If day doesn't exist in next month (e.g., Feb 31), use last day of month
            const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
            nextDate = setDate(nextDate, Math.min(dayOfMonth, lastDay));
          }
        }
      } catch (error) {
        // Handle invalid day of month (e.g., Feb 31)
        // Move to next month and set to last day if necessary
        nextDate = addMonths(nextDate, 1);
        const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate = setDate(nextDate, Math.min(dayOfMonth, lastDay));
      }
      break;

    default:
      return null;
  }

  return nextDate;
}

/**
 * Generate bookings from recurring booking patterns
 */
export async function generateBookingsFromRecurring(
  recurringId?: string,
  upToDate?: Date
): Promise<{ created: number; skipped: number; errors: number }> {
  const targetDate = upToDate || new Date();
  const result = { created: 0, skipped: 0, errors: 0 };

  try {
    // Fetch active recurring bookings
    const where: any = {
      isActive: true,
    };

    if (recurringId) {
      where.id = recurringId;
    }

    const recurringBookings = await prisma.recurringBooking.findMany({
      where,
      include: {
        service: true,
      },
    });

    for (const recurring of recurringBookings) {
      try {
        // Generate occurrence dates
        const dates = generateOccurrenceDates(
          {
            ...recurring,
            startDate: recurring.startDate,
            endDate: recurring.endDate,
            lastGeneratedDate: recurring.lastGeneratedDate,
          },
          targetDate
        );

        if (dates.length === 0) {
          continue;
        }

        // Create bookings for each date
        for (const date of dates) {
          try {
            // Calculate end time based on service duration
            const service = recurring.service;
            const endTime = new Date(date);
            endTime.setMinutes(endTime.getMinutes() + service.duration);

            // Check for conflicts
            const conflicts = await prisma.booking.findFirst({
              where: {
                businessId: recurring.businessId,
                locationId: recurring.locationId || null,
                status: {
                  notIn: ["CANCELLED", "NO_SHOW"],
                },
                OR: [
                  {
                    startTime: {
                      gte: date,
                      lt: endTime,
                    },
                  },
                  {
                    endTime: {
                      gt: date,
                      lte: endTime,
                    },
                  },
                  {
                    AND: [
                      {
                        startTime: {
                          lte: date,
                        },
                      },
                      {
                        endTime: {
                          gte: endTime,
                        },
                      },
                    ],
                  },
                ],
              },
            });

            if (conflicts) {
              result.skipped++;
              continue;
            }

            // Create booking
            await prisma.booking.create({
              data: {
                businessId: recurring.businessId,
                locationId: recurring.locationId,
                serviceId: recurring.serviceId,
                customerId: recurring.customerId,
                recurringBookingId: recurring.id,
                customerName: recurring.customerName,
                customerEmail: recurring.customerEmail,
                customerPhone: recurring.customerPhone,
                startTime: date,
                endTime,
                status: "PENDING",
                notes: recurring.notes,
              },
            });

            result.created++;
          } catch (error) {
            console.error(`Failed to create booking for ${date}:`, error);
            result.errors++;
          }
        }

        // Update last generated date
        if (dates.length > 0) {
          const lastDate = dates[dates.length - 1];
          await prisma.recurringBooking.update({
            where: { id: recurring.id },
            data: { lastGeneratedDate: lastDate },
          });
        }
      } catch (error) {
        console.error(`Failed to process recurring booking ${recurring.id}:`, error);
        result.errors++;
      }
    }
  } catch (error) {
    console.error("Failed to generate bookings from recurring patterns:", error);
    throw error;
  }

  return result;
}
