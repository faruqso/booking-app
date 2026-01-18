import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { generateBookingsFromRecurring } from "@/lib/recurring-bookings";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only allow business owners to trigger generation
    if (session.user.role !== "BUSINESS_OWNER") {
      return NextResponse.json(
        { error: "Forbidden - Only business owners can generate bookings" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { recurringId, upToDate } = body;

    // Parse upToDate if provided
    const targetDate = upToDate ? new Date(upToDate) : new Date();

    // Generate bookings
    const result = await generateBookingsFromRecurring(
      recurringId || undefined,
      targetDate
    );

    return NextResponse.json({
      success: true,
      ...result,
      message: `Generated ${result.created} bookings, skipped ${result.skipped} conflicts, ${result.errors} errors`,
    });
  } catch (error) {
    console.error("Booking generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate bookings" },
      { status: 500 }
    );
  }
}
