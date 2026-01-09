import { Resend } from "resend";
import { BookingConfirmationEmail } from "@/components/emails/booking-confirmation";
import { BookingReminderEmail } from "@/components/emails/booking-reminder";
import { BookingCancellationEmail } from "@/components/emails/booking-cancellation";

const resend = new Resend(process.env.RESEND_API_KEY);

// Use Resend test domain for development, or custom domain for production
const getFromEmail = () => {
  if (process.env.RESEND_FROM_EMAIL) {
    return process.env.RESEND_FROM_EMAIL;
  }
  // Default to Resend's test domain for development
  return "Bookings <onboarding@resend.dev>";
};

export async function sendBookingConfirmationEmail(
  to: string,
  booking: {
    id: string;
    customerName: string;
    serviceName: string;
    startTime: Date;
    businessName: string;
    businessLogoUrl?: string | null;
    primaryColor?: string;
  }
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  try {
    await resend.emails.send({
      from: getFromEmail(),
      to,
      subject: `Booking Confirmed - ${booking.businessName}`,
      react: BookingConfirmationEmail({
        customerName: booking.customerName,
        serviceName: booking.serviceName,
        startTime: booking.startTime,
        businessName: booking.businessName,
        bookingId: booking.id,
        primaryColor: booking.primaryColor || "#3b82f6",
        logoUrl: booking.businessLogoUrl || null,
      }),
    });
  } catch (error) {
    console.error("Failed to send booking confirmation email:", error);
    throw error;
  }
}

export async function sendBookingCancellationEmail(
  to: string,
  booking: {
    customerName: string;
    serviceName: string;
    startTime: Date;
    businessName: string;
    businessLogoUrl?: string | null;
    primaryColor?: string;
  }
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  try {
    await resend.emails.send({
      from: getFromEmail(),
      to,
      subject: `Booking Cancelled - ${booking.businessName}`,
      react: BookingCancellationEmail({
        customerName: booking.customerName,
        serviceName: booking.serviceName,
        startTime: booking.startTime,
        businessName: booking.businessName,
        primaryColor: booking.primaryColor || "#3b82f6",
        logoUrl: booking.businessLogoUrl || null,
      }),
    });
  } catch (error) {
    console.error("Failed to send cancellation email:", error);
    throw error;
  }
}

export async function sendBookingReminderEmail(
  to: string,
  booking: {
    customerName: string;
    serviceName: string;
    startTime: Date;
    businessName: string;
    businessLogoUrl?: string | null;
    primaryColor?: string;
  }
) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  try {
    await resend.emails.send({
      from: getFromEmail(),
      to,
      subject: `Reminder: Your booking with ${booking.businessName}`,
      react: BookingReminderEmail({
        customerName: booking.customerName,
        serviceName: booking.serviceName,
        startTime: booking.startTime,
        businessName: booking.businessName,
        primaryColor: booking.primaryColor || "#3b82f6",
        logoUrl: booking.businessLogoUrl || null,
      }),
    });
  } catch (error) {
    console.error("Failed to send reminder email:", error);
    throw error;
  }
}

