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
import { Calendar, Clock, CheckCircle2, AlertCircle, TrendingUp, Copy, ExternalLink, Link2, User, Sparkles, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Modal, ModalFooter, ModalButton } from "@/components/ui/modal";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // Hooks must be called before any conditional returns
  const businessId = session?.user?.businessId;
  const [bookingPageUrl, setBookingPageUrl] = useState("");
  const [urlCopied, setUrlCopied] = useState(false);

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
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // Removed router dependency to avoid unnecessary re-renders

  useEffect(() => {
    if (businessId && typeof window !== "undefined") {
      setBookingPageUrl(`${window.location.origin}/book/${businessId}`);
    }
  }, [businessId]);

  const fetchBookings = async (retries = 2) => {
    try {
      const response = await fetch("/api/bookings");
      if (response.ok) {
        const data = await response.json();
        setBookings(Array.isArray(data) ? data : []);

        const today = startOfDay(new Date());
        const list = Array.isArray(data) ? data : [];
        const todayBookings = list.filter((b: Booking) => {
          const bookingDate = startOfDay(new Date(b.startTime));
          return bookingDate.getTime() === today.getTime();
        });
        const upcomingBookings = list.filter((b: Booking) =>
          isFuture(new Date(b.startTime))
        );
        const pendingBookings = list.filter(
          (b: Booking) => b.status === "PENDING"
        );

        setStats({
          today: todayBookings.length,
          upcoming: upcomingBookings.length,
          pending: pendingBookings.length,
        });
      }
    } catch (error) {
      if (retries > 0) {
        await new Promise((r) => setTimeout(r, 1500));
        return fetchBookings(retries - 1);
      }
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

  const openDialog = (booking: Booking, action: string) => {
    setSelectedBooking(booking);
    setPendingAction(action);
    setDialogOpen(true);
  };

  const confirmBookingAction = async () => {
    if (!selectedBooking || !pendingAction) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: pendingAction }),
      });

      if (response.ok) {
        setDialogOpen(false);
        setSelectedBooking(null);
        setPendingAction(null);
        fetchBookings();
        toast({
          title: "Success",
          description: `Booking ${pendingAction.toLowerCase()} successfully`,
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
    } finally {
      setUpdating(false);
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

  const copyBookingUrl = async () => {
    if (!bookingPageUrl) return;
    try {
      await navigator.clipboard.writeText(bookingPageUrl);
      setUrlCopied(true);
      toast({
        title: "Copied!",
        description: "Booking page URL copied to clipboard",
      });
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive",
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
            <div className="flex flex-col sm:flex-row gap-3 sm:items-stretch">
              <div className="flex-1 flex min-w-0 h-10 bg-background border rounded-lg w-full sm:max-w-xl overflow-hidden">
                <code className="flex-1 text-sm font-mono text-muted-foreground truncate min-w-0 py-2.5 pl-3 pr-2 flex items-center">
                  {bookingPageUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyBookingUrl}
                  className={`shrink-0 h-full min-w-[72px] px-3 text-xs rounded-none border-l border-t-0 border-b-0 border-r-0 transition-colors ${
                    urlCopied ? "text-green-600 border-green-300 bg-green-50" : ""
                  }`}
                >
                  {urlCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </Button>
              </div>
              <Button
                asChild
                variant="default"
                size="default"
                className="shrink-0 h-10 px-5 rounded-lg font-medium"
              >
                <Link href={`/book/${businessId}`} target="_blank" className="flex items-center justify-center gap-2 h-full">
                  <ExternalLink className="h-4 w-4" />
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
                          onClick={() => openDialog(booking, "CONFIRMED")}
                          disabled={updating}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog(booking, "CANCELLED")}
                          disabled={updating}
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

      {/* Confirmation modal for Confirm / Cancel booking */}
      <Modal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={
          pendingAction === "CANCELLED"
            ? "Cancel Booking"
            : "Confirm Booking"
        }
        description={
          pendingAction === "CANCELLED"
            ? "Are you sure you want to cancel this booking? This action cannot be undone."
            : "Confirm this booking to notify the customer and add it to your schedule."
        }
        size="lg"
        footer={
          <ModalFooter>
            <ModalButton
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setSelectedBooking(null);
                setPendingAction(null);
              }}
              disabled={updating}
            >
              Cancel
            </ModalButton>
            <ModalButton
              variant={pendingAction === "CANCELLED" ? "destructive" : "default"}
              onClick={confirmBookingAction}
              loading={updating}
            >
              {pendingAction === "CANCELLED" ? "Cancel Booking" : "Confirm Booking"}
            </ModalButton>
          </ModalFooter>
        }
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 mt-0.5 flex-shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Customer
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedBooking.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedBooking.customerEmail}
                  </p>
                </div>
              </div>
              <div className="h-px bg-border my-2" />
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 mt-0.5 flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Service
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {selectedBooking.service.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {format(new Date(selectedBooking.startTime), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
