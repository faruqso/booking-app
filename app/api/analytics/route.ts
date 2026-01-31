import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { subDays, startOfDay, format } from "date-fns";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (authError) {
    console.error("Analytics GET: getServerSession error", authError);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session?.user?.businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const businessId = session.user.businessId;
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30d"; // 7d, 30d, 90d

  const days = range === "7d" ? 7 : range === "90d" ? 90 : 30;
  const startDate = startOfDay(subDays(new Date(), days));

  try {
    // Revenue: sum of completed payments
    const revenueResult = await prisma.payment.aggregate({
      where: {
        businessId,
        status: "COMPLETED",
        createdAt: { gte: startDate },
      },
      _sum: { amount: true },
      _count: true,
    });

    const totalRevenue = Number(revenueResult._sum.amount ?? 0);

    // Bookings count by status
    const bookingCounts = await prisma.booking.groupBy({
      by: ["status"],
      where: {
        businessId,
        startTime: { gte: startDate },
      },
      _count: { id: true },
    });

    const bookingsByStatus = Object.fromEntries(
      bookingCounts.map((b) => [b.status, b._count.id])
    );

    const totalBookings =
      bookingCounts.reduce((acc, b) => acc + b._count.id, 0) || 0;

    // Bookings over time (daily for chart)
    const bookingsRaw = await prisma.$queryRaw<
      { date: string; count: bigint }[]
    >(Prisma.sql`
      SELECT (b."startTime"::date)::text as date, COUNT(*)::bigint as count
      FROM "Booking" b
      WHERE b."businessId" = ${businessId}
        AND b."startTime" >= ${startDate}
      GROUP BY b."startTime"::date
      ORDER BY date ASC
    `);

    const bookingsOverTime = bookingsRaw.map((r) => ({
      date: format(new Date(r.date), "MMM d"),
      bookings: Number(r.count),
    }));

    // Customers count (new in period)
    const customersCount = await prisma.customer.count({
      where: {
        businessId,
        createdAt: { gte: startDate },
      },
    });

    // Top services by booking count
    const topServices = await prisma.booking.groupBy({
      by: ["serviceId"],
      where: {
        businessId,
        startTime: { gte: startDate },
        status: { not: "CANCELLED" },
      },
      _count: { id: true },
    });

    const serviceIds = topServices.map((s) => s.serviceId);
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });
    const serviceMap = Object.fromEntries(services.map((s) => [s.id, s.name]));

    const popularServices = topServices
      .sort((a, b) => b._count.id - a._count.id)
      .slice(0, 5)
      .map((s) => ({
        name: serviceMap[s.serviceId] || "Unknown",
        bookings: s._count.id,
      }));

    return NextResponse.json({
      totalRevenue,
      paymentCount: revenueResult._count,
      totalBookings,
      bookingsByStatus,
      bookingsOverTime,
      customersCount,
      popularServices,
      range: { days, startDate: startDate.toISOString() },
    });
  } catch (error) {
    console.error("Analytics GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
