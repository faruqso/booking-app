"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { getLocalizationSettings, formatDateWithSettings, formatTimeWithSettings, type LocalizationSettings } from "@/lib/date-formatting";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, CheckCircle2, XCircle, Clock, Loader2, User, CalendarDays, DollarSign, AlertCircle, Sparkles, MapPin, FileText, MoreVertical, Mail, CalendarPlus, Edit, ArrowRight, Move, Search, Filter, SortAsc, SortDesc } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Modal, ModalFooter, ModalButton } from "@/components/ui/modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { detectSentiment, getSentimentColor, getSentimentLabel } from "@/lib/ai/sentiment-detection";

interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  startTime: string;
  endTime?: string;
  status: string;
  paymentStatus?: string;
  amountPaid?: number | null;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  serviceId?: string;
  service: {
    id?: string;
    name: string;
    price: number;
    duration: number;
  };
  location?: {
    id: string;
    name: string;
  } | null;
}

export default function BookingsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "created" | "customer" | "service">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [localizationSettings, setLocalizationSettings] = useState<LocalizationSettings | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchBookings();
      fetchLocalizationSettings();
    } else if (status === "unauthenticated") {
      window.location.href = "/auth/signin";
    }
  }, [status]);

  const fetchLocalizationSettings = async () => {
    try {
      const settings = await getLocalizationSettings();
      setLocalizationSettings(settings);
    } catch (error) {
      console.error("Failed to fetch localization settings:", error);
      // Use defaults
      setLocalizationSettings({
        timezone: "UTC",
        dateFormat: "MMM d, yyyy",
        timeFormat: "h:mm a",
      });
    }
  };

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/bookings");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to fetch bookings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load bookings. Please check your database connection.",
        variant: "destructive",
        duration: 8000,
      });
      setBookings([]); // Set empty array on error
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

  const handleViewBookingDetails = async (booking: Booking) => {
    setSelectedBooking(booking);
    setBookingDetailsOpen(true);
    setLoadingDetails(true);
    
    try {
      const response = await fetch(`/api/bookings/${booking.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch booking details");
      }
      const data = await response.json();
      setBookingDetails(data);
    } catch (error) {
      console.error("Failed to fetch booking details:", error);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive",
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleBookingStatusChange = async (status: "CONFIRMED" | "CANCELLED" | "COMPLETED") => {
    const bookingId = selectedBooking?.id ?? bookingDetails?.id;
    if (!bookingId) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Failed to update booking status");
      }

      // Refresh bookings list and booking details
      await fetchBookings();
      if (selectedBooking) {
        await handleViewBookingDetails(selectedBooking);
      }

      toast({
        title: "Booking updated",
        description: `Booking ${status.toLowerCase()} successfully`,
      });

      setDialogOpen(false);
      setPendingAction(null);
    } catch (error: any) {
      console.error("Failed to update booking status:", error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update booking status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const confirmBookingAction = () => {
    if (pendingAction) {
      handleBookingStatusChange(pendingAction as "CONFIRMED" | "CANCELLED" | "COMPLETED");
    }
  };

  const getStatusBadgeVariant = (status: string): "statusConfirmed" | "statusPending" | "statusCompleted" | "statusCancelled" | "outline" => {
    switch (status) {
      case "CONFIRMED":
        return "statusConfirmed";
      case "CANCELLED":
        return "statusCancelled";
      case "COMPLETED":
        return "statusCompleted";
      case "PENDING":
        return "statusPending";
      default:
        return "outline";
    }
  };

  const getPaymentBadgeVariant = (paymentStatus: string): "paymentPaid" | "paymentPending" | "paymentProcessing" | "outline" => {
    switch (paymentStatus) {
      case "COMPLETED":
        return "paymentPaid";
      case "PROCESSING":
        return "paymentProcessing";
      case "PENDING":
        return "paymentPending";
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

  const handleReschedule = (booking: Booking) => {
    // Navigate to calendar with the booking date selected
    const bookingDate = new Date(booking.startTime);
    router.push(`/dashboard/calendar?date=${bookingDate.toISOString()}&bookingId=${booking.id}`);
  };

  const handleSendReminder = async (bookingId: string) => {
    setSendingReminder(bookingId);
    try {
      const response = await fetch(`/api/bookings/${bookingId}/reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        toast({
          title: "Reminder sent",
          description: "A reminder email has been sent to the customer.",
        });
      } else {
        throw new Error("Failed to send reminder");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder",
        variant: "destructive",
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const handleRecreateBooking = (booking: Booking) => {
    // Navigate to bookings page with customer info pre-filled
    const params = new URLSearchParams({
      action: "create",
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone || "",
      serviceId: booking.serviceId || booking.service?.id || "",
    });
    router.push(`/dashboard/bookings?${params.toString()}`);
  };


  // Filter and sort bookings (all client-side; no refetch on filter change)
  const filteredAndSortedBookings = bookings
    .filter((booking) => {
      if (filter !== "all" && booking.status !== filter) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        booking.customerName.toLowerCase().includes(query) ||
        booking.customerEmail.toLowerCase().includes(query) ||
        booking.customerPhone?.toLowerCase().includes(query) ||
        booking.service.name.toLowerCase().includes(query) ||
        booking.location?.name.toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "date":
          comparison = new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
          break;
        case "created":
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = aCreated - bCreated;
          break;
        case "customer":
          comparison = a.customerName.localeCompare(b.customerName);
          break;
        case "service":
          comparison = a.service.name.localeCompare(b.service.name);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Calculate stats
  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    completed: bookings.filter((b) => b.status === "COMPLETED").length,
    cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
    unpaid: bookings.filter((b) => b.paymentStatus === "PENDING").length,
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

        {/* Quick Stats - clickable filters like calendar */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card
            className={cn(
              "border transition-colors cursor-pointer",
              filter === "all" ? "border-gray-300 bg-gray-50/50" : "border-gray-200 hover:border-gray-300"
            )}
            onClick={() => setFilter("all")}
          >
            <CardContent className="pt-4 pb-3">
              <div className="text-xs font-medium text-gray-600 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "border transition-colors cursor-pointer",
              filter === "PENDING" ? "border-amber-300 bg-amber-50/50" : "border-amber-200 hover:border-amber-200 bg-amber-50/30"
            )}
            onClick={() => setFilter(filter === "PENDING" ? "all" : "PENDING")}
          >
            <CardContent className="pt-4 pb-3">
              <div className="text-xs font-medium text-amber-700 mb-1">Pending</div>
              <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "border transition-colors cursor-pointer",
              filter === "CONFIRMED" ? "border-green-300 bg-green-50/50" : "border-gray-200 hover:border-green-200"
            )}
            onClick={() => setFilter(filter === "CONFIRMED" ? "all" : "CONFIRMED")}
          >
            <CardContent className="pt-4 pb-3">
              <div className="text-xs font-medium text-green-700 mb-1">Confirmed</div>
              <div className="text-2xl font-bold text-green-600">{stats.confirmed}</div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "border transition-colors cursor-pointer",
              filter === "COMPLETED" ? "border-gray-300 bg-gray-50/50" : "border-gray-200 hover:border-gray-300 bg-gray-50/30"
            )}
            onClick={() => setFilter(filter === "COMPLETED" ? "all" : "COMPLETED")}
          >
            <CardContent className="pt-4 pb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">Completed</div>
              <div className="text-2xl font-bold text-gray-600">{stats.completed}</div>
            </CardContent>
          </Card>
          <Card
            className={cn(
              "border transition-colors cursor-pointer",
              filter === "CANCELLED" ? "border-red-300 bg-red-50/50" : "border-red-200 hover:border-red-200 bg-red-50/30"
            )}
            onClick={() => setFilter(filter === "CANCELLED" ? "all" : "CANCELLED")}
          >
            <CardContent className="pt-4 pb-3">
              <div className="text-xs font-medium text-red-700 mb-1">Cancelled</div>
              <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            </CardContent>
          </Card>
          <Card className="border border-orange-200 bg-orange-50/50">
            <CardContent className="pt-4 pb-3">
              <div className="text-xs font-medium text-orange-700 mb-1">Unpaid</div>
              <div className="text-2xl font-bold text-orange-600">{stats.unpaid}</div>
            </CardContent>
          </Card>
        </div>

        {/* Bookings Table - same filter treatment as calendar: left border, tint, pill, subtitle, clear */}
        <Card className={cn(
          "border shadow-sm transition-colors",
          filter === "CONFIRMED" && "border-l-4 border-l-green-500 border-gray-200 bg-green-50/20",
          filter === "PENDING" && "border-l-4 border-l-amber-500 border-gray-200 bg-amber-50/20",
          filter === "CANCELLED" && "border-l-4 border-l-red-500 border-gray-200 bg-red-50/20",
          filter === "COMPLETED" && "border-l-4 border-l-gray-500 border-gray-200 bg-gray-50/50",
          filter === "all" && "border-gray-200"
        )}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-xl font-bold text-gray-900">Bookings</CardTitle>
                  {filter !== "all" && (
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium",
                      filter === "CONFIRMED" && "border-green-200 bg-green-100 text-green-800",
                      filter === "PENDING" && "border-amber-200 bg-amber-100 text-amber-800",
                      filter === "CANCELLED" && "border-red-200 bg-red-100 text-red-800",
                      filter === "COMPLETED" && "border-gray-200 bg-gray-100 text-gray-700"
                    )}>
                      Filter: {filter.charAt(0) + filter.slice(1).toLowerCase()}
                    </span>
                  )}
                </div>
                <CardDescription className="text-sm text-gray-600 mt-0.5">
                  {filter !== "all"
                    ? `Showing ${filter.toLowerCase()} bookings only — click a stat card above to see all`
                    : filteredAndSortedBookings.length === 0
                      ? "No bookings found"
                      : `${filteredAndSortedBookings.length} of ${bookings.length} booking${bookings.length !== 1 ? "s" : ""} shown`}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search bookings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Sort by Date</SelectItem>
                    <SelectItem value="created">Sort by Created</SelectItem>
                    <SelectItem value="customer">Sort by Customer</SelectItem>
                    <SelectItem value="service">Sort by Service</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="h-9 w-9 p-0"
                >
                  {sortOrder === "asc" ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <SortDesc className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!loading && bookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {filter === "all" || !filter
                    ? "No bookings yet"
                    : `No ${filter.toLowerCase()} bookings`}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  {filter === "all" || !filter
                    ? "Start by sharing your booking page with customers. They can book appointments directly from your public page."
                    : `You don't have any ${filter.toLowerCase()} bookings at the moment.`}
                </p>
                {filter === "all" && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      To test the booking system:
                    </p>
                    <div className="flex flex-col items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/dashboard/bookings?action=create")}
                        className="gap-2"
                      >
                        <CalendarPlus className="h-4 w-4" />
                        Create Test Booking
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Or visit your public booking page to create a booking as a customer
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Loading bookings...</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Appointment</TableHead>
                      <TableHead>Booked On</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedBookings.map((booking) => {
                      return (
                        <TableRow 
                          key={booking.id}
                          className="cursor-pointer transition-colors hover:bg-accent/50"
                          onClick={() => handleViewBookingDetails(booking)}
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
                                <div className="text-xs text-muted-foreground">
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
                                ${Number(booking.service.price).toFixed(2)} • {booking.service.duration} min
                              </div>
                              {booking.location && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {booking.location.name}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">
                                {localizationSettings
                                  ? formatDateWithSettings(booking.startTime, localizationSettings)
                                  : format(new Date(booking.startTime), "MMM d, yyyy")}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {localizationSettings
                                  ? formatTimeWithSettings(booking.startTime, localizationSettings)
                                  : format(new Date(booking.startTime), "h:mm a")}
                                {booking.endTime && (
                                  <> - {localizationSettings
                                    ? formatTimeWithSettings(booking.endTime, localizationSettings)
                                    : format(new Date(booking.endTime), "h:mm a")}</>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {booking.createdAt ? (
                              <div className="space-y-1">
                                <div className="text-sm">
                                  {localizationSettings
                                    ? formatDateWithSettings(booking.createdAt, localizationSettings)
                                    : format(new Date(booking.createdAt), "MMM d, yyyy")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {localizationSettings
                                    ? formatTimeWithSettings(booking.createdAt, localizationSettings)
                                    : format(new Date(booking.createdAt), "h:mm a")}
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {booking.paymentStatus ? (
                              <div className="space-y-1">
                                <Badge
                                  variant={getPaymentBadgeVariant(booking.paymentStatus)}
                                  className="gap-1 font-normal"
                                >
                                  {booking.paymentStatus}
                                </Badge>
                                {booking.amountPaid !== null && booking.amountPaid !== undefined && (
                                  <div className="text-xs text-muted-foreground">
                                    ${Number(booking.amountPaid).toFixed(2)} paid
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={getStatusBadgeVariant(booking.status)}
                              className="gap-1.5 font-normal"
                            >
                              {getStatusIcon(booking.status)}
                              {booking.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right bg-muted/20" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end items-center gap-2">
                              {booking.status === "PENDING" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => openDialog(booking, "CONFIRMED")}
                                    disabled={updating}
                                    className="gap-1.5"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Confirm
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="outline" disabled={updating} className="h-8 w-8 p-0" aria-label="More options">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem onClick={() => handleReschedule(booking)}>
                                        <Move className="mr-2 h-4 w-4" />
                                        Reschedule
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleSendReminder(booking.id)} disabled={sendingReminder === booking.id}>
                                        {sendingReminder === booking.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                        Send Reminder
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openDialog(booking, "CANCELLED")} className="text-red-600 focus:text-red-600">
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Cancel Booking
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </>
                              )}
                              {booking.status === "CONFIRMED" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openDialog(booking, "COMPLETED")}
                                    disabled={updating}
                                    className="gap-1.5"
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Complete
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="outline" disabled={updating} className="h-8 w-8 p-0" aria-label="More options">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem onClick={() => handleReschedule(booking)}>
                                        <Move className="mr-2 h-4 w-4" />
                                        Reschedule
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleSendReminder(booking.id)} disabled={sendingReminder === booking.id}>
                                        {sendingReminder === booking.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                                        Send Reminder
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => openDialog(booking, "CANCELLED")} className="text-red-600 focus:text-red-600">
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Cancel Booking
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </>
                              )}
                              {booking.status === "CANCELLED" && (
                                <>
                                  <Button size="sm" variant="outline" onClick={() => handleRecreateBooking(booking)} className="gap-1.5">
                                    <CalendarPlus className="h-3.5 w-3.5" />
                                    Recreate
                                  </Button>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="outline" className="h-8 w-8 p-0" aria-label="More options">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem onClick={() => handleRecreateBooking(booking)}>
                                        <CalendarPlus className="mr-2 h-4 w-4" />
                                        Book Again
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </>
                              )}
                              {booking.status === "COMPLETED" && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0" aria-label="More options">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem onClick={() => handleRecreateBooking(booking)}>
                                      <CalendarPlus className="mr-2 h-4 w-4" />
                                      Book Again
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    </TableBody>
                  </Table>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Booking Details Modal */}
      <Modal
        open={bookingDetailsOpen}
        onOpenChange={(open) => {
          setBookingDetailsOpen(open);
          if (!open) {
            setSelectedBooking(null);
            setBookingDetails(null);
          }
        }}
        title="Booking Details"
        description="View and manage booking information"
        size="xl"
        footer={
          <ModalFooter className="justify-end w-full">
            {bookingDetails?.status === "PENDING" && (
              <>
                <ModalButton
                  variant="outline"
                  onClick={() => {
                    if (selectedBooking) {
                      handleReschedule(selectedBooking);
                      setBookingDetailsOpen(false);
                    }
                  }}
                  disabled={updating}
                  className="min-w-[130px] border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Move className="mr-2 h-4 w-4" />
                  Reschedule
                </ModalButton>
                <ModalButton
                  variant="outline"
                  onClick={() => {
                    if (selectedBooking) {
                      handleSendReminder(selectedBooking.id);
                    }
                  }}
                  disabled={updating || sendingReminder === selectedBooking?.id}
                  className="min-w-[140px] border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {sendingReminder === selectedBooking?.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Reminder
                    </>
                  )}
                </ModalButton>
                <ModalButton
                  variant="outline"
                  onClick={() => {
                    setPendingAction("CANCELLED");
                    setDialogOpen(true);
                  }}
                  disabled={updating}
                  className="min-w-[120px] border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </ModalButton>
                <ModalButton
                  variant="default"
                  onClick={() => {
                    setPendingAction("CONFIRMED");
                    setDialogOpen(true);
                  }}
                  disabled={updating}
                  className="min-w-[150px] shadow-sm"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirm Booking
                </ModalButton>
              </>
            )}
            {bookingDetails?.status === "CONFIRMED" && (
              <>
                <ModalButton
                  variant="outline"
                  onClick={() => {
                    if (selectedBooking) {
                      handleReschedule(selectedBooking);
                      setBookingDetailsOpen(false);
                    }
                  }}
                  disabled={updating}
                  className="min-w-[130px] border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Move className="mr-2 h-4 w-4" />
                  Reschedule
                </ModalButton>
                <ModalButton
                  variant="outline"
                  onClick={() => {
                    if (selectedBooking) {
                      handleSendReminder(selectedBooking.id);
                    }
                  }}
                  disabled={updating || sendingReminder === selectedBooking?.id}
                  className="min-w-[140px] border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  {sendingReminder === selectedBooking?.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Reminder
                    </>
                  )}
                </ModalButton>
                <ModalButton
                  variant="outline"
                  onClick={() => {
                    setPendingAction("CANCELLED");
                    setDialogOpen(true);
                  }}
                  disabled={updating}
                  className="min-w-[120px] border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </ModalButton>
                <ModalButton
                  variant="default"
                  onClick={() => {
                    setPendingAction("COMPLETED");
                    setDialogOpen(true);
                  }}
                  disabled={updating}
                  className="min-w-[150px] shadow-sm"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Complete
                </ModalButton>
              </>
            )}
            {bookingDetails?.status === "CANCELLED" && (
              <ModalButton
                variant="default"
                onClick={() => {
                  if (selectedBooking) {
                    handleRecreateBooking(selectedBooking);
                    setBookingDetailsOpen(false);
                  }
                }}
                className="min-w-[160px] shadow-sm"
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Recreate Booking
              </ModalButton>
            )}
            {bookingDetails?.status === "COMPLETED" && (
              <ModalButton
                variant="default"
                onClick={() => {
                  if (selectedBooking) {
                    handleRecreateBooking(selectedBooking);
                    setBookingDetailsOpen(false);
                  }
                }}
                className="min-w-[160px] shadow-sm"
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Book Again
              </ModalButton>
            )}
          </ModalFooter>
        }
      >
        {loadingDetails ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : bookingDetails ? (
          <div className="space-y-5">
            {/* Status Badge - More Prominent */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    bookingDetails.status === "CONFIRMED"
                      ? "default"
                      : bookingDetails.status === "PENDING"
                      ? "secondary"
                      : bookingDetails.status === "CANCELLED"
                      ? "destructive"
                      : "outline"
                  }
                  className="text-sm px-4 py-1.5 font-semibold"
                >
                  {bookingDetails.status}
                </Badge>
                {bookingDetails.location && (
                  <span className="text-sm text-gray-600 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {bookingDetails.location.name}
                  </span>
                )}
              </div>
            </div>

            {/* Schedule - Most Important, Highlighted */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-5 space-y-4">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Schedule
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Time</p>
                  <p className="text-lg font-bold text-gray-900">
                    {format(new Date(bookingDetails.startTime), "PPp")}
                  </p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Time</p>
                  <p className="text-lg font-bold text-gray-900">
                    {format(new Date(bookingDetails.endTime || bookingDetails.startTime), "PPp")}
                  </p>
                </div>
              </div>
            </div>

            {/* Service Information - Card Style */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Service Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Service Name</p>
                  <p className="text-base font-semibold text-gray-900">{bookingDetails.service?.name || "N/A"}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Duration</p>
                  <p className="text-base text-gray-900">{bookingDetails.service?.duration || 0} minutes</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Price</p>
                  <p className="text-base font-bold text-gray-900">
                    ${typeof bookingDetails.service?.price === "number" 
                      ? bookingDetails.service.price.toFixed(2) 
                      : bookingDetails.service?.price || "0.00"}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Information - Card Style */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 space-y-4">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Customer Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Customer Name</p>
                  <p className="text-base font-semibold text-gray-900">{bookingDetails.customerName}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-base text-gray-900 break-words">{bookingDetails.customerEmail}</p>
                </div>
                {bookingDetails.customerPhone && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</p>
                    <p className="text-base text-gray-900">{bookingDetails.customerPhone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes - Only if present */}
            {bookingDetails.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg p-5 space-y-2">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </h3>
                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{bookingDetails.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">Failed to load booking details</p>
          </div>
        )}
      </Modal>

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
              onClick={confirmBookingAction}
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
                  {selectedBooking.customerPhone && (
                    <p className="text-xs text-muted-foreground">
                      {selectedBooking.customerPhone}
                    </p>
                  )}
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

              <div className="h-px bg-border my-2" />

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
                  <div className="h-px bg-border my-2" />
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
