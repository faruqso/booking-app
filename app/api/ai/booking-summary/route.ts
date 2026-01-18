/**
 * Intelligent Booking Summaries API (Paid Tier)
 * 
 * Uses Vercel AI Gateway to generate personalized booking summaries.
 * Falls back to template-based summaries for free tier.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTextViaGateway } from '@/lib/ai/gateway-wrapper';
import { checkBudget } from '@/lib/ai/budget-manager';
import { format } from 'date-fns';

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
    const { bookingId } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const businessId = session.user.businessId;

    // Fetch booking details
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        businessId,
      },
      include: {
        service: true,
        business: true,
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if business has budget (for paid tier)
    const hasBudget = await checkBudget(businessId);

    // For paid tier: Use AI Gateway to generate personalized summary
    if (hasBudget) {
      try {
        const prompt = `Generate a friendly, personalized booking confirmation summary for:
- Service: ${booking.service.name}
- Customer: ${booking.customerName}
- Date & Time: ${format(booking.startTime, 'EEEE, MMMM d, yyyy')} at ${format(booking.startTime, 'h:mm a')}
- Duration: ${booking.service.duration} minutes
- Price: $${Number(booking.service.price).toFixed(2)}
${booking.notes ? `- Special Notes: ${booking.notes}` : ''}

Make it warm, professional, and include key details. Keep it concise (3-4 sentences).`;

        const result = await generateTextViaGateway({
          prompt,
          model: 'gpt-3.5-turbo',
          maxTokens: 200,
          temperature: 0.8,
          businessId,
        });

        return NextResponse.json({
          summary: result.text,
          source: 'ai-gateway',
          usage: result.usage,
        });
      } catch (error: any) {
        console.warn('AI Gateway failed, falling back to template:', error.message);
      }
    }

    // Free tier: Use template-based summary
    const templateSummary = `Your booking for ${booking.service.name} is confirmed for ${format(booking.startTime, 'EEEE, MMMM d, yyyy')} at ${format(booking.startTime, 'h:mm a')}. 
The service will take approximately ${booking.service.duration} minutes. 
We look forward to seeing you!`;

    return NextResponse.json({
      summary: templateSummary,
      source: 'template',
    });
  } catch (error: any) {
    console.error('Booking summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate booking summary' },
      { status: 500 }
    );
  }
}
