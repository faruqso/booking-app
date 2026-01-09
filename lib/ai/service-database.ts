/**
 * Service Database - Common services by category
 * Used for autocomplete, category detection, duration, and price suggestions
 */

export interface ServiceSuggestion {
  name: string;
  category: string;
  typicalDuration: number; // in minutes
  priceRange: {
    min: number;
    max: number;
    typical: number;
  };
  tags: string[];
  description?: string;
}

export const SERVICE_CATEGORIES = [
  "Beauty & Wellness",
  "Fitness & Health",
  "Professional Services",
  "Education & Training",
  "Home & Maintenance",
  "Entertainment & Events",
  "Automotive",
  "Food & Beverage",
  "Other",
] as const;

export type ServiceCategory = typeof SERVICE_CATEGORIES[number];

/**
 * Comprehensive database of common services
 * Organized by category for easy lookup and suggestions
 */
export const SERVICE_DATABASE: ServiceSuggestion[] = [
  // Beauty & Wellness
  { name: "Haircut", category: "Beauty & Wellness", typicalDuration: 30, priceRange: { min: 15, max: 75, typical: 35 }, tags: ["hair", "styling", "personal care"] },
  { name: "Hair Styling", category: "Beauty & Wellness", typicalDuration: 60, priceRange: { min: 40, max: 150, typical: 75 }, tags: ["hair", "styling", "special occasion"] },
  { name: "Hair Color", category: "Beauty & Wellness", typicalDuration: 120, priceRange: { min: 75, max: 300, typical: 150 }, tags: ["hair", "color", "treatment"] },
  { name: "Hair Highlights", category: "Beauty & Wellness", typicalDuration: 180, priceRange: { min: 100, max: 400, typical: 200 }, tags: ["hair", "color", "highlights"] },
  { name: "Facial", category: "Beauty & Wellness", typicalDuration: 60, priceRange: { min: 50, max: 200, typical: 100 }, tags: ["skincare", "facial", "treatment"] },
  { name: "Manicure", category: "Beauty & Wellness", typicalDuration: 45, priceRange: { min: 20, max: 75, typical: 40 }, tags: ["nails", "manicure", "hands"] },
  { name: "Pedicure", category: "Beauty & Wellness", typicalDuration: 60, priceRange: { min: 30, max: 90, typical: 55 }, tags: ["nails", "pedicure", "feet"] },
  { name: "Massage", category: "Beauty & Wellness", typicalDuration: 60, priceRange: { min: 60, max: 150, typical: 90 }, tags: ["massage", "relaxation", "wellness"] },
  { name: "Deep Tissue Massage", category: "Beauty & Wellness", typicalDuration: 90, priceRange: { min: 90, max: 200, typical: 120 }, tags: ["massage", "therapeutic", "pain relief"] },
  { name: "Swedish Massage", category: "Beauty & Wellness", typicalDuration: 60, priceRange: { min: 60, max: 150, typical: 85 }, tags: ["massage", "relaxation", "swedish"] },
  { name: "Waxing", category: "Beauty & Wellness", typicalDuration: 30, priceRange: { min: 25, max: 100, typical: 50 }, tags: ["hair removal", "waxing", "beauty"] },
  { name: "Eyebrow Threading", category: "Beauty & Wellness", typicalDuration: 15, priceRange: { min: 10, max: 30, typical: 18 }, tags: ["eyebrows", "threading", "beauty"] },
  { name: "Lash Extensions", category: "Beauty & Wellness", typicalDuration: 120, priceRange: { min: 100, max: 300, typical: 180 }, tags: ["lashes", "extensions", "beauty"] },
  { name: "Makeup Application", category: "Beauty & Wellness", typicalDuration: 60, priceRange: { min: 50, max: 200, typical: 100 }, tags: ["makeup", "cosmetics", "special occasion"] },
  { name: "Brow Lamination", category: "Beauty & Wellness", typicalDuration: 45, priceRange: { min: 40, max: 100, typical: 65 }, tags: ["eyebrows", "lamination", "beauty"] },
  { name: "Hair Treatment", category: "Beauty & Wellness", typicalDuration: 45, priceRange: { min: 40, max: 150, typical: 75 }, tags: ["hair", "treatment", "repair"] },
  { name: "Scalp Treatment", category: "Beauty & Wellness", typicalDuration: 45, priceRange: { min: 45, max: 120, typical: 70 }, tags: ["hair", "scalp", "treatment"] },
  { name: "Acrylic Nails", category: "Beauty & Wellness", typicalDuration: 90, priceRange: { min: 40, max: 120, typical: 65 }, tags: ["nails", "acrylic", "manicure"] },
  { name: "Gel Nails", category: "Beauty & Wellness", typicalDuration: 60, priceRange: { min: 35, max: 100, typical: 55 }, tags: ["nails", "gel", "manicure"] },

  // Fitness & Health
  { name: "Personal Training", category: "Fitness & Health", typicalDuration: 60, priceRange: { min: 50, max: 150, typical: 75 }, tags: ["fitness", "training", "exercise"] },
  { name: "Yoga Class", category: "Fitness & Health", typicalDuration: 60, priceRange: { min: 15, max: 30, typical: 20 }, tags: ["yoga", "fitness", "mindfulness"] },
  { name: "Pilates Class", category: "Fitness & Health", typicalDuration: 60, priceRange: { min: 20, max: 45, typical: 30 }, tags: ["pilates", "fitness", "core"] },
  { name: "Spin Class", category: "Fitness & Health", typicalDuration: 45, priceRange: { min: 15, max: 30, typical: 22 }, tags: ["cycling", "cardio", "fitness"] },
  { name: "Nutrition Consultation", category: "Fitness & Health", typicalDuration: 60, priceRange: { min: 75, max: 200, typical: 120 }, tags: ["nutrition", "health", "consultation"] },
  { name: "Physical Therapy", category: "Fitness & Health", typicalDuration: 60, priceRange: { min: 80, max: 200, typical: 120 }, tags: ["therapy", "rehabilitation", "health"] },
  { name: "Chiropractic Adjustment", category: "Fitness & Health", typicalDuration: 30, priceRange: { min: 60, max: 150, typical: 85 }, tags: ["chiropractic", "health", "adjustment"] },
  { name: "Acupuncture", category: "Fitness & Health", typicalDuration: 60, priceRange: { min: 70, max: 150, typical: 100 }, tags: ["acupuncture", "alternative medicine", "health"] },
  { name: "Personal Training Session", category: "Fitness & Health", typicalDuration: 60, priceRange: { min: 50, max: 150, typical: 80 }, tags: ["fitness", "personal training", "exercise"] },
  { name: "Nutrition Planning", category: "Fitness & Health", typicalDuration: 90, priceRange: { min: 100, max: 250, typical: 150 }, tags: ["nutrition", "meal planning", "health"] },

  // Professional Services
  { name: "Consultation", category: "Professional Services", typicalDuration: 60, priceRange: { min: 50, max: 300, typical: 100 }, tags: ["consultation", "advice", "professional"] },
  { name: "Legal Consultation", category: "Professional Services", typicalDuration: 60, priceRange: { min: 150, max: 500, typical: 250 }, tags: ["legal", "lawyer", "consultation"] },
  { name: "Financial Planning", category: "Professional Services", typicalDuration: 90, priceRange: { min: 100, max: 400, typical: 200 }, tags: ["finance", "planning", "financial"] },
  { name: "Business Consulting", category: "Professional Services", typicalDuration: 90, priceRange: { min: 150, max: 500, typical: 300 }, tags: ["business", "consulting", "strategy"] },
  { name: "Career Coaching", category: "Professional Services", typicalDuration: 60, priceRange: { min: 75, max: 200, typical: 125 }, tags: ["career", "coaching", "professional"] },
  { name: "Life Coaching", category: "Professional Services", typicalDuration: 60, priceRange: { min: 75, max: 200, typical: 120 }, tags: ["coaching", "life", "personal development"] },
  { name: "Accounting Services", category: "Professional Services", typicalDuration: 60, priceRange: { min: 100, max: 300, typical: 150 }, tags: ["accounting", "tax", "financial"] },
  { name: "Marketing Consultation", category: "Professional Services", typicalDuration: 90, priceRange: { min: 100, max: 400, typical: 200 }, tags: ["marketing", "consultation", "business"] },

  // Education & Training
  { name: "Tutoring Session", category: "Education & Training", typicalDuration: 60, priceRange: { min: 30, max: 100, typical: 50 }, tags: ["tutoring", "education", "learning"] },
  { name: "Music Lesson", category: "Education & Training", typicalDuration: 60, priceRange: { min: 40, max: 100, typical: 60 }, tags: ["music", "lesson", "education"] },
  { name: "Language Lesson", category: "Education & Training", typicalDuration: 60, priceRange: { min: 30, max: 80, typical: 45 }, tags: ["language", "lesson", "education"] },
  { name: "Art Class", category: "Education & Training", typicalDuration: 90, priceRange: { min: 40, max: 100, typical: 60 }, tags: ["art", "class", "creative"] },
  { name: "Photography Lesson", category: "Education & Training", typicalDuration: 120, priceRange: { min: 75, max: 200, typical: 125 }, tags: ["photography", "lesson", "skills"] },
  { name: "Cooking Class", category: "Education & Training", typicalDuration: 120, priceRange: { min: 60, max: 150, typical: 90 }, tags: ["cooking", "culinary", "class"] },
  { name: "Driving Lesson", category: "Education & Training", typicalDuration: 60, priceRange: { min: 40, max: 80, typical: 55 }, tags: ["driving", "lesson", "automotive"] },

  // Home & Maintenance
  { name: "House Cleaning", category: "Home & Maintenance", typicalDuration: 120, priceRange: { min: 80, max: 200, typical: 120 }, tags: ["cleaning", "home", "maintenance"] },
  { name: "Deep Cleaning", category: "Home & Maintenance", typicalDuration: 240, priceRange: { min: 150, max: 400, typical: 250 }, tags: ["cleaning", "deep clean", "home"] },
  { name: "Plumbing Service", category: "Home & Maintenance", typicalDuration: 60, priceRange: { min: 100, max: 250, typical: 150 }, tags: ["plumbing", "repair", "home"] },
  { name: "Electrical Service", category: "Home & Maintenance", typicalDuration: 60, priceRange: { min: 100, max: 250, typical: 150 }, tags: ["electrical", "repair", "home"] },
  { name: "Handyman Service", category: "Home & Maintenance", typicalDuration: 120, priceRange: { min: 80, max: 200, typical: 120 }, tags: ["handyman", "repair", "home"] },
  { name: "HVAC Service", category: "Home & Maintenance", typicalDuration: 90, priceRange: { min: 100, max: 300, typical: 175 }, tags: ["hvac", "heating", "cooling"] },
  { name: "Lawn Care", category: "Home & Maintenance", typicalDuration: 60, priceRange: { min: 50, max: 150, typical: 80 }, tags: ["lawn", "gardening", "outdoor"] },
  { name: "Window Cleaning", category: "Home & Maintenance", typicalDuration: 90, priceRange: { min: 80, max: 200, typical: 120 }, tags: ["windows", "cleaning", "home"] },

  // Entertainment & Events
  { name: "Photo Shoot", category: "Entertainment & Events", typicalDuration: 120, priceRange: { min: 150, max: 500, typical: 300 }, tags: ["photography", "photos", "events"] },
  { name: "Event Planning", category: "Entertainment & Events", typicalDuration: 120, priceRange: { min: 200, max: 1000, typical: 400 }, tags: ["event", "planning", "coordination"] },
  { name: "DJ Service", category: "Entertainment & Events", typicalDuration: 240, priceRange: { min: 300, max: 1000, typical: 500 }, tags: ["dj", "music", "entertainment"] },
  { name: "Pet Grooming", category: "Entertainment & Events", typicalDuration: 90, priceRange: { min: 40, max: 100, typical: 60 }, tags: ["pet", "grooming", "animals"] },
  { name: "Pet Sitting", category: "Entertainment & Events", typicalDuration: 60, priceRange: { min: 25, max: 60, typical: 40 }, tags: ["pet", "sitting", "care"] },

  // Automotive
  { name: "Oil Change", category: "Automotive", typicalDuration: 30, priceRange: { min: 30, max: 80, typical: 45 }, tags: ["automotive", "oil", "maintenance"] },
  { name: "Car Wash", category: "Automotive", typicalDuration: 30, priceRange: { min: 15, max: 50, typical: 25 }, tags: ["automotive", "car wash", "cleaning"] },
  { name: "Tire Service", category: "Automotive", typicalDuration: 45, priceRange: { min: 50, max: 150, typical: 80 }, tags: ["automotive", "tires", "repair"] },
  { name: "Auto Inspection", category: "Automotive", typicalDuration: 60, priceRange: { min: 75, max: 150, typical: 100 }, tags: ["automotive", "inspection", "safety"] },
  { name: "Brake Service", category: "Automotive", typicalDuration: 90, priceRange: { min: 100, max: 300, typical: 180 }, tags: ["automotive", "brakes", "repair"] },

  // Food & Beverage
  { name: "Private Chef", category: "Food & Beverage", typicalDuration: 180, priceRange: { min: 200, max: 800, typical: 400 }, tags: ["chef", "cooking", "catering"] },
  { name: "Catering Service", category: "Food & Beverage", typicalDuration: 240, priceRange: { min: 300, max: 2000, typical: 800 }, tags: ["catering", "food", "events"] },
  { name: "Wine Tasting", category: "Food & Beverage", typicalDuration: 90, priceRange: { min: 40, max: 150, typical: 75 }, tags: ["wine", "tasting", "beverage"] },
];

