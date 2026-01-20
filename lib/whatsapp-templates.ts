/**
 * WhatsApp Message Templates
 * 
 * These templates must be created and approved in Meta Business Manager
 * before they can be used. Templates are required for proactive messages
 * (messages sent without the customer first messaging you).
 * 
 * Documentation: https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
 */

export interface WhatsAppTemplate {
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  components: Array<{
    type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
    format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
    text?: string;
    buttons?: Array<{
      type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
      text: string;
      url?: string;
      phone_number?: string;
    }>;
  }>;
}

/**
 * Template: New Booking Notification
 * 
 * Notifies business when a new booking is created.
 * 
 * Template Name: new_booking_notification
 * Category: UTILITY
 */
export const NEW_BOOKING_TEMPLATE: WhatsAppTemplate = {
  name: "new_booking_notification",
  category: "UTILITY",
  language: "en_US",
  components: [
    {
      type: "HEADER",
      format: "TEXT",
      text: "New Booking Received",
    },
    {
      type: "BODY",
      text: "You have a new booking!\n\nCustomer: {{1}}\nService: {{2}}\nDate: {{3}}\nTime: {{4}}\n\nBooking ID: {{5}}",
    },
    {
      type: "FOOTER",
      text: "Check your dashboard for details",
    },
  ],
};

/**
 * Template: Booking Cancelled Notification
 * 
 * Notifies business when a booking is cancelled.
 * 
 * Template Name: booking_cancelled_notification
 * Category: UTILITY
 */
export const BOOKING_CANCELLED_TEMPLATE: WhatsAppTemplate = {
  name: "booking_cancelled_notification",
  category: "UTILITY",
  language: "en_US",
  components: [
    {
      type: "HEADER",
      format: "TEXT",
      text: "Booking Cancelled",
    },
    {
      type: "BODY",
      text: "A booking has been cancelled.\n\nCustomer: {{1}}\nService: {{2}}\nOriginal Date: {{3}}\nOriginal Time: {{4}}\n\nBooking ID: {{5}}",
    },
    {
      type: "FOOTER",
      text: "Check your dashboard for details",
    },
  ],
};

/**
 * Template: Booking Modified Notification
 * 
 * Notifies business when a booking is modified/rescheduled.
 * 
 * Template Name: booking_modified_notification
 * Category: UTILITY
 */
export const BOOKING_MODIFIED_TEMPLATE: WhatsAppTemplate = {
  name: "booking_modified_notification",
  category: "UTILITY",
  language: "en_US",
  components: [
    {
      type: "HEADER",
      format: "TEXT",
      text: "Booking Modified",
    },
    {
      type: "BODY",
      text: "A booking has been modified.\n\nCustomer: {{1}}\nService: {{2}}\nNew Date: {{3}}\nNew Time: {{4}}\n\nBooking ID: {{5}}",
    },
    {
      type: "FOOTER",
      text: "Check your dashboard for details",
    },
  ],
};

/**
 * Template parameter mapping
 * 
 * Maps booking data to template parameters
 */
export const TEMPLATE_PARAMETER_MAP = {
  new_booking_notification: {
    1: "customer_name",
    2: "service_name",
    3: "date",
    4: "time",
    5: "booking_id",
  },
  booking_cancelled_notification: {
    1: "customer_name",
    2: "service_name",
    3: "date",
    4: "time",
    5: "booking_id",
  },
  booking_modified_notification: {
    1: "customer_name",
    2: "service_name",
    3: "date",
    4: "time",
    5: "booking_id",
  },
} as const;

/**
 * Get template creation instructions
 */
export function getTemplateCreationInstructions(): string {
  return `
To use WhatsApp notifications, you need to create and approve message templates in Meta Business Manager:

1. Go to Meta Business Manager (https://business.facebook.com)
2. Navigate to WhatsApp > Message Templates
3. Create the following templates:

Template 1: new_booking_notification
- Category: UTILITY
- Header: "New Booking Received" (Text)
- Body: "You have a new booking!\n\nCustomer: {{1}}\nService: {{2}}\nDate: {{3}}\nTime: {{4}}\n\nBooking ID: {{5}}"
- Footer: "Check your dashboard for details"

Template 2: booking_cancelled_notification
- Category: UTILITY
- Header: "Booking Cancelled" (Text)
- Body: "A booking has been cancelled.\n\nCustomer: {{1}}\nService: {{2}}\nOriginal Date: {{3}}\nOriginal Time: {{4}}\n\nBooking ID: {{5}}"
- Footer: "Check your dashboard for details"

Template 3: booking_modified_notification
- Category: UTILITY
- Header: "Booking Modified" (Text)
- Body: "A booking has been modified.\n\nCustomer: {{1}}\nService: {{2}}\nNew Date: {{3}}\nNew Time: {{4}}\n\nBooking ID: {{5}}"
- Footer: "Check your dashboard for details"

Note: Templates must be approved by Meta before they can be used. Approval typically takes 24-48 hours.
  `.trim();
}
