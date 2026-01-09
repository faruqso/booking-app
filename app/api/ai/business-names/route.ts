import { NextRequest, NextResponse } from "next/server";
import { generateBusinessNameSuggestions } from "@/lib/ai/local-ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessType } = body;

    if (!businessType || typeof businessType !== "string") {
      return NextResponse.json(
        { error: "Business type is required" },
        { status: 400 }
      );
    }

    const suggestions = await generateBusinessNameSuggestions(businessType, 5);

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error("Business name generation error:", error);
    
    // Fallback suggestions
    const { businessType } = await request.json().catch(() => ({ businessType: "" }));
    const fallbackSuggestions = [
      `${businessType || "Business"} Services`,
      `Premium ${businessType || "Business"}`,
      `Elite ${businessType || "Business"}`,
      `${businessType || "Business"} Pro`,
      `${businessType || "Business"} Express`,
    ];
    
    return NextResponse.json({ 
      suggestions: fallbackSuggestions,
      fallback: true,
    });
  }
}