/**
 * Get service suggestions based on search query
 */
export function getServiceSuggestions(query: string, limit: number = 10): ServiceSuggestion[] {
  if (!query || query.length < 1) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  // Exact match first
  const exactMatch = SERVICE_DATABASE.find(
    service => service.name.toLowerCase() === normalizedQuery
  );
  if (exactMatch) {
    return [exactMatch];
  }

  // Fuzzy match by name
  const nameMatches = SERVICE_DATABASE.filter(service =>
    service.name.toLowerCase().includes(normalizedQuery)
  );

  // Tag matches
  const tagMatches = SERVICE_DATABASE.filter(service =>
    service.tags.some(tag => tag.toLowerCase().includes(normalizedQuery))
  );

  // Combine and deduplicate
  const allMatches = [...nameMatches, ...tagMatches];
  const uniqueMatches = Array.from(
    new Map(allMatches.map(item => [item.name, item])).values()
  );

  // Sort by relevance (name matches first, then tag matches)
  const sorted = uniqueMatches.sort((a, b) => {
    const aNameMatch = a.name.toLowerCase().includes(normalizedQuery);
    const bNameMatch = b.name.toLowerCase().includes(normalizedQuery);
    
    if (aNameMatch && !bNameMatch) return -1;
    if (!aNameMatch && bNameMatch) return 1;
    
    return a.name.localeCompare(b.name);
  });

  return sorted.slice(0, limit);
}

