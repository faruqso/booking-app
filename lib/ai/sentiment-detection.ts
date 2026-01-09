/**
 * Simple Sentiment Detection
 * Keyword-based sentiment analysis for customer notes
 */

export type SentimentType = "positive" | "neutral" | "urgent" | "negative";

export interface SentimentResult {
  type: SentimentType;
  confidence: number;
  keywords: string[];
}

/**
 * Positive keywords indicating good sentiment
 */
const POSITIVE_KEYWORDS = [
  "thank", "thanks", "great", "excellent", "wonderful", "amazing", "fantastic",
  "perfect", "love", "appreciate", "happy", "pleased", "satisfied", "looking forward",
  "excited", "can't wait", "awesome", "brilliant", "superb", "outstanding",
];

/**
 * Negative keywords indicating concern or issue
 */
const NEGATIVE_KEYWORDS = [
  "disappointed", "unhappy", "upset", "concerned", "worried", "frustrated",
  "angry", "unsatisfied", "poor", "terrible", "awful", "bad", "horrible",
  "issue", "problem", "complaint", "wrong", "mistake", "error", "failed",
];

/**
 * Urgent keywords requiring immediate attention
 */
const URGENT_KEYWORDS = [
  "urgent", "asap", "as soon as possible", "immediate", "emergency", "critical",
  "important", "rush", "quickly", "fast", "today", "now", "right away",
  "priority", "stat", "pronto", "hurry", "desperate", "pressing",
];

/**
 * Detect sentiment from customer note text
 */
export function detectSentiment(text: string): SentimentResult {
  if (!text || text.trim().length === 0) {
    return {
      type: "neutral",
      confidence: 1.0,
      keywords: [],
    };
  }

  const normalizedText = text.toLowerCase();
  const words = normalizedText.split(/\s+/);
  
  const foundPositive: string[] = [];
  const foundNegative: string[] = [];
  const foundUrgent: string[] = [];

  // Check for positive keywords
  POSITIVE_KEYWORDS.forEach(keyword => {
    if (normalizedText.includes(keyword.toLowerCase())) {
      foundPositive.push(keyword);
    }
  });

  // Check for negative keywords
  NEGATIVE_KEYWORDS.forEach(keyword => {
    if (normalizedText.includes(keyword.toLowerCase())) {
      foundNegative.push(keyword);
    }
  });

  // Check for urgent keywords
  URGENT_KEYWORDS.forEach(keyword => {
    if (normalizedText.includes(keyword.toLowerCase())) {
      foundUrgent.push(keyword);
    }
  });

  // Determine sentiment priority: urgent > negative > positive > neutral
  if (foundUrgent.length > 0) {
    return {
      type: "urgent",
      confidence: Math.min(0.9, 0.5 + (foundUrgent.length * 0.1)),
      keywords: foundUrgent,
    };
  }

  if (foundNegative.length > 0) {
    return {
      type: "negative",
      confidence: Math.min(0.9, 0.5 + (foundNegative.length * 0.1)),
      keywords: foundNegative,
    };
  }

  if (foundPositive.length > 0) {
    return {
      type: "positive",
      confidence: Math.min(0.9, 0.5 + (foundPositive.length * 0.1)),
      keywords: foundPositive,
    };
  }

  return {
    type: "neutral",
    confidence: 1.0,
    keywords: [],
  };
}

/**
 * Get sentiment badge color for UI
 */
export function getSentimentColor(type: SentimentType): string {
  switch (type) {
    case "positive":
      return "bg-green-500";
    case "negative":
      return "bg-red-500";
    case "urgent":
      return "bg-orange-500";
    case "neutral":
    default:
      return "bg-gray-500";
  }
}

/**
 * Get sentiment label for UI
 */
export function getSentimentLabel(type: SentimentType): string {
  switch (type) {
    case "positive":
      return "Positive";
    case "negative":
      return "Needs Attention";
    case "urgent":
      return "Urgent";
    case "neutral":
    default:
      return "Neutral";
  }
}

