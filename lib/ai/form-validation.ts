/**
 * Enhanced Form Validation Messages
 * Provides contextual, user-friendly error messages
 */

export interface ValidationContext {
  fieldName: string;
  fieldValue: any;
  errorType: string;
  fieldType?: string;
}

/**
 * Get friendly, contextual validation error messages
 */
export function getFriendlyErrorMessage(context: ValidationContext): string {
  const { fieldName, fieldValue, errorType, fieldType } = context;

  // Field-specific messages
  const fieldMessages: Record<string, Record<string, string>> = {
    name: {
      required: "Please enter a service name",
      min: "Service name must be at least 2 characters long",
      max: "Service name is too long (maximum 100 characters)",
      pattern: "Service name contains invalid characters",
    },
    duration: {
      required: "Please set the duration of the service",
      min: "Duration must be at least 5 minutes",
      max: "Duration cannot exceed 8 hours (480 minutes)",
      type: "Duration must be a number",
      int: "Duration must be a whole number (no decimals)",
    },
    price: {
      required: "Please set a price for the service",
      min: "Price cannot be negative",
      max: "Price seems unusually high. Please verify the amount.",
      type: "Price must be a number",
    },
    description: {
      max: "Description is too long (maximum 500 characters)",
    },
    email: {
      required: "Please enter your email address",
      email: "Please enter a valid email address",
      pattern: "Email format is invalid",
    },
    password: {
      required: "Please enter a password",
      min: "Password must be at least 8 characters long",
      pattern: "Password must contain at least one letter and one number",
    },
  };

  // Try field-specific message first
  if (fieldMessages[fieldName] && fieldMessages[fieldName][errorType]) {
    return fieldMessages[fieldName][errorType];
  }

  // Generic messages based on error type
  const genericMessages: Record<string, string> = {
    required: `Please provide a ${fieldName}`,
    min: `The ${fieldName} value is too small`,
    max: `The ${fieldName} value is too large`,
    type: `Please enter a valid ${fieldType || fieldName}`,
    pattern: `The ${fieldName} format is invalid`,
    email: "Please enter a valid email address",
    url: "Please enter a valid URL",
    date: "Please enter a valid date",
    number: "Please enter a valid number",
    int: "Please enter a whole number",
  };

  return genericMessages[errorType] || `Invalid ${fieldName}`;
}

/**
 * Get helpful tip based on field and current value
 */
export function getValidationTip(fieldName: string, value: any): string | null {
  const tips: Record<string, (value: any) => string | null> = {
    name: (val: string) => {
      if (!val || val.length < 2) {
        return "Tip: Use a clear, descriptive name that customers will understand (e.g., 'Haircut', 'Consultation')";
      }
      return null;
    },
    duration: (val: number) => {
      if (!val || val < 5) {
        return "Tip: Most services are between 15-120 minutes. Short services (5-30 min) work well for quick treatments.";
      }
      if (val > 240) {
        return "Tip: Services longer than 4 hours are uncommon. Consider breaking this into multiple sessions.";
      }
      return null;
    },
    price: (val: number) => {
      if (!val || val === 0) {
        return "Tip: Research similar services in your area to set competitive pricing. Free services should still have a price of $0.01 to allow booking.";
      }
      if (val > 1000) {
        return "Tip: For premium services over $1000, consider clearly communicating value to customers in the description.";
      }
      return null;
    },
    description: (val: string) => {
      if (!val || val.length < 10) {
        return "Tip: A good description helps customers understand what to expect. Include key details like what's included, duration, and any special requirements.";
      }
      return null;
    },
  };

  const tipFunction = tips[fieldName];
  return tipFunction ? tipFunction(value) : null;
}

/**
 * Format validation error with helpful context
 */
export function formatValidationError(
  fieldName: string,
  error: { type: string; message?: string },
  value: any,
  fieldType?: string
): { message: string; tip: string | null } {
  const message = error.message || getFriendlyErrorMessage({
    fieldName,
    fieldValue: value,
    errorType: error.type,
    fieldType,
  });

  const tip = getValidationTip(fieldName, value);

  return { message, tip };
}

