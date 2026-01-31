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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Repeat, Plus, Edit, Trash2, Calendar, Clock, Loader2, User, MapPin, Settings, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Modal, ModalFooter, ModalButton } from "@/components/ui/modal";

interface RecurringBooking {
  id: string;
  businessId: string;
  locationId: string | null;
  serviceId: string;
  customerId: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  frequency: "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  startTime: string;
  startDate: string;
  endDate: string | null;
  numberOfOccurrences: number | null;
  isActive: boolean;
  lastGeneratedDate: string | null;
  notes: string | null;
  service: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
  location: {
    id: string;
    name: string;
  } | null;
  customer: {
    id: string;
    name: string;
    email: string;
  } | null;
  bookings: Array<{
    id: string;
    startTime: string;
    status: string;
  }>;
  _count: {
    bookings: number;
  };
}

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  locationId: string | null;
}

interface Location {
  id: string;
  name: string;
  isActive: boolean;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

/** Sentinel values for Select (Radix does not allow empty string) */
const ALL_LOCATIONS_VALUE = "__all_locations__";
const NEW_CUSTOMER_VALUE = "__new_customer__";

export default function RecurringBookingsPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [recurringBookings, setRecurringBookings] = useState<RecurringBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringBooking | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [generating, setGenerating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    locationId: "",
    serviceId: "",
    customerId: "",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    frequency: "WEEKLY" as "DAILY" | "WEEKLY" | "BIWEEKLY" | "MONTHLY",
    dayOfWeek: "",
    dayOfMonth: "",
    startTime: "",
    startDate: "",
    endDate: "",
    numberOfOccurrences: "",
    notes: "",
  });

  useEffect(() => {
    if (status === "authenticated") {
      fetchRecurringBookings();
      fetchServices();
      fetchLocations();
      fetchCustomers();
    } else if (status === "unauthenticated") {
      window.location.href = "/auth/signin";
    }
  }, [filter, status]);

  const fetchRecurringBookings = async () => {
    try {
      const url = filter === "all" 
        ? "/api/recurring-bookings?includeInactive=true"
        : "/api/recurring-bookings";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRecurringBookings(data);
      }
    } catch (error) {
      console.error("Failed to fetch recurring bookings:", error);
      toast({
        title: "Error",
        description: "Failed to load recurring bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services");
      if (response.ok) {
        const data = await response.json();
        setServices(data.filter((s: Service) => s.id));
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations");
      if (response.ok) {
        const data = await response.json();
        setLocations(data.filter((l: Location) => l.isActive));
      }
    } catch (error) {
      console.error("Failed to fetch locations:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers");
      if (response.ok) {
        const data = await response.json();
        // API returns { customers: [...], pagination: {...} }
        setCustomers(Array.isArray(data.customers) ? data.customers : []);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      setCustomers([]); // Ensure customers is always an array
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    if (customerId === NEW_CUSTOMER_VALUE) {
      setFormData({ ...formData, customerId: "" });
      return;
    }
    const customer = customers.find((c) => c.id === customerId);
    if (customer) {
      setFormData({
        ...formData,
        customerId,
        customerName: customer.name,
        customerEmail: customer.email,
      });
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setFormData({ ...formData, serviceId });
  };

  const handleLocationSelect = (locationId: string) => {
    setFormData({
      ...formData,
      locationId: locationId === ALL_LOCATIONS_VALUE ? "" : locationId,
    });
  };

  const handleOpenDialog = (recurring?: RecurringBooking) => {
    if (recurring) {
      setSelectedRecurring(recurring);
      setFormData({
        locationId: recurring.locationId || "",
        serviceId: recurring.serviceId,
        customerId: recurring.customerId || "",
        customerName: recurring.customerName,
        customerEmail: recurring.customerEmail,
        customerPhone: recurring.customerPhone || "",
        frequency: recurring.frequency,
        dayOfWeek: recurring.dayOfWeek?.toString() || "",
        dayOfMonth: recurring.dayOfMonth?.toString() || "",
        startTime: recurring.startTime,
        startDate: format(new Date(recurring.startDate), "yyyy-MM-dd"),
        endDate: recurring.endDate ? format(new Date(recurring.endDate), "yyyy-MM-dd") : "",
        numberOfOccurrences: recurring.numberOfOccurrences?.toString() || "",
        notes: recurring.notes || "",
      });
    } else {
      setSelectedRecurring(null);
      setFormData({
        locationId: "",
        serviceId: "",
        customerId: "",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        frequency: "WEEKLY",
        dayOfWeek: "",
        dayOfMonth: "",
        startTime: "",
        startDate: "",
        endDate: "",
        numberOfOccurrences: "",
        notes: "",
      });
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);

    try {
      const businessId = session?.user?.businessId;
      if (!businessId) {
        toast({
          title: "Error",
          description: "No business found",
          variant: "destructive",
        });
        return;
      }

      const payload: any = {
        businessId,
        locationId: formData.locationId || null,
        serviceId: formData.serviceId,
        customerId: formData.customerId || null,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone || null,
        frequency: formData.frequency,
        startTime: formData.startTime,
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        numberOfOccurrences: formData.numberOfOccurrences ? parseInt(formData.numberOfOccurrences) : null,
        notes: formData.notes || null,
      };

      // Add frequency-specific fields
      if (formData.frequency === "WEEKLY" || formData.frequency === "BIWEEKLY") {
        payload.dayOfWeek = formData.dayOfWeek ? parseInt(formData.dayOfWeek) : null;
      }

      if (formData.frequency === "MONTHLY") {
        payload.dayOfMonth = formData.dayOfMonth ? parseInt(formData.dayOfMonth) : null;
      }

      const url = selectedRecurring
        ? `/api/recurring-bookings/${selectedRecurring.id}`
        : "/api/recurring-bookings";
      const method = selectedRecurring ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: selectedRecurring
            ? "Recurring booking updated successfully"
            : "Recurring booking created successfully",
        });
        setDialogOpen(false);
        fetchRecurringBookings();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save recurring booking",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to save recurring booking:", error);
      toast({
        title: "Error",
        description: "Failed to save recurring booking",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/recurring-bookings/${pendingDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Recurring booking cancelled successfully",
        });
        setDeleteDialogOpen(false);
        setPendingDelete(null);
        fetchRecurringBookings();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to cancel recurring booking",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete recurring booking:", error);
      toast({
        title: "Error",
        description: "Failed to cancel recurring booking",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateBookings = async (recurringId?: string) => {
    setGenerating(true);
    try {
      const response = await fetch("/api/recurring-bookings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recurringId: recurringId || null,
          upToDate: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Success",
          description: result.message || "Bookings generated successfully",
        });
        fetchRecurringBookings();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to generate bookings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to generate bookings:", error);
      toast({
        title: "Error",
        description: "Failed to generate bookings",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const getFrequencyLabel = (recurring: RecurringBooking) => {
    switch (recurring.frequency) {
      case "DAILY":
        return "Daily";
      case "WEEKLY":
        return recurring.dayOfWeek !== null
          ? `Every ${DAYS_OF_WEEK[recurring.dayOfWeek].label}`
          : "Weekly";
      case "BIWEEKLY":
        return recurring.dayOfWeek !== null
          ? `Every other ${DAYS_OF_WEEK[recurring.dayOfWeek].label}`
          : "Bi-weekly";
      case "MONTHLY":
        return recurring.dayOfMonth !== null
          ? `Monthly on day ${recurring.dayOfMonth}`
          : "Monthly";
      default:
        return recurring.frequency;
    }
  };

  const getNextBookingDate = (recurring: RecurringBooking) => {
    // This is a simplified calculation - in production, you'd calculate the actual next date
    if (recurring.bookings && recurring.bookings.length > 0) {
      const lastBooking = recurring.bookings[0];
      return format(new Date(lastBooking.startTime), "MMM dd, yyyy");
    }
    return format(new Date(recurring.startDate), "MMM dd, yyyy");
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recurring Bookings</h1>
          <p className="text-muted-foreground mt-1">
            Manage subscription-style recurring appointments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleGenerateBookings()}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Generate Bookings
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Create Recurring Booking
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recurring Series</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {recurringBookings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recurring bookings found</p>
              <Button onClick={() => handleOpenDialog()} className="mt-4">
                Create your first recurring booking
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Pattern</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringBookings.map((recurring) => (
                  <TableRow key={recurring.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{recurring.customerName}</div>
                        <div className="text-sm text-muted-foreground">
                          {recurring.customerEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{recurring.service.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {recurring.service.duration} min
                      </div>
                    </TableCell>
                    <TableCell>
                      {recurring.location ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {recurring.location.name}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">All Locations</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{getFrequencyLabel(recurring)}</div>
                      <div className="text-sm text-muted-foreground">
                        Starts {format(new Date(recurring.startDate), "MMM dd, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {recurring.startTime}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {recurring._count.bookings} created
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={recurring.isActive ? "default" : "secondary"}>
                        {recurring.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {recurring.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleGenerateBookings(recurring.id)}
                            disabled={generating}
                            title="Generate bookings for this series"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(recurring)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPendingDelete(recurring.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={selectedRecurring ? "Edit Recurring Booking" : "Create Recurring Booking"}
        description="Set up a recurring booking series that will automatically generate appointments"
        size="2xl"
        footer={
          <ModalFooter>
            <ModalButton variant="outline" onClick={() => setDialogOpen(false)} disabled={updating}>
              Cancel
            </ModalButton>
            <Button
              type="submit"
              form="recurring-booking-form"
              disabled={updating}
            >
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedRecurring ? "Update" : "Create"}
            </Button>
          </ModalFooter>
        }
      >
        <form id="recurring-booking-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceId">Service *</Label>
                <Select
                  value={formData.serviceId || undefined}
                  onValueChange={handleServiceSelect}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} ({service.duration} min - ${service.price})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationId">Location</Label>
                <Select
                  value={formData.locationId || ALL_LOCATIONS_VALUE}
                  onValueChange={handleLocationSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_LOCATIONS_VALUE}>All Locations</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerId">Customer</Label>
              <Select
                value={formData.customerId || NEW_CUSTOMER_VALUE}
                onValueChange={handleCustomerSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select customer or enter new" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW_CUSTOMER_VALUE}>New Customer</SelectItem>
                  {Array.isArray(customers) && customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} ({customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerEmail">Customer Email *</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, customerEmail: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone">Customer Phone</Label>
              <Input
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) =>
                  setFormData({ ...formData, customerPhone: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, frequency: value, dayOfWeek: "", dayOfMonth: "" })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="BIWEEKLY">Bi-weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {(formData.frequency === "WEEKLY" || formData.frequency === "BIWEEKLY") && (
              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Day of Week *</Label>
                <Select
                  value={formData.dayOfWeek || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, dayOfWeek: value ?? "" })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.frequency === "MONTHLY" && (
              <div className="space-y-2">
                <Label htmlFor="dayOfMonth">Day of Month *</Label>
                <Input
                  id="dayOfMonth"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dayOfMonth}
                  onChange={(e) =>
                    setFormData({ ...formData, dayOfMonth: e.target.value })
                  }
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfOccurrences">Number of Occurrences (Optional)</Label>
              <Input
                id="numberOfOccurrences"
                type="number"
                min="1"
                value={formData.numberOfOccurrences}
                onChange={(e) =>
                  setFormData({ ...formData, numberOfOccurrences: e.target.value })
                }
                placeholder="Leave empty for unlimited"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogOpen(false);
            setPendingDelete(null);
          }
        }}
        title="Cancel Recurring Booking"
        description="Are you sure you want to cancel this recurring booking series? This will stop generating new bookings, but existing bookings will remain."
      >
        <ModalFooter>
          <ModalButton
            variant="outline"
            onClick={() => {
              setDeleteDialogOpen(false);
              setPendingDelete(null);
            }}
          >
            Cancel
          </ModalButton>
          <ModalButton
            variant="destructive"
            onClick={handleDelete}
            disabled={updating}
          >
            {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Cancel Series
          </ModalButton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
