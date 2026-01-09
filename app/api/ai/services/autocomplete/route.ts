import { NextRequest, NextResponse } from "next/server";
import { getServiceSuggestions } from "@/lib/ai/service-database";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10", 10);

    if (!query || query.length < 1) {
      return NextResponse.json({ suggestions: [] });
    }

    const suggestions = getServiceSuggestions(query, limit);

    return NextResponse.json({
      suggestions: suggestions.map(s => ({
        value: s.name,
        label: s.name,
        description: s.description,
        metadata: {
          category: s.category,
          typicalDuration: s.typicalDuration,
          priceRange: s.priceRange,
          tags: s.tags,
        },
      })),
    });
  } catch (error: any) {
    console.error("Autocomplete error:", error);
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}