/**
 * Detect category from service name
 */
export function detectCategory(serviceName: string): ServiceCategory | null {
  const normalizedName = serviceName.toLowerCase();
  
  // Find best matching service
  const matchingService = SERVICE_DATABASE.find(service =>
    service.name.toLowerCase() === normalizedName ||
    normalizedName.includes(service.name.toLowerCase()) ||
    service.name.toLowerCase().includes(normalizedName)
  );

  if (matchingService) {
    return matchingService.category as ServiceCategory;
  }

  // Fallback: keyword-based detection
  const categoryKeywords: Record<ServiceCategory, string[]> = {
    "Beauty & Wellness": ["hair", "nail", "massage", "facial", "beauty", "spa", "wax", "lash", "brow", "makeup"],
    "Fitness & Health": ["yoga", "pilates", "fitness", "training", "gym", "exercise", "therapy", "chiropractic", "nutrition", "acupuncture"],
    "Professional Services": ["consultation", "legal", "accounting", "coaching", "consulting", "financial", "business"],
    "Education & Training": ["lesson", "tutoring", "class", "education", "teaching", "learning"],
    "Home & Maintenance": ["cleaning", "plumbing", "electrical", "handyman", "hvac", "lawn", "repair", "maintenance"],
    "Entertainment & Events": ["photo", "event", "dj", "entertainment", "party"],
    "Automotive": ["car", "auto", "vehicle", "tire", "brake", "oil"],
    "Food & Beverage": ["chef", "catering", "food", "wine", "beverage", "cooking"],
    "Other": [],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => normalizedName.includes(keyword))) {
      return category as ServiceCategory;
    }
  }

  return "Other";
}

