"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
// @ts-ignore - react-dnd types may not be fully compatible
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Calendar, momentLocalizer, View, Event } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Modal, ModalFooter, ModalButton } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Loader2, CheckCircle2, XCircle, Plus, CalendarPlus, MapPin, FileText, Clock, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, differenceInMinutes } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const localizer = momentLocalizer(moment);

// Create drag-and-drop calendar wrapper
let DragAndDropCalendarComponent: typeof Calendar = Calendar;

// Try to load drag-and-drop addon (will work on client side)
if (typeof window !== "undefined") {
  try {
    // @ts-ignore - Dynamic require for CommonJS module
    const dragAndDropModule = require("react-big-calendar/lib/addons/dragAndDrop");
    const withDragAndDrop = dragAndDropModule.default || dragAndDropModule;
    if (typeof withDragAndDrop === "function") {
      DragAndDropCalendarComponent = withDragAndDrop(Calendar);
    }
  } catch (error) {
    // Fallback to regular Calendar if drag-and-drop fails
    console.warn("Drag-and-drop not available:", error);
  }
}

interface BookingEvent extends Event {
  id: string;
  resource: {
    bookingId: string;
    serviceName: string;
    customerName: string;
    status: string;
    notes?: string;
  };
}

export default function CalendarPage() {
  const router = useRouter();
  const { status } = useSession();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [currentView, setCurrentView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [reschedulingBookingId, setReschedulingBookingId] = useState<string | null>(null);
  const [reschedulingStatus, setReschedulingStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [reschedulingMessage, setReschedulingMessage] = useState<string>("");
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<BookingEvent | null>(null);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dateBookings, setDateBookings] = useState<any[]>([]);
  const [loadingDateBookings, setLoadingDateBookings] = useState(false);
  const [pendingAction, setPendingAction] = useState<"CONFIRMED" | "CANCELLED" | "COMPLETED" | null>(null);
  const [updating, setUpdating] = useState(false);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchBookings();
    }
  }, [status, router, currentDate]);

  // Add/remove body class when dragging to enable drop zone visual feedback
  useEffect(() => {
    const handleDragStart = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only add dragging class for actual event dragging
      if (target.closest(".rbc-event")) {
        document.body.classList.add("rbc-addons-dnd-is-dragging");
      }
    };
    
    const handleDragEnd = () => {
      document.body.classList.remove("rbc-addons-dnd-is-dragging");
    };

    // Listen for drag events on the calendar
    const calendarElement = calendarRef.current;
    if (calendarElement) {
      calendarElement.addEventListener("mousedown", handleDragStart);
      document.addEventListener("mouseup", handleDragEnd);
    }

    return () => {
      if (calendarElement) {
        calendarElement.removeEventListener("mousedown", handleDragStart);
      }
      document.removeEventListener("mouseup", handleDragEnd);
      document.body.classList.remove("rbc-addons-dnd-is-dragging");
    };
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch("/api/bookings");
      if (response.ok) {
        const data = await response.json();
        const events: BookingEvent[] = data.map((booking: any) => ({
          id: booking.id,
          title: `${booking.service?.name || "Service"} - ${booking.customerName}`,
          start: new Date(booking.startTime),
          end: new Date(booking.endTime),
          resource: {
            bookingId: booking.id,
            serviceName: booking.service?.name || "Service",
            customerName: booking.customerName,
            status: booking.status,
            notes: booking.notes || undefined,
          },
        }));
        setBookings(events);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter bookings by status
  const filteredBookings = useMemo(() => {
    if (!statusFilter) return bookings;
    return bookings.filter((booking) => booking.resource.status === statusFilter);
  }, [bookings, statusFilter]);

  // Calculate quick stats
  const stats = useMemo(() => {
    return {
      total: bookings.length,
      confirmed: bookings.filter((b) => b.resource.status === "CONFIRMED").length,
      pending: bookings.filter((b) => b.resource.status === "PENDING").length,
      cancelled: bookings.filter((b) => b.resource.status === "CANCELLED").length,
      completed: bookings.filter((b) => b.resource.status === "COMPLETED").length,
    };
  }, [bookings]);

  const handleSelectEvent = async (event: BookingEvent) => {
    setSelectedBooking(event);
    setLoadingDetails(true);
    
    try {
      const response = await fetch(`/api/bookings/${event.resource.bookingId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setBookingDetails(data);
    } catch (error: any) {
      console.error("Failed to fetch booking details:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load booking details",
        variant: "destructive",
      });
      setBookingDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleStatusChange = async (status: "CONFIRMED" | "CANCELLED" | "COMPLETED") => {
    if (!bookingDetails) return;
    
    setUpdating(true);
    try {
      const response = await fetch(`/api/bookings/${bookingDetails.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update booking status");
      }

      // Refresh booking details and bookings list
      await fetchBookings();
      if (selectedBooking) {
        await handleSelectEvent(selectedBooking);
      }

      toast({
        title: "Booking updated",
        description: `Booking ${status.toLowerCase()} successfully`,
      });

      setActionDialogOpen(false);
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

  const handleCreateNewBooking = () => {
    if (!bookingDetails) return;
    
    // Navigate to bookings page - the user can create a new booking from there
    // We'll pass customer info via URL params if the bookings page supports it
    const params = new URLSearchParams({
      action: "create",
      customerName: bookingDetails.customerName,
      customerEmail: bookingDetails.customerEmail,
      customerPhone: bookingDetails.customerPhone || "",
      serviceId: bookingDetails.serviceId || bookingDetails.service?.id || "",
    });
    
    router.push(`/dashboard/bookings?${params.toString()}`);
    setSelectedBooking(null);
  };

  const confirmAction = () => {
    if (pendingAction) {
      handleStatusChange(pendingAction);
    }
  };

  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  const handleSelectSlot = async (slotInfo: { start: Date; end: Date; slots: Date[] }) => {
    // Only handle clicks, not drags
    if (isRescheduling) return;
    
    const clickedDate = slotInfo.start;
    setSelectedDate(clickedDate);
    setLoadingDateBookings(true);
    
    try {
      // Format date for API (YYYY-MM-DD)
      const dateString = format(clickedDate, "yyyy-MM-dd");
      
      // Fetch bookings for the selected date using API
      const response = await fetch(`/api/bookings?date=${dateString}`);
      if (response.ok) {
        const data = await response.json();
        setDateBookings(data);
      } else {
        throw new Error("Failed to fetch bookings");
      }
    } catch (error) {
      console.error("Failed to fetch date bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load bookings for this date",
        variant: "destructive",
      });
      setDateBookings([]);
    } finally {
      setLoadingDateBookings(false);
    }
  };

  const handleEventDrop = async ({ event, start, end }: any) => {
    if (isRescheduling) return; // Prevent multiple simultaneous updates
    
    // Don't allow rescheduling cancelled or completed bookings
    if (event.resource.status === "CANCELLED" || event.resource.status === "COMPLETED") {
      toast({
        title: "Cannot reschedule",
        description: `${event.resource.status.toLowerCase()} bookings cannot be rescheduled`,
        variant: "destructive",
      });
      return;
    }
    
    // Get original start and end times from the event
    const originalStart = new Date(event.start);
    const originalEnd = new Date(event.end);
    
    // Calculate new duration if event was resized
    const originalDuration = differenceInMinutes(originalEnd, originalStart);
    const newDuration = differenceInMinutes(end, start);
    
    // Use the new duration or keep original if just moved
    const finalEnd = newDuration !== originalDuration ? end : new Date(start.getTime() + originalDuration * 60000);
    
    // Check if the event was dropped at the same position (within 1 minute tolerance)
    const startDiff = Math.abs(differenceInMinutes(start, originalStart));
    const endDiff = Math.abs(differenceInMinutes(finalEnd, originalEnd));
    
    // If dropped at the same position, don't do anything
    if (startDiff < 1 && endDiff < 1) {
      return; // No change, exit early
    }
    
    setIsRescheduling(true);
    setReschedulingStatus("loading");
    setReschedulingBookingId(event.resource.bookingId);
    setDraggingEventId(event.resource.bookingId); // Set dragging state for visual feedback
    setReschedulingMessage("Rescheduling booking...");
    const bookingId = event.resource.bookingId;

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: start.toISOString(),
          endTime: finalEnd.toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to reschedule booking: ${response.statusText}`);
      }

      // Optimistically update the local state
      setBookings((prevBookings) =>
        prevBookings.map((b) =>
          b.id === event.id
            ? {
                ...b,
                start,
                end: finalEnd,
              }
            : b
        )
      );

      const successMessage = `Booking moved to ${format(start, "MMM d, yyyy 'at' h:mm a")}`;
      setReschedulingStatus("success");
      setReschedulingMessage("Booking rescheduled successfully!");

      toast({
        title: "Booking rescheduled",
        description: successMessage,
      });

      // Refresh bookings to ensure consistency
      await fetchBookings();
      
      // Auto-hide success state after 2 seconds
      setTimeout(() => {
        setIsRescheduling(false);
        setReschedulingStatus(null);
        setReschedulingBookingId(null);
        setDraggingEventId(null);
        setReschedulingMessage("");
      }, 2000);
    } catch (error: any) {
      console.error("Failed to reschedule booking:", error);
      const errorMessage = error.message || "Failed to reschedule booking. Please try again.";
      setReschedulingStatus("error");
      setReschedulingMessage(errorMessage);
      
      toast({
        title: "Rescheduling failed",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Refresh to restore original state
      await fetchBookings();
      
      // Auto-hide error state after 3 seconds
      setTimeout(() => {
        setIsRescheduling(false);
        setReschedulingStatus(null);
        setReschedulingBookingId(null);
        setDraggingEventId(null);
        setReschedulingMessage("");
      }, 3000);
    }
  };

  const eventStyleGetter = (event: BookingEvent) => {
    // Modern color palette with better contrast
    let backgroundColor = "#1877F2"; // Meta blue
    let borderColor = "#1565C0";
    let textColor = "#ffffff";
    let statusGradient = "";
    const isReschedulingThis = reschedulingBookingId === event.resource.bookingId;
    const isDraggingThis = draggingEventId === event.resource.bookingId;

    switch (event.resource.status) {
      case "CONFIRMED":
        backgroundColor = "#10b981"; // Green
        borderColor = "#059669";
        statusGradient = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
        break;
      case "PENDING":
        backgroundColor = "#f59e0b"; // Amber
        borderColor = "#d97706";
        statusGradient = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
        break;
      case "CANCELLED":
        backgroundColor = "#ef4444"; // Red
        borderColor = "#dc2626";
        statusGradient = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
        break;
      case "COMPLETED":
        backgroundColor = "#6b7280"; // Gray
        borderColor = "#4b5563";
        statusGradient = "linear-gradient(135deg, #6b7280 0%, #4b5563 100%)";
        break;
      default:
        statusGradient = "linear-gradient(135deg, #1877F2 0%, #1565C0 100%)";
    }

    // Style for event being dragged
    if (isDraggingThis) {
      return {
        style: {
          background: `linear-gradient(135deg, ${backgroundColor}E6 0%, ${borderColor}E6 100%)`,
          borderColor: "#1877F2",
          color: textColor,
          border: "3px solid #1877F2",
          borderRadius: "8px",
          padding: "8px 12px",
          fontSize: "13px",
          fontWeight: "600",
          opacity: 0.95,
          transform: "scale(1.12) translateY(-6px)",
          boxShadow: 
            "0 20px 40px rgba(24, 119, 242, 0.4), 0 0 0 4px rgba(24, 119, 242, 0.2), 0 0 40px rgba(24, 119, 242, 0.3)",
          cursor: "grabbing",
          zIndex: 10000,
          textShadow: "0 1px 3px rgba(0, 0, 0, 0.2)",
          position: "relative" as const,
        },
      };
    }

    // Add opacity and pulsing effect if this event is being rescheduled
    if (isReschedulingThis) {
      return {
        style: {
          background: `linear-gradient(135deg, ${backgroundColor}99 0%, ${borderColor}99 100%)`,
          borderColor,
          color: textColor,
          border: `2px dashed ${borderColor}`,
          borderRadius: "6px",
          padding: "6px 10px",
          fontSize: "13px",
          fontWeight: "500",
          opacity: 0.75,
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          boxShadow: `0 2px 8px ${backgroundColor}40`,
        },
      };
    }

    return {
      style: {
        background: statusGradient || `linear-gradient(135deg, ${backgroundColor} 0%, ${borderColor} 100%)`,
        borderColor: "transparent",
        color: textColor,
        border: "none",
        borderRadius: "8px",
        padding: "6px 10px",
        fontSize: "13px",
        fontWeight: "500",
        cursor: "pointer",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        position: "relative" as const,
        overflow: "visible",
        opacity: 1,
      },
    };
  };

  const CustomToolbar = ({ label, onNavigate }: any) => {
    return (
      <div className="flex items-center justify-between mb-6 p-0 bg-transparent">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5 bg-white shadow-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("PREV")}
              className="h-9 w-9 p-0 hover:bg-gray-100 rounded-md"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("TODAY")}
              className="h-9 px-4 text-sm font-semibold hover:bg-gray-100 rounded-md"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("NEXT")}
              className="h-9 w-9 p-0 hover:bg-gray-100 rounded-md"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{label}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={currentView}
            onValueChange={(value) => handleViewChange(value as View)}
          >
            <SelectTrigger className="w-40 h-9 border-gray-200 shadow-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month View</SelectItem>
              <SelectItem value="week">Week View</SelectItem>
              <SelectItem value="day">Day View</SelectItem>
              <SelectItem value="agenda">Agenda View</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    );
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(!showHelp)}
              className="h-8 w-8 p-0"
            >
              <Info className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
          <p className="text-muted-foreground">
            View and manage your bookings in calendar format
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/bookings?action=create")}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Help Tooltip */}
      {showHelp && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-gray-900">Quick Tips:</p>
                <ul className="space-y-1.5 text-gray-700 list-disc list-inside">
                  <li><strong>Click</strong> any booking to view details and manage it</li>
                  <li><strong>Click</strong> an empty date cell to see all bookings for that day</li>
                  <li><strong>Drag</strong> bookings by clicking and dragging the event to reschedule</li>
                  <li><strong>Click</strong> any booking to view and manage details</li>
                  <li><strong>Filter</strong> by status using the filter buttons below</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border border-gray-200 hover:border-gray-300 transition-colors cursor-pointer" onClick={() => setStatusFilter(null)}>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "border transition-colors cursor-pointer",
            statusFilter === "CONFIRMED" 
              ? "border-green-300 bg-green-50/50" 
              : "border-gray-200 hover:border-green-200"
          )}
          onClick={() => setStatusFilter(statusFilter === "CONFIRMED" ? null : "CONFIRMED")}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "border transition-colors cursor-pointer",
            statusFilter === "PENDING" 
              ? "border-amber-300 bg-amber-50/50" 
              : "border-gray-200 hover:border-amber-200"
          )}
          onClick={() => setStatusFilter(statusFilter === "PENDING" ? null : "PENDING")}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Pending</p>
                <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "border transition-colors cursor-pointer",
            statusFilter === "CANCELLED" 
              ? "border-red-300 bg-red-50/50" 
              : "border-gray-200 hover:border-red-200"
          )}
          onClick={() => setStatusFilter(statusFilter === "CANCELLED" ? null : "CANCELLED")}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Cancelled</p>
                <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "border transition-colors cursor-pointer",
            statusFilter === "COMPLETED" 
              ? "border-gray-300 bg-gray-50/50" 
              : "border-gray-200 hover:border-gray-300"
          )}
          onClick={() => setStatusFilter(statusFilter === "COMPLETED" ? null : "COMPLETED")}
        >
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Completed</p>
                <p className="text-2xl font-bold text-gray-600">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50">
                <CalendarIcon className="h-5 w-5 text-[#1877F2]" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">Booking Calendar</CardTitle>
                <CardDescription className="text-sm text-gray-600 mt-0.5">
                  {statusFilter 
                    ? `Showing ${statusFilter.toLowerCase()} bookings only` 
                    : "Click bookings to view details • Drag to reschedule"}
                </CardDescription>
              </div>
            </div>
            {statusFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter(null)}
                className="gap-2"
              >
                <XCircle className="h-4 w-4" />
                Clear Filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[600px] relative">
            {/* Loading/Success/Error Overlay */}
            {isRescheduling && reschedulingStatus && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
                <div className={cn(
                  "flex flex-col items-center gap-3 bg-white rounded-lg shadow-lg p-6 border min-w-[280px]",
                  reschedulingStatus === "success" && "border-green-200",
                  reschedulingStatus === "error" && "border-red-200"
                )}>
                  {reschedulingStatus === "loading" && (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-[#1877F2]" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">Rescheduling booking...</p>
                        <p className="text-xs text-gray-600 mt-1">{reschedulingMessage}</p>
                      </div>
                    </>
                  )}
                  {reschedulingStatus === "success" && (
                    <>
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">Success!</p>
                        <p className="text-xs text-gray-600 mt-1">{reschedulingMessage}</p>
                      </div>
                    </>
                  )}
                  {reschedulingStatus === "error" && (
                    <>
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
                        <XCircle className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">Rescheduling Failed</p>
                        <p className="text-xs text-red-600 mt-1 max-w-[240px]">{reschedulingMessage}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            
            <DndProvider backend={HTML5Backend}>
              <div 
                ref={calendarRef}
                className={cn("h-full", isRescheduling && reschedulingStatus === "loading" && "pointer-events-none opacity-50")}
              >
                {/* @ts-ignore - DragAndDropCalendar has additional props not in base Calendar types */}
                <DragAndDropCalendarComponent
                  localizer={localizer}
                  events={filteredBookings}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: "100%" }}
                  view={currentView}
                  onView={handleViewChange}
                  date={currentDate}
                  onNavigate={handleNavigate}
                  onSelectEvent={handleSelectEvent}
                  onSelectSlot={handleSelectSlot}
                  selectable={true}
                  onEventDrop={handleEventDrop}
                  eventPropGetter={eventStyleGetter}
                  draggableAccessor={(event: BookingEvent) => 
                    !isRescheduling && 
                    event.resource.status !== "CANCELLED" && 
                    event.resource.status !== "COMPLETED"
                  }
                  step={15}
                  timeslots={4}
                  components={{
                    toolbar: CustomToolbar,
                    event: ({ event }: any) => {
                      const startTime = format(new Date(event.start), "h:mm a");
                      const endTime = format(new Date(event.end), "h:mm a");
                      const fullTitle = `${event.resource.serviceName} - ${event.resource.customerName} (${startTime}${endTime ? ` - ${endTime}` : ""})`;
                      
                      return (
                        <div 
                          className="rbc-event-content-wrapper"
                          title={fullTitle}
                          data-tooltip={fullTitle}
                        >
                          <div className="flex items-center gap-1">
                            {/* Single line: Service name + time */}
                            <div className="flex-1 min-w-0 flex items-center gap-1">
                              <span className="rbc-event-content font-semibold text-xs leading-none truncate">
                                {event.resource.serviceName}
                              </span>
                              <span className="rbc-event-time text-[10px] opacity-80 font-medium flex-shrink-0 whitespace-nowrap">
                                {startTime}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    },
                  }}
                  popup={true}
                  popupOffset={{ x: 10, y: 10 }}
                />
              </div>
            </DndProvider>
          </div>
          
          {/* Legend - Enhanced Design with Interactive Info */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2.5 group">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-green-500 to-green-600 shadow-sm group-hover:shadow-md transition-shadow"></div>
                  <span className="text-sm font-medium text-gray-700">Confirmed</span>
                </div>
                <div className="flex items-center gap-2.5 group">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-500 to-amber-600 shadow-sm group-hover:shadow-md transition-shadow"></div>
                  <span className="text-sm font-medium text-gray-700">Pending</span>
                </div>
                <div className="flex items-center gap-2.5 group">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm group-hover:shadow-md transition-shadow"></div>
                  <span className="text-sm font-medium text-gray-700">Other</span>
                </div>
                <div className="flex items-center gap-2.5 group">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-red-500 to-red-600 shadow-sm group-hover:shadow-md transition-shadow"></div>
                  <span className="text-sm font-medium text-gray-700">Cancelled</span>
                </div>
                <div className="flex items-center gap-2.5 group">
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-gray-500 to-gray-600 shadow-sm group-hover:shadow-md transition-shadow"></div>
                  <span className="text-sm font-medium text-gray-700">Completed</span>
                </div>
              </div>
              {filteredBookings.length === 0 && bookings.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md border border-amber-200">
                  <Info className="h-4 w-4" />
                  <span>No {statusFilter?.toLowerCase()} bookings found. Try a different filter.</span>
                </div>
              )}
              {bookings.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Sparkles className="h-4 w-4" />
                  <span>No bookings yet. Create your first booking to get started!</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Bookings Modal */}
      <Modal
        open={!!selectedDate}
        onOpenChange={(open) => !open && setSelectedDate(null)}
        title={`Bookings for ${selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}`}
        description="View all bookings scheduled for this date"
        size="2xl"
      >
        {loadingDateBookings ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : dateBookings.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-base font-medium">No bookings scheduled</p>
            <p className="text-sm mt-1">This date has no bookings yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {dateBookings.map((booking: any) => (
              <Card key={booking.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge
                            variant={
                              booking.status === "CONFIRMED"
                                ? "default"
                                : booking.status === "PENDING"
                                ? "secondary"
                                : booking.status === "CANCELLED"
                                ? "destructive"
                                : "outline"
                            }
                            className="text-xs"
                          >
                            {booking.status}
                          </Badge>
                          <h3 className="font-semibold text-base">{booking.service?.name || "Service"}</h3>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="font-medium text-foreground">{booking.customerName}</p>
                          <p>{booking.customerEmail}</p>
                          {booking.customerPhone && <p>{booking.customerPhone}</p>}
                          <p className="pt-2">
                            {format(new Date(booking.startTime), "h:mm a")} - {format(new Date(booking.endTime), "h:mm a")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedDate(null);
                          handleSelectEvent({
                            id: booking.id,
                            title: `${booking.service?.name || "Service"} - ${booking.customerName}`,
                            start: new Date(booking.startTime),
                            end: new Date(booking.endTime),
                            resource: {
                              bookingId: booking.id,
                              serviceName: booking.service?.name || "Service",
                              customerName: booking.customerName,
                              status: booking.status,
                            },
                          } as BookingEvent);
                        }}
                      >
                        View Details
                      </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </Modal>

      {/* Booking Details Modal */}
      <Modal
        open={!!selectedBooking}
        onOpenChange={(open) => !open && setSelectedBooking(null)}
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
                    setPendingAction("CANCELLED");
                    setActionDialogOpen(true);
                  }}
                  disabled={updating}
                  className="min-w-[120px] border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </ModalButton>
                <ModalButton
                  variant="default"
                  onClick={() => {
                    setPendingAction("CONFIRMED");
                    setActionDialogOpen(true);
                  }}
                  disabled={updating}
                  className="min-w-[140px] shadow-sm"
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
                    setPendingAction("CANCELLED");
                    setActionDialogOpen(true);
                  }}
                  disabled={updating}
                  className="min-w-[120px] border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </ModalButton>
                <ModalButton
                  variant="default"
                  onClick={() => {
                    setPendingAction("COMPLETED");
                    setActionDialogOpen(true);
                  }}
                  disabled={updating}
                  className="min-w-[140px] shadow-sm"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Complete
                </ModalButton>
              </>
            )}
            {bookingDetails?.status === "CANCELLED" && (
              <ModalButton
                variant="default"
                onClick={handleCreateNewBooking}
                className="min-w-[180px] shadow-sm"
              >
                <CalendarPlus className="mr-2 h-4 w-4" />
                Create New Booking
              </ModalButton>
            )}
            {bookingDetails?.status === "COMPLETED" && (
              <div className="text-sm text-gray-500 italic">
                This booking has been completed
              </div>
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

      {/* Action Confirmation Modal */}
      <Modal
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
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
        size="md"
        footer={
          <ModalFooter>
            <ModalButton
              variant="outline"
              onClick={() => {
                setActionDialogOpen(false);
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
        {bookingDetails && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 mt-0.5 flex-shrink-0">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Customer
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {bookingDetails.customerName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bookingDetails.customerEmail}
                  </p>
                </div>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 mt-0.5 flex-shrink-0">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Service & Time
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {bookingDetails.service?.name || "Service"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(bookingDetails.startTime), "MMM d, yyyy 'at' h:mm a")}
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
