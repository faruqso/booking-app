/**
 * AI-Generated Service Descriptions API (Paid Tier)
 * 
 * Uses Vercel AI Gateway for paid tier businesses.
 * Falls back to local AI (Ollama) for free tier.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTextViaGateway } from '@/lib/ai/gateway-wrapper';
import { generateServiceDescription } from '@/lib/ai/local-ai';
import { checkBudget } from '@/lib/ai/budget-manager';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { serviceName, category } = body;

    if (!serviceName || typeof serviceName !== 'string') {
      return NextResponse.json(
        { error: 'Service name is required' },
        { status: 400 }
      );
    }

    const businessId = session.user.businessId;

    // Check if business has budget (for paid tier)
    const hasBudget = await checkBudget(businessId);

    // For paid tier: Use AI Gateway
    if (hasBudget) {
      try {
        const prompt = `Generate a concise, professional description for a service called "${serviceName}"${category ? ` in the ${category} category` : ''}. 
The description should be 2-3 sentences, highlight key benefits, and be customer-friendly. 
Do not include pricing or duration information.`;

        const result = await generateTextViaGateway({
          prompt,
          model: 'gpt-3.5-turbo',
          maxTokens: 150,
          temperature: 0.7,
          businessId,
        });

        return NextResponse.json({
          description: result.text,
          source: 'ai-gateway',
          usage: result.usage,
        });
      } catch (error: any) {
        // If Gateway fails or budget exceeded, fall back to local AI
        console.warn('AI Gateway failed, falling back to local AI:', error.message);
      }
    }

    // Free tier: Use local AI (Ollama)
    try {
      const description = await generateServiceDescription(serviceName, category);
      return NextResponse.json({
        description,
        source: 'local-ai',
      });
    } catch (error: any) {
      // Final fallback: Template-based description
      return NextResponse.json({
        description: `Professional ${serviceName} service. Experience quality and expertise tailored to your needs.`,
        source: 'template',
      });
    }
  } catch (error: any) {
    console.error('Service description generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate service description' },
      { status: 500 }
    );
  }
}