/**
 * Get duration suggestion based on service name or category
 */
export function getDurationSuggestion(serviceName: string, category?: ServiceCategory): number | null {
  // Try exact match first
  const matchingService = SERVICE_DATABASE.find(service =>
    service.name.toLowerCase() === serviceName.toLowerCase()
  );

  if (matchingService) {
    return matchingService.typicalDuration;
  }

  // Try category match
  if (category) {
    const categoryServices = SERVICE_DATABASE.filter(s => s.category === category);
    if (categoryServices.length > 0) {
      const avgDuration = Math.round(
        categoryServices.reduce((sum, s) => sum + s.typicalDuration, 0) / categoryServices.length
      );
      return avgDuration;
    }
  }

  // Fallback: detect category and use its average
  const detectedCategory = detectCategory(serviceName);
  if (detectedCategory) {
    const categoryServices = SERVICE_DATABASE.filter(s => s.category === detectedCategory);
    if (categoryServices.length > 0) {
      const avgDuration = Math.round(
        categoryServices.reduce((sum, s) => sum + s.typicalDuration, 0) / categoryServices.length
      );
      return avgDuration;
    }
  }

  return null;
}

/**
 * Get price range suggestion based on service name or category
 */
export function getPriceSuggestion(serviceName: string, category?: ServiceCategory): { min: number; max: number; typical: number } | null {
  // Try exact match first
  const matchingService = SERVICE_DATABASE.find(service =>
    service.name.toLowerCase() === serviceName.toLowerCase()
  );

  if (matchingService) {
    return matchingService.priceRange;
  }

  // Try category match
  if (category) {
    const categoryServices = SERVICE_DATABASE.filter(s => s.category === category);
    if (categoryServices.length > 0) {
      const min = Math.round(
        categoryServices.reduce((sum, s) => sum + s.priceRange.min, 0) / categoryServices.length
      );
      const max = Math.round(
        categoryServices.reduce((sum, s) => sum + s.priceRange.max, 0) / categoryServices.length
      );
      const typical = Math.round(
        categoryServices.reduce((sum, s) => sum + s.priceRange.typical, 0) / categoryServices.length
      );
      return { min, max, typical };
    }
  }

  // Fallback: detect category and use its average
  const detectedCategory = detectCategory(serviceName);
  if (detectedCategory) {
    const categoryServices = SERVICE_DATABASE.filter(s => s.category === detectedCategory);
    if (categoryServices.length > 0) {
      const min = Math.round(
        categoryServices.reduce((sum, s) => sum + s.priceRange.min, 0) / categoryServices.length
      );
      const max = Math.round(
        categoryServices.reduce((sum, s) => sum + s.priceRange.max, 0) / categoryServices.length
      );
      const typical = Math.round(
        categoryServices.reduce((sum, s) => sum + s.priceRange.typical, 0) / categoryServices.length
      );
      return { min, max, typical };
    }
  }

  return null;
}

/**
 * Get tag suggestions based on service name or category
 */
export function getTagSuggestions(serviceName: string, category?: ServiceCategory): string[] {
  // Try exact match first
  const matchingService = SERVICE_DATABASE.find(service =>
    service.name.toLowerCase() === serviceName.toLowerCase()
  );

  if (matchingService) {
    return matchingService.tags;
  }

  // Try category match - return common tags from category
  const effectiveCategory = category || detectCategory(serviceName);
  if (effectiveCategory) {
    const categoryServices = SERVICE_DATABASE.filter(s => s.category === effectiveCategory);
    const allTags = categoryServices.flatMap(s => s.tags);
    
    // Count tag frequency
    const tagCounts = new Map<string, number>();
    allTags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });

    // Return most common tags
    return Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag]) => tag);
  }

  return [];
}

