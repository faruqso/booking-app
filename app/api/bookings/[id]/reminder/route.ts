import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendBookingReminderEmail } from "@/lib/email";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    
    // Fetch booking with business and service details
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            businessName: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
        service: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Verify the booking belongs to the user's business
    if (!session.user.businessId || booking.businessId !== session.user.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Send reminder email
    await sendBookingReminderEmail(
      booking.customerEmail,
      {
        customerName: booking.customerName,
        businessName: booking.business.businessName,
        serviceName: booking.service?.name || "Service",
        startTime: new Date(booking.startTime),
        businessLogoUrl: booking.business.logoUrl || null,
        primaryColor: booking.business.primaryColor || undefined,
      }
    );

    return NextResponse.json({ 
      success: true,
      message: "Reminder email sent successfully" 
    });
  } catch (error: any) {
    console.error("Failed to send reminder:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send reminder email" },
      { status: 500 }
    );
  }
}
