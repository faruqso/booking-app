import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subHours, isBefore, parseISO, addMinutes, startOfDay } from "date-fns";
import { getAvailabilityForDate } from "@/lib/availability";
import { checkConflict } from "@/lib/ai/conflict-detection";

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    // Allow public access for confirmation page, or authenticated business owner access
    const booking = await prisma.booking.findFirst({
      where: {
        id: id,
        ...(session?.user?.businessId ? { businessId: session.user.businessId } : {}),
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            price: true,
            duration: true,
          },
        },
        business: {
          select: {
            id: true,
            businessName: true,
            primaryColor: true,
            logoUrl: true,
            currency: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Add currency to response (from business)
    const currency = booking.business?.currency || "USD";

    return NextResponse.json({
      ...booking,
      currency,
      // Include payment-related fields for confirmation page
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      paymentStatus: booking.paymentStatus,
      paymentProvider: booking.paymentProvider,
      paymentIntentId: booking.paymentIntentId,
      amountPaid: booking.amountPaid ? Number(booking.amountPaid) : null,
    });
  } catch (error) {
    console.error("Booking fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, startTime, endTime } = body;

    // Determine what to update
    const updateStatus = status && ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"].includes(status);
    const updateTime = startTime && endTime;

    if (!updateStatus && !updateTime) {
      return NextResponse.json(
        { error: "Must provide either status or startTime/endTime to update" },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (updateStatus && !["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    // Verify booking belongs to business
    const existingBooking = await prisma.booking.findFirst({
      where: {
        id: id,
        businessId: session.user.businessId,
      },
      include: {
        service: true,
        business: {
          include: {
            availability: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!existingBooking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Handle time rescheduling with conflict detection
    let newStartTime = existingBooking.startTime;
    let newEndTime = existingBooking.endTime;
    
    if (updateTime) {
      newStartTime = parseISO(startTime);
      newEndTime = parseISO(endTime);
      const now = new Date();

      // Check if time is in the past
      if (isBefore(newStartTime, now)) {
        return NextResponse.json(
          { error: "Cannot reschedule to a time in the past" },
          { status: 400 }
        );
      }

      // Check minimum advance booking time
      const minimumAdvanceTime = addMinutes(now, existingBooking.business.minimumAdvanceBookingHours * 60);
      if (isBefore(newStartTime, minimumAdvanceTime)) {
        const hours = existingBooking.business.minimumAdvanceBookingHours;
        return NextResponse.json(
          { error: `Bookings must be at least ${hours} hour${hours !== 1 ? 's' : ''} in advance` },
          { status: 400 }
        );
      }

      // Check availability (only if availability is set)
      // Business owners can reschedule even if availability isn't configured
      const date = startOfDay(newStartTime);
      let dayHours = null;
      
      if (existingBooking.business.availability) {
        dayHours = getAvailabilityForDate(existingBooking.business.availability, date);
        
        // Only enforce business hours if availability is configured
        if (!dayHours || !dayHours.isOpen) {
          return NextResponse.json(
            { error: "Business is closed on this day according to your availability settings" },
            { status: 400 }
          );
        }
      }
      // If no availability is set, allow rescheduling (business owner discretion)

      // Check for conflicts (excluding the current booking)
      const conflictWhere: any = {
        businessId: session.user.businessId,
        id: { not: id }, // Exclude current booking
        startTime: {
          gte: date,
          lt: addMinutes(date, 24 * 60),
        },
        status: {
          not: "CANCELLED",
        },
      };

      // Filter by location if booking has a location
      if (existingBooking.locationId !== null) {
        conflictWhere.OR = [
          { locationId: existingBooking.locationId },
          { locationId: null },
        ];
      }

      const conflictingBookings = await prisma.booking.findMany({
        where: conflictWhere,
        select: {
          startTime: true,
          endTime: true,
        },
      });

      const hasConflict = checkConflict(
        { startTime: newStartTime, endTime: newEndTime },
        conflictingBookings.map((b) => ({
          startTime: b.startTime,
          endTime: b.endTime,
        }))
      );

      if (hasConflict) {
        return NextResponse.json(
          { error: "This time slot conflicts with another booking" },
          { status: 400 }
        );
      }
    }

    // Phase 2: Enforce cancellation policy
    if (updateStatus && status === "CANCELLED" && existingBooking.status !== "CANCELLED") {
      const cancellationPolicyHours = existingBooking.business.cancellationPolicyHours || 0;
      
      if (cancellationPolicyHours > 0) {
        const cancellationDeadline = subHours(existingBooking.startTime, cancellationPolicyHours);
        const now = new Date();
        
        if (isBefore(now, cancellationDeadline)) {
          // Still within cancellation window, allow cancellation
        } else {
          // Past cancellation deadline
          return NextResponse.json(
            { 
              error: `This booking cannot be cancelled. Cancellation must be made at least ${cancellationPolicyHours} hours before the appointment. Please contact the business directly.`,
              cancellationDeadline: cancellationDeadline.toISOString(),
            },
            { status: 400 }
          );
        }
      }
      // If cancellationPolicyHours is 0, cancellation is always allowed
    }

    // Build update data
    const updateData: any = {};
    if (updateStatus) {
      updateData.status = status;
    }
    if (updateTime) {
      updateData.startTime = newStartTime;
      updateData.endTime = newEndTime;
    }

    const booking = await prisma.booking.update({
      where: { id: id },
      data: updateData,
      include: {
        service: true,
        business: true,
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Send rescheduling email if time changed
    if (updateTime && (newStartTime.getTime() !== existingBooking.startTime.getTime())) {
      try {
        const { sendBookingReschedulingEmail } = await import("@/lib/email");
        await sendBookingReschedulingEmail(existingBooking.customerEmail, {
          id: existingBooking.id,
          customerName: existingBooking.customerName,
          serviceName: existingBooking.service.name,
          oldStartTime: existingBooking.startTime,
          newStartTime: newStartTime,
          businessName: existingBooking.business.businessName,
          businessLogoUrl: existingBooking.business.logoUrl,
          primaryColor: existingBooking.business.primaryColor,
        });
      } catch (emailError) {
        console.error("Failed to send rescheduling email:", emailError);
      }
    }

    // Send cancellation email if status changed to CANCELLED
    if (updateStatus && status === "CANCELLED" && existingBooking.status !== "CANCELLED") {
      try {
        const { sendBookingCancellationEmail } = await import("@/lib/email");
        await sendBookingCancellationEmail(existingBooking.customerEmail, {
          customerName: existingBooking.customerName,
          serviceName: existingBooking.service.name,
          startTime: existingBooking.startTime,
          businessName: existingBooking.business.businessName,
          businessLogoUrl: existingBooking.business.logoUrl,
          primaryColor: existingBooking.business.primaryColor,
        });
      } catch (emailError) {
        console.error("Failed to send cancellation email:", emailError);
      }

      // Send SMS cancellation if customer phone provided and SMS is enabled
      if (existingBooking.customerPhone && existingBooking.business.twilioAccountSid && existingBooking.business.twilioAuthToken && existingBooking.business.twilioPhoneNumber) {
        try {
          const { sendBookingCancellationSMS } = await import("@/lib/sms");
          await sendBookingCancellationSMS(
            {
              accountSid: existingBooking.business.twilioAccountSid,
              authToken: existingBooking.business.twilioAuthToken,
              phoneNumber: existingBooking.business.twilioPhoneNumber,
            },
            {
              customerName: existingBooking.customerName,
              customerPhone: existingBooking.customerPhone,
              serviceName: existingBooking.service.name,
              startTime: existingBooking.startTime,
              businessName: existingBooking.business.businessName,
            }
          );
        } catch (smsError) {
          console.error("Failed to send cancellation SMS:", smsError);
        }
      }
    }

    // Send confirmation email if status changed to CONFIRMED (and wasn't already confirmed)
    if (updateStatus && status === "CONFIRMED" && existingBooking.status !== "CONFIRMED") {
      try {
        const { sendBookingConfirmationEmail } = await import("@/lib/email");
        await sendBookingConfirmationEmail(existingBooking.customerEmail, {
          id: existingBooking.id,
          customerName: existingBooking.customerName,
          serviceName: existingBooking.service.name,
          startTime: existingBooking.startTime,
          businessName: existingBooking.business.businessName,
          businessLogoUrl: existingBooking.business.logoUrl,
          primaryColor: existingBooking.business.primaryColor,
        });
      } catch (emailError) {
        console.error("Failed to send confirmation email:", emailError);
      }
    }

    // Send WhatsApp notification to business for cancellations or modifications
    // Only notify if status changed or time changed
    if ((updateStatus && existingBooking.status !== status) || (updateTime && newStartTime.getTime() !== existingBooking.startTime.getTime())) {
      try {
        const { sendBookingWhatsAppNotification } = await import("@/lib/whatsapp");
        const eventType = (updateStatus && status === "CANCELLED") ? "booking_cancelled" : "booking_modified";
        
        await sendBookingWhatsAppNotification(
          {
            whatsappPhoneNumber: booking.business.whatsappPhoneNumber,
            whatsappAccessToken: booking.business.whatsappAccessToken,
            whatsappPhoneNumberId: booking.business.whatsappPhoneNumberId,
            whatsappBusinessAccountId: booking.business.whatsappBusinessAccountId,
            whatsappNotificationsEnabled: booking.business.whatsappNotificationsEnabled,
          },
          {
            id: booking.id,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone,
            serviceName: booking.service.name,
            startTime: booking.startTime,
            endTime: booking.endTime,
            status: booking.status,
            notes: booking.notes,
            locationName: booking.location?.name || null,
          },
          eventType
        );
      } catch (whatsappError) {
        console.error("Failed to send WhatsApp notification:", whatsappError);
        // Don't fail the booking update if WhatsApp fails
      }
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Booking update error:", error);
    return NextResponse.json(
      { error: "Failed to update booking" },
      { status: 500 }
    );
  }
}

