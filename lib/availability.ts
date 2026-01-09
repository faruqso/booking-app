import { Prisma } from "@prisma/client";
import { addMinutes, format, parse, setHours, setMinutes, startOfDay, isAfter, isBefore, eachDayOfInterval, isSameDay } from "date-fns";

export interface DayHours {
  open: string;
  close: string;
  isOpen: boolean;
}

type AvailabilityJson = Prisma.JsonValue;

export function getDayHours(dayData: AvailabilityJson | null): DayHours | null {
  if (!dayData || typeof dayData !== "object") return null;
  
  const data = dayData as any;
  if (!data.isOpen) return null;
  
  return {
    open: data.open || "09:00",
    close: data.close || "17:00",
    isOpen: true,
  };
}

export function parseTime(timeString: string): Date {
  const [hours, minutes] = timeString.split(":").map(Number);
  const today = startOfDay(new Date());
  return setMinutes(setHours(today, hours), minutes);
}

export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

export function generateTimeSlots(
  date: Date,
  dayHours: DayHours | null,
  duration: number,
  existingBookings: { startTime: Date; endTime: Date }[] = []
): Date[] {
  if (!dayHours || !dayHours.isOpen) {
    return [];
  }

  const slots: Date[] = [];
  const dayStart = startOfDay(date);
  const openTime = parseTime(dayHours.open);
  const closeTime = parseTime(dayHours.close);

  const slotStart = setMinutes(
    setHours(dayStart, openTime.getHours()),
    openTime.getMinutes()
  );
  const slotEnd = setMinutes(
    setHours(dayStart, closeTime.getHours()),
    closeTime.getMinutes()
  );

  let currentSlot = slotStart;

  while (isBefore(addMinutes(currentSlot, duration), slotEnd) || 
         formatTime(addMinutes(currentSlot, duration)) === formatTime(slotEnd)) {
    // Check if this slot conflicts with existing bookings
    const slotEndTime = addMinutes(currentSlot, duration);
    const hasConflict = existingBookings.some((booking) => {
      return (
        (isAfter(currentSlot, booking.startTime) && isBefore(currentSlot, booking.endTime)) ||
        (isAfter(slotEndTime, booking.startTime) && isBefore(slotEndTime, booking.endTime)) ||
        (isBefore(currentSlot, booking.startTime) && isAfter(slotEndTime, booking.endTime))
      );
    });

    if (!hasConflict) {
      slots.push(new Date(currentSlot));
    }

    currentSlot = addMinutes(currentSlot, 30); // 30-minute intervals between slots
  }

  return slots;
}

export function getAvailabilityForDate(
  availability: {
    monday: AvailabilityJson;
    tuesday: AvailabilityJson;
    wednesday: AvailabilityJson;
    thursday: AvailabilityJson;
    friday: AvailabilityJson;
    saturday: AvailabilityJson;
    sunday: AvailabilityJson;
  },
  date: Date
): DayHours | null {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  switch (dayOfWeek) {
    case 0:
      return getDayHours(availability.sunday);
    case 1:
      return getDayHours(availability.monday);
    case 2:
      return getDayHours(availability.tuesday);
    case 3:
      return getDayHours(availability.wednesday);
    case 4:
      return getDayHours(availability.thursday);
    case 5:
      return getDayHours(availability.friday);
    case 6:
      return getDayHours(availability.saturday);
    default:
      return null;
  }
}

