// Currency utilities for formatting and validation

export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$", providerSupport: ["stripe", "paystack", "flutterwave"] },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", providerSupport: ["paystack", "flutterwave"] },
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵", providerSupport: ["paystack", "flutterwave"] },
  { code: "ZAR", name: "South African Rand", symbol: "R", providerSupport: ["paystack", "flutterwave"] },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", providerSupport: ["paystack", "flutterwave"] },
  { code: "GBP", name: "British Pound", symbol: "£", providerSupport: ["stripe", "flutterwave"] },
  { code: "EUR", name: "Euro", symbol: "€", providerSupport: ["stripe", "flutterwave"] },
] as const;

export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number]["code"];

/**
 * Get currency information by code
 */
export function getCurrencyInfo(code: string) {
  return SUPPORTED_CURRENCIES.find((c) => c.code === code) || SUPPORTED_CURRENCIES[0];
}

/**
 * Format amount with currency symbol
 */
export function formatCurrency(amount: number | string, currencyCode: string = "USD"): string {
  const currency = getCurrencyInfo(currencyCode);
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(numAmount)) return `${currency.symbol}0.00`;
  
  // Format number with 2 decimal places
  const formatted = numAmount.toFixed(2);
  
  // Add thousand separators
  const parts = formatted.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  
  return `${currency.symbol}${parts.join(".")}`;
}

/**
 * Get currencies supported by a payment provider
 */
export type CurrencyItem = (typeof SUPPORTED_CURRENCIES)[number];

export function getCurrenciesForProvider(provider: "stripe" | "paystack" | "flutterwave" | null): readonly CurrencyItem[] {
  if (!provider) return SUPPORTED_CURRENCIES;
  return SUPPORTED_CURRENCIES.filter((c) => (c.providerSupport as readonly string[]).includes(provider));
}
