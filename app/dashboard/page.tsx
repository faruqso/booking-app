"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, startOfDay, isToday, isFuture } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, CheckCircle2, AlertCircle, TrendingUp, Copy, ExternalLink, Link2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  startTime: string;
  status: string;
  service: {
    name: string;
    price: number;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    upcoming: 0,
    pending: 0,
  });
  
  // Hooks must be called before any conditional returns
  const businessId = session?.user?.businessId;
  const [bookingPageUrl, setBookingPageUrl] = useState("");

  useEffect(() => {
    if (status === "loading") {
      const timeout = setTimeout(() => {
        window.location.href = "/auth/signin";
      }, 2000);
      return () => clearTimeout(timeout);
    }
    
    if (status === "unauthenticated") {
      window.location.href = "/auth/signin";
    } else if (status === "authenticated") {
      fetchBookings();
    }
  }, [status, router]);

  useEffect(() => {
    if (businessId && typeof window !== "undefined") {
      setBookingPageUrl(`${window.location.origin}/book/${businessId}`);
    }
  }, [businessId]);

  const fetchBookings = async () => {
    try {
      const response = await fetch("/api/bookings");
      if (response.ok) {
        const data = await response.json();
        setBookings(data);

        const today = startOfDay(new Date());
        const todayBookings = data.filter((b: Booking) => {
          const bookingDate = startOfDay(new Date(b.startTime));
          return bookingDate.getTime() === today.getTime();
        });
        const upcomingBookings = data.filter((b: Booking) =>
          isFuture(new Date(b.startTime))
        );
        const pendingBookings = data.filter(
          (b: Booking) => b.status === "PENDING"
        );

        setStats({
          today: todayBookings.length,
          upcoming: upcomingBookings.length,
          pending: pendingBookings.length,
        });
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchBookings();
        toast({
          title: "Success",
          description: `Booking ${newStatus.toLowerCase()} successfully`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to update booking status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to update booking:", error);
      toast({
        title: "Error",
        description: "Failed to update booking status",
        variant: "destructive",
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const todayBookings = bookings.filter((b) =>
    isToday(new Date(b.startTime))
  );

  const upcomingBookings = bookings
    .filter((b) => isFuture(new Date(b.startTime)) && !isToday(new Date(b.startTime)))
    .slice(0, 5);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "default";
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const copyBookingUrl = () => {
    if (bookingPageUrl) {
      navigator.clipboard.writeText(bookingPageUrl);
      toast({
        title: "Copied!",
        description: "Booking page URL copied to clipboard",
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <HelpTooltip content="Your dashboard shows today's bookings, upcoming appointments, and pending confirmations. Use the booking page link to share with customers." />
        </div>
        <p className="text-muted-foreground">
          Overview of your bookings and business metrics
        </p>
      </div>

      {/* Booking Page URL Card */}
      {businessId && (
        <Card className="border-2 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" />
              <CardTitle>Your Public Booking Page</CardTitle>
            </div>
            <CardDescription>
              Share this link with your customers so they can book appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-center gap-2 p-3 bg-background border rounded-lg">
                <code className="flex-1 text-sm font-mono text-muted-foreground truncate">
                  {bookingPageUrl}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyBookingUrl}
                  className="shrink-0"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <Button asChild variant="default" className="shrink-0">
                <Link href={`/book/${businessId}`} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Page
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today&apos;s Bookings
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">
              Appointments scheduled for today
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Bookings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">
              Future appointments
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Confirmations
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Require your attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bookings Lists */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Bookings</CardTitle>
            <CardDescription>
              Appointments scheduled for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            {todayBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  No bookings for today
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-start justify-between rounded-lg border p-4 transition-all duration-200 hover:bg-accent/50 hover:shadow-md hover:border-primary/10"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {booking.customerName}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {booking.service.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {format(new Date(booking.startTime), "h:mm a")}
                      </div>
                    </div>
                    {booking.status === "PENDING" && (
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(booking.id, "CONFIRMED")}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStatusChange(booking.id, "CANCELLED")}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Bookings</CardTitle>
            <CardDescription>
              Your next scheduled appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  No upcoming bookings
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-start justify-between rounded-lg border p-4 transition-all duration-200 hover:bg-accent/50 hover:shadow-md hover:border-primary/10"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          {booking.customerName}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {booking.service.name}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {format(new Date(booking.startTime), "MMM d, h:mm a")}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-4">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/dashboard/bookings">
                      View All Bookings
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
