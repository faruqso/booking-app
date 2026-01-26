/**
 * Utility functions to detect date and time formats from browser locale
 */

/**
 * Detect date format preference based on browser locale
 * Returns a date-fns compatible format string
 */
export function detectDateFormat(): "MMM d, yyyy" | "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy-MM-dd" | "MMMM d, yyyy" | "d MMM yyyy" {
  try {
    const locale = navigator.language || navigator.languages?.[0] || "en-US";
    
    // Create a test date to see how the browser formats it
    const testDate = new Date(2024, 0, 15); // Jan 15, 2024
    
    // Use Intl.DateTimeFormat to get locale-specific formatting
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
    
    const formatted = dateFormatter.format(testDate);
    
    // Detect format pattern
    // US format: 1/15/2024 or 01/15/2024
    if (formatted.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      // Check if it's US (MM/DD) or European (DD/MM) by checking locale
      if (locale.startsWith("en-US") || locale.startsWith("en-CA") || locale.startsWith("en-PH")) {
        return "MM/dd/yyyy";
      } else {
        return "dd/MM/yyyy";
      }
    }
    
    // ISO format: 2024-01-15
    if (formatted.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return "yyyy-MM-dd";
    }
    
    // European format: 15/01/2024
    if (formatted.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      return "dd/MM/yyyy";
    }
    
    // Try to detect based on locale
    if (locale.startsWith("en-US") || locale.startsWith("en-CA") || locale.startsWith("en-PH")) {
      return "MM/dd/yyyy";
    }
    
    if (locale.startsWith("en-GB") || locale.startsWith("en-AU") || locale.startsWith("en-NZ")) {
      return "d MMM yyyy";
    }
    
    // European locales (most use DD/MM/YYYY)
    if (locale.startsWith("en") || locale.startsWith("de") || locale.startsWith("fr") || 
        locale.startsWith("es") || locale.startsWith("it") || locale.startsWith("pt")) {
      // Check if it's a European English variant
      if (locale.startsWith("en-GB") || locale.startsWith("en-AU") || locale.startsWith("en-NZ")) {
        return "d MMM yyyy";
      }
      // For other European locales, try to detect
      const longFormatter = new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const longFormatted = longFormatter.format(testDate);
      
      // If it contains month name, prefer a format with month name
      if (longFormatted.includes("January") || longFormatted.includes("Janvier") || 
          longFormatted.includes("Januar") || longFormatted.includes("enero")) {
        return "MMMM d, yyyy";
      }
      
      return "dd/MM/yyyy";
    }
    
    // Default fallback
    return "MMM d, yyyy";
  } catch (error) {
    console.error("Failed to detect date format:", error);
    return "MMM d, yyyy";
  }
}

/**
 * Detect time format preference based on browser locale
 * Returns "h:mm a" for 12-hour format or "HH:mm" for 24-hour format
 */
export function detectTimeFormat(): "h:mm a" | "HH:mm" {
  try {
    const locale = navigator.language || navigator.languages?.[0] || "en-US";
    
    // Create a test time
    const testDate = new Date();
    testDate.setHours(15, 30); // 3:30 PM
    
    // Use Intl.DateTimeFormat to get locale-specific time formatting
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "numeric",
      hour12: undefined, // Let the locale decide
    });
    
    const formatted = timeFormatter.format(testDate);
    
    // Check if it contains AM/PM indicators (case-insensitive)
    const hasAmPm = /am|pm/i.test(formatted);
    
    // Some locales use 24-hour by default
    // US, Canada, Philippines, India typically use 12-hour
    // Most European countries use 24-hour
    if (hasAmPm) {
      return "h:mm a";
    }
    
    // Check locale patterns
    // Countries that typically use 12-hour format
    const twelveHourLocales = [
      "en-US", "en-CA", "en-PH", "en-IN", "en-AU", "en-NZ",
      "es-MX", "es-CO", "es-AR", "es-CL", "es-PE",
      "pt-BR", "hi-IN", "ar", "he", "bn", "ur"
    ];
    
    if (twelveHourLocales.some(loc => locale.startsWith(loc))) {
      return "h:mm a";
    }
    
    // Most other locales use 24-hour format
    return "HH:mm";
  } catch (error) {
    console.error("Failed to detect time format:", error);
    return "h:mm a";
  }
}

/**
 * Detect timezone from browser
 */
export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch (error) {
    console.error("Failed to detect timezone:", error);
    return "UTC";
  }
}
