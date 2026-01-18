import { Resend } from "resend";
import { BookingConfirmationEmail } from "@/components/emails/booking-confirmation";
import { BookingReminderEmail } from "@/components/emails/booking-reminder";
import { BookingCancellationEmail } from "@/components/emails/booking-cancellation";
import { generateEmailSubject } from "@/lib/ai/template-engine";
import { format } from "date-fns";

// Lazy initialization - only create Resend instance when needed (not at build time)
const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

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
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  try {
    // Generate optimized subject line using template engine
    const subject = generateEmailSubject("bookingConfirmation", {
      businessName: booking.businessName,
      serviceName: booking.serviceName,
      date: format(booking.startTime, "MMMM d"),
    });

    await resend.emails.send({
      from: getFromEmail(),
      to,
      subject,
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
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  try {
    // Generate optimized subject line
    const subject = generateEmailSubject("bookingCancellation", {
      businessName: booking.businessName,
    });

    await resend.emails.send({
      from: getFromEmail(),
      to,
      subject,
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
  const resend = getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return;
  }

  try {
    // Generate optimized subject line
    const subject = generateEmailSubject("bookingReminder", {
      businessName: booking.businessName,
      serviceName: booking.serviceName,
      date: format(booking.startTime, "MMMM d"),
    });

    await resend.emails.send({
      from: getFromEmail(),
      to,
      subject,
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

