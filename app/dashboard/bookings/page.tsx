"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, CheckCircle2, XCircle, Clock, Loader2, User, CalendarDays, DollarSign, AlertCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Modal, ModalFooter, ModalButton } from "@/components/ui/modal";
import { detectSentiment, getSentimentColor, getSentimentLabel } from "@/lib/ai/sentiment-detection";

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  startTime: string;
  status: string;
  notes?: string;
  service: {
    name: string;
    price: number;
    duration: number;
  };
}

export default function BookingsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      fetchBookings();
    } else if (status === "unauthenticated") {
      window.location.href = "/auth/signin";
    }
  }, [filter, status]);

  const fetchBookings = async () => {
    try {
      const url =
        filter === "all"
          ? "/api/bookings"
          : `/api/bookings?status=${filter}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setBookings(data);
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
    setUpdating(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchBookings();
        toast({
          title: "Success",
          description: `Booking ${newStatus.toLowerCase()} successfully`,
        });
        setDialogOpen(false);
        setSelectedBooking(null);
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
      setPendingAction(null);
    }
  };

  const openDialog = (booking: Booking, action: string) => {
    setSelectedBooking(booking);
    setPendingAction(action);
    setDialogOpen(true);
  };

  const confirmAction = () => {
    if (selectedBooking && pendingAction) {
      handleStatusChange(selectedBooking.id, pendingAction);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return "default";
      case "CANCELLED":
        return "destructive";
      case "COMPLETED":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <CheckCircle2 className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">All Bookings</h1>
              <HelpTooltip content="View and manage all your bookings. You can confirm, cancel, or change the status of any booking. Pending bookings require your confirmation." />
            </div>
            <p className="text-muted-foreground">
              Manage and view all your bookings
            </p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bookings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Bookings</CardTitle>
            <CardDescription>
              {bookings.length === 0
                ? "No bookings found"
                : `${bookings.length} booking${bookings.length !== 1 ? "s" : ""} found`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {filter === "all" || !filter
                    ? "No bookings yet"
                    : `No ${filter.toLowerCase()} bookings`}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {filter === "all" || !filter
                    ? "Start by sharing your booking page with customers. They can book appointments directly from your public page."
                    : `You don't have any ${filter.toLowerCase()} bookings at the moment.`}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => (
                      <TableRow 
                        key={booking.id}
                        className="cursor-pointer transition-colors hover:bg-accent/50"
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {booking.customerName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {booking.customerEmail}
                            </div>
                            {booking.customerPhone && (
                              <div className="text-sm text-muted-foreground">
                                {booking.customerPhone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {booking.service.name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ${Number(booking.service.price).toFixed(2)} •{" "}
                              {booking.service.duration} min
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>
                              {format(
                                new Date(booking.startTime),
                                "MMM d, yyyy 'at' h:mm a"
                              )}
                            </div>
                            {booking.notes && (() => {
                              const sentiment = detectSentiment(booking.notes);
                              if (sentiment.type !== "neutral") {
                                return (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getSentimentColor(sentiment.type)} text-white border-0`}
                                  >
                                    {getSentimentLabel(sentiment.type)}
                                  </Badge>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusBadgeVariant(booking.status)}
                            className="gap-1.5"
                          >
                            {getStatusIcon(booking.status)}
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {booking.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    openDialog(booking, "CONFIRMED")
                                  }
                                  disabled={updating}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    openDialog(booking, "CANCELLED")
                                  }
                                  disabled={updating}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                            {booking.status === "CONFIRMED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  openDialog(booking, "COMPLETED")
                                }
                                disabled={updating}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <Modal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={
          pendingAction === "CANCELLED"
            ? "Cancel Booking"
            : pendingAction === "CONFIRMED"
            ? "Confirm Booking"
            : "Complete Booking"
        }
        description={
          pendingAction === "CANCELLED"
            ? "Are you sure you want to cancel this booking? This action cannot be undone."
            : pendingAction === "CONFIRMED"
            ? "Confirm this booking to notify the customer and add it to your schedule."
            : "Mark this booking as completed. The customer will be notified."
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
              onClick={confirmAction}
              loading={updating}
            >
              {pendingAction === "CANCELLED"
                ? "Cancel Booking"
                : pendingAction === "CONFIRMED"
                ? "Confirm Booking"
                : "Complete Booking"}
            </ModalButton>
          </ModalFooter>
        }
      >
        {selectedBooking && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
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
                  {selectedBooking.customerPhone && (
                    <p className="text-xs text-muted-foreground">
                      {selectedBooking.customerPhone}
                    </p>
                  )}
                </div>
              </div>

              <div className="h-px bg-border" />

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
                  <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        ${Number(selectedBooking.service.price).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{selectedBooking.service.duration} min</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px bg-border" />

              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 mt-0.5 flex-shrink-0">
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Date & Time
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {format(
                      new Date(selectedBooking.startTime),
                      "EEEE, MMMM d, yyyy"
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(
                      new Date(selectedBooking.startTime),
                      "h:mm a"
                    )}
                  </p>
                </div>
              </div>

              {selectedBooking.notes && (
                <>
                  <div className="h-px bg-border" />
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 mt-0.5 flex-shrink-0">
                      <AlertCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Notes
                        </p>
                        {(() => {
                          const sentiment = detectSentiment(selectedBooking.notes);
                          if (sentiment.type !== "neutral") {
                            return (
                              <Badge
                                variant="outline"
                                className={`text-xs ${getSentimentColor(sentiment.type)} text-white border-0`}
                              >
                                {getSentimentLabel(sentiment.type)}
                              </Badge>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {selectedBooking.notes}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
