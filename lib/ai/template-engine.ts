/**
 * Smart Template Engine
 * Enhanced template system with variable substitution and conditional logic
 */

export interface TemplateVariables {
  [key: string]: string | number | Date | undefined | null;
}

/**
 * Simple template variable substitution
 * Supports {{variable}} syntax
 */
export function substituteTemplate(template: string, variables: TemplateVariables): string {
  let result = template;

  // Replace all {{variable}} patterns
  const regex = /{{\s*(\w+)\s*}}/g;
  
  result = result.replace(regex, (match, varName) => {
    const value = variables[varName];
    
    if (value === undefined || value === null) {
      // Return empty string for missing variables
      return "";
    }
    
    // Handle Date objects
    if (value instanceof Date) {
      return value.toLocaleString();
    }
    
    // Convert to string
    return String(value);
  });

  // Handle conditional blocks: {{#if variable}}...{{/if}}
  const ifRegex = /{{\s*#if\s+(\w+)\s*}}([\s\S]*?){{\s*\/if\s*}}/g;
  result = result.replace(ifRegex, (match, varName, content) => {
    const value = variables[varName];
    const isTruthy = value !== undefined && value !== null && value !== "" && value !== 0 && (typeof value !== "boolean" || value === true);
    if (isTruthy) {
      return substituteTemplate(content, variables);
    }
    return "";
  });

  // Handle {{#unless variable}}...{{/unless}}
  const unlessRegex = /{{\s*#unless\s+(\w+)\s*}}([\s\S]*?){{\s*\/unless\s*}}/g;
  result = result.replace(unlessRegex, (match, varName, content) => {
    const value = variables[varName];
    const isFalsy = value === undefined || value === null || value === "" || value === 0 || (typeof value === "boolean" && value === false);
    if (isFalsy) {
      return substituteTemplate(content, variables);
    }
    return "";
  });

  return result.trim();
}

/**
 * Email subject line templates with variable substitution
 */
export const EMAIL_SUBJECT_TEMPLATES = {
  bookingConfirmation: "Booking Confirmed - {{businessName}}",
  bookingReminder: "Reminder: {{serviceName}} on {{date}}",
  bookingCancellation: "Booking Cancelled - {{businessName}}",
  bookingRescheduling: "Booking Rescheduled - {{businessName}}",
  passwordReset: "Reset Your Password",
  welcome: "Welcome to {{businessName}}!",
};

/**
 * Format time for display in templates
 */
export function formatTime(date: Date | string): string {
  if (typeof date === "string") {
    date = new Date(date);
  }
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Booking confirmation message templates
 */
export const BOOKING_MESSAGE_TEMPLATES = {
  default: `Hi {{customerName}},

Your booking for {{serviceName}} is confirmed for {{startTime}}.

We look forward to seeing you!

{{businessName}}`,
  
  withNotes: `Hi {{customerName}},

Your booking for {{serviceName}} is confirmed for {{startTime}}.

{{#if notes}}
Special notes: {{notes}}
{{/if}}

We look forward to seeing you!

{{businessName}}`,
  
  friendly: `Hello {{customerName}}! 👋

Great news! Your {{serviceName}} appointment is all set for {{startTime}}.

{{#if notes}}
Note: {{notes}}
{{/if}}

See you soon!

Best regards,
{{businessName}}`,
};

/**
 * Get a template and substitute variables
 */
export function getTemplate(
  templateKey: keyof typeof BOOKING_MESSAGE_TEMPLATES,
  variables: TemplateVariables
): string {
  const template = BOOKING_MESSAGE_TEMPLATES[templateKey];
  return substituteTemplate(template, variables);
}

/**
 * Generate booking confirmation message
 */
export function generateBookingConfirmation(
  variables: {
    customerName: string;
    serviceName: string;
    startTime: Date | string;
    businessName: string;
    notes?: string;
  },
  templateType: keyof typeof BOOKING_MESSAGE_TEMPLATES = "default"
): string {
  const formattedTime = variables.startTime instanceof Date
    ? variables.startTime.toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : variables.startTime;

  return getTemplate(templateType, {
    customerName: variables.customerName,
    serviceName: variables.serviceName,
    startTime: formattedTime,
    businessName: variables.businessName,
    notes: variables.notes,
  });
}

/**
 * Generate email subject with variable substitution
 */
export function generateEmailSubject(
  templateKey: keyof typeof EMAIL_SUBJECT_TEMPLATES,
  variables: TemplateVariables
): string {
  const template = EMAIL_SUBJECT_TEMPLATES[templateKey];
  return substituteTemplate(template, variables);
}

