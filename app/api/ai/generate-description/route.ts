/**
 * AI-Generated Service Descriptions API
 * Path: paid + gateway implemented → gateway; else → local AI (Ollama); fallback → template.
 * When AI Gateway is implemented (see docs/AI_GATEWAY_SETUP.md), add a branch that tries gateway when hasBudget.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { generateServiceDescription } from '@/lib/ai/local-ai';

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

    try {
      const description = await generateServiceDescription(serviceName, category);
      return NextResponse.json({
        description,
        source: 'local-ai',
      });
    } catch {
      return NextResponse.json({
        description: `Professional ${serviceName} service. Experience quality and expertise tailored to your needs.`,
        source: 'template',
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Service description generation error:', message);
    return NextResponse.json(
      { error: 'Failed to generate service description' },
      { status: 500 }
    );
  }
}
