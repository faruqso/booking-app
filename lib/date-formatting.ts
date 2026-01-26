import { format } from "date-fns";

export interface LocalizationSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: string;
}

// Default settings
const DEFAULT_SETTINGS: LocalizationSettings = {
  timezone: "UTC",
  dateFormat: "MMM d, yyyy",
  timeFormat: "h:mm a",
};

// Cache for localization settings
let cachedSettings: LocalizationSettings | null = null;
let settingsPromise: Promise<LocalizationSettings> | null = null;

/**
 * Fetch localization settings from the API
 */
export async function getLocalizationSettings(): Promise<LocalizationSettings> {
  // Return cached settings if available
  if (cachedSettings) {
    return cachedSettings;
  }

  // Return existing promise if already fetching
  if (settingsPromise) {
    return settingsPromise;
  }

  // Fetch settings
  settingsPromise = fetch("/api/business/localization")
    .then(async (response) => {
      if (response.ok) {
        const data = await response.json();
        cachedSettings = {
          timezone: data.timezone || DEFAULT_SETTINGS.timezone,
          dateFormat: data.dateFormat || DEFAULT_SETTINGS.dateFormat,
          timeFormat: data.timeFormat || DEFAULT_SETTINGS.timeFormat,
        };
        return cachedSettings;
      }
      return DEFAULT_SETTINGS;
    })
    .catch(() => {
      return DEFAULT_SETTINGS;
    })
    .finally(() => {
      settingsPromise = null;
    });

  return settingsPromise;
}

/**
 * Format a date according to localization settings
 */
export function formatDateWithSettings(date: Date | string, settings: LocalizationSettings): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, settings.dateFormat);
}

/**
 * Format a time according to localization settings
 */
export function formatTimeWithSettings(date: Date | string, settings: LocalizationSettings): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, settings.timeFormat);
}

/**
 * Format both date and time according to localization settings
 */
export function formatDateTimeWithSettings(date: Date | string, settings: LocalizationSettings): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return `${format(dateObj, settings.dateFormat)} ${format(dateObj, settings.timeFormat)}`;
}

/**
 * Clear cached settings (call this when settings are updated)
 */
export function clearLocalizationCache() {
  cachedSettings = null;
  settingsPromise = null;
}
