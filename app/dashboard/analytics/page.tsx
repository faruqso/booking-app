"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  DollarSign,
  Calendar,
  Users,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils/currency";

interface AnalyticsData {
  totalRevenue: number;
  paymentCount: number;
  totalBookings: number;
  bookingsByStatus: Record<string, number>;
  bookingsOverTime: { date: string; bookings: number }[];
  customersCount: number;
  popularServices: { name: string; bookings: number }[];
  range: { days: number };
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#22c55e",
  PENDING: "#eab308",
  CANCELLED: "#ef4444",
  COMPLETED: "#3b82f6",
  NO_SHOW: "#6b7280",
};

const CHART_COLORS = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#8b5cf6"];

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/auth/signin";
      return;
    }
    if (status === "authenticated") {
      fetchAnalytics();
    }
  }, [status, range]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Unable to load analytics</p>
      </div>
    );
  }

  const pieData = Object.entries(data.bookingsByStatus).map(([name, value]) => ({
    name,
    value,
    fill: STATUS_COLORS[name] || "#94a3b8",
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Business insights and performance metrics
          </p>
        </div>
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              }`}
            >
              {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(data.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {data.paymentCount} payments in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              All statuses in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.customersCount}</div>
            <p className="text-xs text-muted-foreground">
              Added in period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. per Booking</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.totalBookings > 0
                ? formatCurrency(data.totalRevenue / data.totalBookings)
                : formatCurrency(0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue per booking
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bookings Over Time */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings Over Time</CardTitle>
            <CardDescription>Daily booking count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {data.bookingsOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.bookingsOverTime}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No booking data in this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bookings by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings by Status</CardTitle>
            <CardDescription>Breakdown of booking statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No booking data in this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Services */}
      <Card>
        <CardHeader>
          <CardTitle>Popular Services</CardTitle>
          <CardDescription>Top 5 services by booking count</CardDescription>
        </CardHeader>
        <CardContent>
          {data.popularServices.length > 0 ? (
            <div className="space-y-3">
              {data.popularServices.map((s, i) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    >
                      {i + 1}
                    </div>
                    <span className="font-medium">{s.name}</span>
                  </div>
                  <span className="text-muted-foreground">{s.bookings} bookings</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No service data in this period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
