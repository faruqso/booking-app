/**
 * WhatsApp Business Cloud API integration
 * Used for sending notifications to businesses about bookings
 */

export interface WhatsAppConfig {
  whatsappPhoneNumber?: string | null;
  whatsappAccessToken?: string | null;
  whatsappPhoneNumberId?: string | null;
  whatsappBusinessAccountId?: string | null;
  whatsappNotificationsEnabled?: boolean | null;
}

export interface BookingData {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  serviceName: string;
  startTime: Date;
  endTime: Date;
  status: string;
  notes?: string | null;
  locationName?: string | null;
}

export type WhatsAppEventType = "new_booking" | "booking_modified" | "booking_cancelled";

/**
 * Send WhatsApp notification to business
 */
export async function sendBookingWhatsAppNotification(
  config: WhatsAppConfig,
  booking: BookingData,
  eventType: WhatsAppEventType
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  // Check if WhatsApp is enabled and configured
  if (!config.whatsappNotificationsEnabled) {
    return {
      success: false,
      error: "WhatsApp notifications are not enabled",
    };
  }

  if (!config.whatsappAccessToken || !config.whatsappPhoneNumberId || !config.whatsappPhoneNumber) {
    return {
      success: false,
      error: "WhatsApp is not fully configured",
    };
  }

  try {
    const formattedDate = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(booking.startTime);

    let message = "";

    switch (eventType) {
      case "new_booking":
        message = `🔔 *New Booking*\n\n` +
          `Customer: ${booking.customerName}\n` +
          `Email: ${booking.customerEmail}\n` +
          (booking.customerPhone ? `Phone: ${booking.customerPhone}\n` : "") +
          `Service: ${booking.serviceName}\n` +
          `Date & Time: ${formattedDate}\n` +
          (booking.locationName ? `Location: ${booking.locationName}\n` : "") +
          (booking.notes ? `Notes: ${booking.notes}\n` : "") +
          `Status: ${booking.status}`;
        break;

      case "booking_modified":
        message = `✏️ *Booking Updated*\n\n` +
          `Booking ID: ${booking.id}\n` +
          `Customer: ${booking.customerName}\n` +
          `Service: ${booking.serviceName}\n` +
          `Date & Time: ${formattedDate}\n` +
          `New Status: ${booking.status}`;
        break;

      case "booking_cancelled":
        message = `❌ *Booking Cancelled*\n\n` +
          `Booking ID: ${booking.id}\n` +
          `Customer: ${booking.customerName}\n` +
          `Service: ${booking.serviceName}\n` +
          `Date & Time: ${formattedDate}`;
        break;
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${config.whatsappPhoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.whatsappAccessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: config.whatsappPhoneNumber.replace(/\D/g, ""), // Remove non-digits
          type: "text",
          text: {
            body: message,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("WhatsApp API error:", error);
      return {
        success: false,
        error: error.error?.message || "Failed to send WhatsApp message",
      };
    }

    const data = await response.json();

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    };
  } catch (error: any) {
    console.error("WhatsApp sending error:", error);
    return {
      success: false,
      error: error.message || "Failed to send WhatsApp notification",
    };
  }
}
