/**
 * Intelligent Booking Summaries API
 * Path: paid + gateway implemented → gateway; else → template.
 * When AI Gateway is implemented (see docs/AI_GATEWAY_SETUP.md), add a branch that tries gateway when hasBudget.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

    const templateSummary = `Your booking for ${booking.service.name} is confirmed for ${format(booking.startTime, 'EEEE, MMMM d, yyyy')} at ${format(booking.startTime, 'h:mm a')}. 
The service will take approximately ${booking.service.duration} minutes. 
We look forward to seeing you!`;

    return NextResponse.json({
      summary: templateSummary,
      source: 'template',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Booking summary generation error:', message);
    return NextResponse.json(
      { error: 'Failed to generate booking summary' },
      { status: 500 }
    );
  }
}
