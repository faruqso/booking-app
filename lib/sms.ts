import twilio from "twilio";

// Lazy initialization - only create Twilio client when needed (not at build time)
const getTwilioClient = (accountSid: string, authToken: string) => {
  if (!accountSid || !authToken) {
    return null;
  }
  return twilio(accountSid, authToken);
};

export interface SendSMSOptions {
  to: string;
  message: string;
  businessId: string;
}

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

/**
 * Send SMS using Twilio
 */
export async function sendSMS(
  config: SMSConfig,
  options: SendSMSOptions
): Promise<{ success: boolean; error?: string; sid?: string }> {
  const client = getTwilioClient(config.accountSid, config.authToken);
  
  if (!client) {
    return {
      success: false,
      error: "Twilio client not initialized - missing credentials",
    };
  }

  try {
    const message = await client.messages.create({
      body: options.message,
      from: config.phoneNumber,
      to: options.to,
    });

    return {
      success: true,
      sid: message.sid,
    };
  } catch (error: any) {
    console.error("SMS sending error:", error);
    return {
      success: false,
      error: error.message || "Failed to send SMS",
    };
  }
}

/**
 * Send booking confirmation SMS
 */
export async function sendBookingConfirmationSMS(
  config: SMSConfig,
  booking: {
    customerName: string;
    customerPhone: string;
    serviceName: string;
    startTime: Date;
    businessName: string;
  }
): Promise<{ success: boolean; error?: string; sid?: string }> {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(booking.startTime);

  const message = `Hi ${booking.customerName}, your booking with ${booking.businessName} for ${booking.serviceName} is confirmed for ${formattedDate}. We'll see you then!`;

  return sendSMS(config, {
    to: booking.customerPhone,
    message,
    businessId: "", // Will be set by caller
  });
}

/**
 * Send booking reminder SMS
 */
export async function sendBookingReminderSMS(
  config: SMSConfig,
  booking: {
    customerName: string;
    customerPhone: string;
    serviceName: string;
    startTime: Date;
    businessName: string;
    businessPhone?: string;
  }
): Promise<{ success: boolean; error?: string; sid?: string }> {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(booking.startTime);

  let message = `Reminder: You have a booking with ${booking.businessName} for ${booking.serviceName} on ${formattedDate}.`;
  
  if (booking.businessPhone) {
    message += ` Call us at ${booking.businessPhone} if you need to reschedule.`;
  }

  return sendSMS(config, {
    to: booking.customerPhone,
    message,
    businessId: "", // Will be set by caller
  });
}

/**
 * Send booking cancellation SMS
 */
export async function sendBookingCancellationSMS(
  config: SMSConfig,
  booking: {
    customerName: string;
    customerPhone: string;
    serviceName: string;
    startTime: Date;
    businessName: string;
  }
): Promise<{ success: boolean; error?: string; sid?: string }> {
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(booking.startTime);

  const message = `Hi ${booking.customerName}, your booking with ${booking.businessName} for ${booking.serviceName} on ${formattedDate} has been cancelled. Please contact us if you have any questions.`;

  return sendSMS(config, {
    to: booking.customerPhone,
    message,
    businessId: "", // Will be set by caller
  });
}
