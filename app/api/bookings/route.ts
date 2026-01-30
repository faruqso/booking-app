import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { Prisma, type BookingStatus } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parseISO, addMinutes, isBefore, startOfDay } from "date-fns";
import { getAvailabilityForDate } from "@/lib/availability";
import { detectConflictWithAlternatives, formatAlternativeSlots } from "@/lib/ai/conflict-detection";

export const dynamic = 'force-dynamic';

// Helper function to validate payment configuration
async function validatePaymentConfiguration(
  provider: string | null,
  businessId: string
): Promise<boolean> {
  if (!provider) return false;

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: {
      stripePublishableKey: true,
      stripeSecretKey: true,
      paystackPublicKey: true,
      paystackSecretKey: true,
      flutterwavePublicKey: true,
      flutterwaveSecretKey: true,
    },
  });

  if (!business) return false;

  switch (provider) {
    case "stripe":
      return !!(business.stripePublishableKey && business.stripeSecretKey);
    case "paystack":
      return !!(business.paystackPublicKey && business.paystackSecretKey);
    case "flutterwave":
      return !!(business.flutterwavePublicKey && business.flutterwaveSecretKey);
    default:
      return false;
  }
}

const bookingSchema = z.object({
  businessId: z.string(),
  serviceId: z.string(),
  locationId: z.string().nullable().optional(), // Phase 2: Optional location
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z.string().optional(),
  startTime: z.string(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = bookingSchema.parse(body);

    // Verify business and service exist
    const business = await prisma.business.findUnique({
      where: { id: validatedData.businessId },
      select: {
        id: true,
        businessName: true,
        minimumAdvanceBookingHours: true,
        requirePaymentDeposit: true,
        depositPercentage: true,
        paymentProvider: true,
        currency: true,
        availability: {
          select: {
            id: true,
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: true,
          },
        },
        logoUrl: true,
        primaryColor: true,
        twilioAccountSid: true,
        twilioAuthToken: true,
        twilioPhoneNumber: true,
        whatsappPhoneNumber: true,
        whatsappAccessToken: true,
        whatsappPhoneNumberId: true,
        whatsappBusinessAccountId: true,
        whatsappNotificationsEnabled: true,
      },
    });

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const service = await prisma.service.findFirst({
      where: {
        id: validatedData.serviceId,
        businessId: validatedData.businessId,
        isActive: true,
      },
      include: {
        location: true,
      },
    });

    if (!service) {
      return NextResponse.json(
        { error: "Service not found or inactive" },
        { status: 404 }
      );
    }

    // Determine locationId for booking
    // Use provided locationId, or fall back to service's locationId, or null for all locations
    let bookingLocationId: string | null = null;
    
    if (validatedData.locationId !== undefined && validatedData.locationId !== null) {
      // Validate location belongs to business
      const location = await prisma.location.findFirst({
        where: {
          id: validatedData.locationId,
          businessId: validatedData.businessId,
          isActive: true,
        },
      });

      if (!location) {
        return NextResponse.json(
          { error: "Location not found or inactive" },
          { status: 400 }
        );
      }
      bookingLocationId = validatedData.locationId;
    } else if (service.locationId) {
      // Service is tied to a specific location
      bookingLocationId = service.locationId;
    }
    // If both are null/undefined, booking is for all locations (locationId = null)

    // Parse and validate date/time
    const startTime = parseISO(validatedData.startTime);
    const endTime = addMinutes(startTime, service.duration);
    const now = new Date();

    // Check if time is in the past
    if (isBefore(startTime, now)) {
      return NextResponse.json(
        { error: "Cannot book in the past" },
        { status: 400 }
      );
    }

    // Check minimum advance booking time
    const minimumAdvanceTime = addMinutes(now, business.minimumAdvanceBookingHours * 60);
    if (isBefore(startTime, minimumAdvanceTime)) {
      const hours = business.minimumAdvanceBookingHours;
      return NextResponse.json(
        { error: `Bookings must be made at least ${hours} hour${hours !== 1 ? 's' : ''} in advance` },
        { status: 400 }
      );
    }

    // Check availability
    if (!business.availability) {
      return NextResponse.json(
        { error: "Business has no availability set" },
        { status: 400 }
      );
    }

    const date = startOfDay(startTime);
    const dayHours = getAvailabilityForDate(business.availability, date);

    if (!dayHours || !dayHours.isOpen) {
      return NextResponse.json(
        { error: "Business is closed on this day" },
        { status: 400 }
      );
    }

    // Check for conflicts with intelligent alternatives
    const bookingWhere: Prisma.BookingWhereInput = {
      businessId: validatedData.businessId,
      startTime: {
        gte: date,
        lt: addMinutes(date, 24 * 60),
      },
      status: {
        not: "CANCELLED",
      },
      ...(bookingLocationId !== null
        ? {
            OR: [
              { locationId: bookingLocationId },
              { locationId: null },
            ],
          }
        : { locationId: null }),
    };

    const existingBookings = await prisma.booking.findMany({
      where: bookingWhere,
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const conflictResult = detectConflictWithAlternatives(
      { startTime, endTime },
      service.duration,
      existingBookings.map(b => ({ startTime: b.startTime, endTime: b.endTime })),
      dayHours
    );

    if (conflictResult.hasConflict) {
      // Return conflict with alternative suggestions
      const alternatives = conflictResult.alternativeSlots
        ? formatAlternativeSlots(conflictResult.alternativeSlots)
        : [];

      return NextResponse.json(
        {
          error: "This time slot is no longer available",
          conflict: true,
          alternatives: alternatives,
        },
        { status: 400 }
      );
    }

    // Calculate payment amount if required
    const servicePrice = Number(service.price);
    let paymentAmount: number | null = null;
    let requiresPayment = false;

    if (business.requirePaymentDeposit && business.paymentProvider) {
      // Validate that payment provider has required keys configured
      // This check ensures payment can actually be processed
      const hasValidPaymentConfig = await validatePaymentConfiguration(
        business.paymentProvider,
        business.id
      );

      if (!hasValidPaymentConfig) {
        return NextResponse.json(
          {
            error: "Payment is required but payment provider is not fully configured. Please configure your payment provider in the dashboard.",
            paymentConfigError: true,
          },
          { status: 400 }
        );
      }

      requiresPayment = true;
      if (business.depositPercentage && business.depositPercentage > 0) {
        // Calculate deposit amount
        paymentAmount = (servicePrice * business.depositPercentage) / 100;
      } else {
        // Full payment required
        paymentAmount = servicePrice;
      }
    }

    // Create booking with payment status
    const booking = await prisma.booking.create({
      data: {
        businessId: validatedData.businessId,
        serviceId: validatedData.serviceId,
        locationId: bookingLocationId, // Phase 2: Include location
        customerName: validatedData.customerName,
        customerEmail: validatedData.customerEmail,
        customerPhone: validatedData.customerPhone,
        startTime,
        endTime,
        notes: validatedData.notes,
        status: "PENDING",
        paymentStatus: requiresPayment ? "PENDING" : "COMPLETED", // No payment needed = completed
        paymentProvider: requiresPayment ? business.paymentProvider : null,
        amountPaid: requiresPayment ? null : servicePrice, // Set amountPaid if no payment required
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
            logoUrl: true,
            primaryColor: true,
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

    // Send confirmation email (don't block on error)
    try {
      const { sendBookingConfirmationEmail } = await import("@/lib/email");
      await sendBookingConfirmationEmail(validatedData.customerEmail, {
        id: booking.id,
        customerName: booking.customerName,
        serviceName: booking.service.name,
        startTime: booking.startTime,
        businessName: business.businessName,
        businessLogoUrl: business.logoUrl,
        primaryColor: business.primaryColor,
      });
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError);
      // Don't fail the booking creation if email fails
    }

    // Send SMS confirmation if customer phone provided and SMS is enabled
    if (validatedData.customerPhone && business.twilioAccountSid && business.twilioAuthToken && business.twilioPhoneNumber) {
      try {
        const { sendBookingConfirmationSMS } = await import("@/lib/sms");
        await sendBookingConfirmationSMS(
          {
            accountSid: business.twilioAccountSid,
            authToken: business.twilioAuthToken,
            phoneNumber: business.twilioPhoneNumber,
          },
          {
            customerName: booking.customerName,
            customerPhone: validatedData.customerPhone,
            serviceName: booking.service.name,
            startTime: booking.startTime,
            businessName: business.businessName,
          }
        );
      } catch (smsError) {
        console.error("Failed to send confirmation SMS:", smsError);
        // Don't fail the booking creation if SMS fails
      }
    }

    // Send WhatsApp notification to business (don't block on error)
    try {
      const { sendBookingWhatsAppNotification } = await import("@/lib/whatsapp");
      await sendBookingWhatsAppNotification(
        {
          whatsappPhoneNumber: business.whatsappPhoneNumber,
          whatsappAccessToken: business.whatsappAccessToken,
          whatsappPhoneNumberId: business.whatsappPhoneNumberId,
          whatsappBusinessAccountId: business.whatsappBusinessAccountId,
          whatsappNotificationsEnabled: business.whatsappNotificationsEnabled,
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
        "new_booking"
      );
    } catch (whatsappError) {
      console.error("Failed to send WhatsApp notification:", whatsappError);
      // Don't fail the booking creation if WhatsApp fails
    }

    // Return booking with payment information
    return NextResponse.json({
      ...booking,
      requiresPayment,
      paymentAmount: paymentAmount ? Number(paymentAmount.toFixed(2)) : null,
      isDeposit: requiresPayment && business.depositPercentage && business.depositPercentage > 0 && business.depositPercentage < 100,
      depositPercentage: business.depositPercentage,
      currency: business.currency || "USD",
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Failed to create booking";
    const details = error instanceof Error && process.env.NODE_ENV === "development" ? error.stack : undefined;
    console.error("Booking creation error:", message);
    return NextResponse.json(
      { error: message, ...(details && { details }) },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.businessId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const dateParam = searchParams.get("date");

    const validStatuses: BookingStatus[] = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"];
    const statusFilter: BookingStatus | undefined =
      statusParam && validStatuses.includes(statusParam as BookingStatus) ? (statusParam as BookingStatus) : undefined;

    const where: Prisma.BookingWhereInput = {
      businessId: session.user.businessId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(dateParam
        ? (() => {
            const startOfDayDate = new Date(dateParam);
            startOfDayDate.setHours(0, 0, 0, 0);
            const endOfDayDate = new Date(dateParam);
            endOfDayDate.setHours(23, 59, 59, 999);
            return {
              startTime: {
                gte: startOfDayDate,
                lte: endOfDayDate,
              },
            };
          })()
        : {}),
    };

    const bookings = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        startTime: true,
        endTime: true,
        status: true,
        paymentStatus: true,
        amountPaid: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        serviceId: true,
        service: {
          select: {
            id: true,
            name: true,
            duration: true,
            price: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        startTime: "desc", // Most recent first
      },
      take: 100, // Limit to 100 bookings to improve performance
    });

    return NextResponse.json(bookings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Bookings fetch error:", message);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
