"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Calendar, momentLocalizer, View, Event } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const localizer = momentLocalizer(moment);

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
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingEvent[]>([]);
  const [currentView, setCurrentView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      fetchBookings();
    }
  }, [status, router, currentDate]);

  const fetchBookings = async () => {
    try {
      const response = await fetch("/api/bookings");
      if (response.ok) {
        const data = await response.json();
        const events: BookingEvent[] = data.map((booking: any) => ({
          id: booking.id,
          title: `${booking.serviceName} - ${booking.customerName}`,
          start: new Date(booking.startTime),
          end: new Date(booking.endTime),
          resource: {
            bookingId: booking.id,
            serviceName: booking.serviceName,
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

  const handleSelectEvent = (event: BookingEvent) => {
    router.push(`/dashboard/bookings/${event.resource.bookingId}`);
  };

  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
  };

  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  const eventStyleGetter = (event: BookingEvent) => {
    let backgroundColor = "#3b82f6"; // Default blue
    let borderColor = "#2563eb";

    switch (event.resource.status) {
      case "CONFIRMED":
        backgroundColor = "#10b981"; // Green
        borderColor = "#059669";
        break;
      case "PENDING":
        backgroundColor = "#f59e0b"; // Amber
        borderColor = "#d97706";
        break;
      case "CANCELLED":
        backgroundColor = "#ef4444"; // Red
        borderColor = "#dc2626";
        break;
      case "COMPLETED":
        backgroundColor = "#6b7280"; // Gray
        borderColor = "#4b5563";
        break;
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: "#fff",
        border: `1px solid ${borderColor}`,
        borderRadius: "4px",
        padding: "2px 4px",
        fontSize: "0.875rem",
      },
    };
  };

  const CustomToolbar = ({ label, onNavigate, onView }: any) => {
    return (
      <div className="flex items-center justify-between mb-4 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("PREV")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("TODAY")}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate("NEXT")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-semibold ml-4">{label}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={currentView}
            onValueChange={(value) => handleViewChange(value as View)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Month</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="agenda">Agenda</SelectItem>
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
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
        </div>
        <p className="text-muted-foreground">
          View and manage your bookings in calendar format
        </p>
      </div>

      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            <CardTitle>Booking Calendar</CardTitle>
          </div>
          <CardDescription>
            Click on any booking to view details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]">
            <Calendar
              localizer={localizer}
              events={bookings}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              view={currentView}
              onView={handleViewChange}
              date={currentDate}
              onNavigate={handleNavigate}
              onSelectEvent={handleSelectEvent}
              eventPropGetter={eventStyleGetter}
              components={{
                toolbar: CustomToolbar,
              }}
            />
          </div>
          
          {/* Legend */}
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm">Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500"></div>
              <span className="text-sm">Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm">Other</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm">Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-500"></div>
              <span className="text-sm">Completed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
