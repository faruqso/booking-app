import { NextRequest, NextResponse } from "next/server";
import { generateServiceDescription } from "@/lib/ai/local-ai";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { serviceName, category } = body;

    if (!serviceName || typeof serviceName !== "string" || serviceName.length < 2) {
      return NextResponse.json(
        { error: "Service name is required and must be at least 2 characters" },
        { status: 400 }
      );
    }

    const description = await generateServiceDescription(
      serviceName,
      category || undefined
    );

    return NextResponse.json({ description });
  } catch (error: any) {
    console.error("Description generation error:", error);
    
    // Fallback to template-based description
    const { serviceName, category } = await request.json().catch(() => ({ serviceName: "", category: "" }));
    const templateDescription = `Professional ${serviceName || "service"} service. Experience quality and expertise tailored to your needs.${category ? ` Our ${category.toLowerCase()} services are designed to meet your expectations.` : ""}`;
    
    return NextResponse.json({ 
      description: templateDescription,
      fallback: true,
    });
  }
}

