"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal, ModalFooter, ModalButton } from "@/components/ui/modal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ServiceForm } from "@/components/services/service-form";
import { Plus, Clock, DollarSign, Sparkles, Loader2, MapPin, Eye, Edit, Trash2, Tag, Users, Timer, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { format } from "date-fns";

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  locationId?: string | null;
  location?: { id: string; name: string } | null;
  isActive: boolean;
  bufferTimeBefore?: number;
  bufferTimeAfter?: number;
  imageUrl?: string;
  category?: string;
  maxCapacity?: number;
  createdAt: string;
  updatedAt?: string;
}

export default function ServicesPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();
  const [viewingService, setViewingService] = useState<Service | null>(null);
  const [deletingService, setDeletingService] = useState<Service | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (status === "authenticated") {
      fetchServices();
    } else if (status === "unauthenticated") {
      window.location.href = "/auth/signin";
    }
  }, [status]);

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services");
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error("Failed to fetch services:", error);
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingService) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/services/${deletingService.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Service deleted successfully",
        });
        fetchServices();
        setDeleteDialogOpen(false);
        setDeletingService(null);
      } else {
        toast({
          title: "Error",
          description: "Failed to delete service",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to delete service:", error);
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleView = (service: Service) => {
    setViewingService(service);
    setViewDialogOpen(true);
  };

  const handleEdit = (service: Service, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card click from triggering
    setEditingService(service);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingService(undefined);
    setDialogOpen(true);
  };

  const handleFormSuccess = () => {
    setDialogOpen(false);
    setEditingService(undefined);
    setFormSubmitting(false);
    fetchServices();
  };

  const handleFormCancel = () => {
    setDialogOpen(false);
    setEditingService(undefined);
    setFormSubmitting(false);
  };

  const handleFormSubmit = () => {
    if ((window as any).__serviceFormSubmit) {
      setFormSubmitting(true);
      (window as any).__serviceFormSubmit();
    }
  };

  // Listen for form submission state changes
  useEffect(() => {
    if (dialogOpen) {
      (window as any).__serviceFormSetSubmitting = (value: boolean) => {
        setFormSubmitting(value);
      };
    }
    return () => {
      if ((window as any).__serviceFormSetSubmitting) {
        delete (window as any).__serviceFormSetSubmitting;
      }
    };
  }, [dialogOpen]);

  const openDeleteDialog = (service: Service, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card click from triggering
    setDeletingService(service);
    setDeleteDialogOpen(true);
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
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeServices = services.filter((s) => s.isActive).length;
  // Average Price: Sum of all service prices divided by total number of services
  const totalPriceSum = services.reduce((sum, s) => sum + Number(s.price), 0);
  const averagePrice = services.length > 0 ? totalPriceSum / services.length : 0;

  return (
    <>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">Services</h1>
              <HelpTooltip content="Create services that customers can book. Each service needs a name, duration, and price. Services can be activated or deactivated at any time." />
            </div>
            <p className="text-muted-foreground">
              Manage your service offerings
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        </div>

        {/* Stats Cards */}
        {services.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Services
                </CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{services.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeServices} active
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Services
                </CardTitle>
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeServices}</div>
                <p className="text-xs text-muted-foreground">
                  Available for booking
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Price
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${averagePrice.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average price across all services
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Services List */}
        {services.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No services yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first service to start accepting bookings
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Service
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {services.map((service) => (
              <Card 
                key={service.id} 
                className="hover:shadow-lg hover:border-primary/20 transition-all duration-200 cursor-pointer"
                onClick={() => handleView(service)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{service.name}</CardTitle>
                        {!service.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {service.category && (
                          <Badge variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {service.category}
                          </Badge>
                        )}
                      </div>
                      {service.description && (
                        <CardDescription>{service.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleEdit(service, e)}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => openDeleteDialog(service, e)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {service.duration} minutes
                    </span>
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      ${Number(service.price).toFixed(2)}
                    </span>
                    {service.maxCapacity && service.maxCapacity > 1 && (
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        Up to {service.maxCapacity} people
                      </span>
                    )}
                    {service.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        {service.location.name}
                      </span>
                    )}
                    {!service.location && service.locationId === null && (
                      <span className="flex items-center gap-1.5 text-xs">
                        <MapPin className="h-4 w-4" />
                        All Locations
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Modal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingService ? "Edit Service" : "Create New Service"}
        description={
          editingService
                  ? "Update your service details below"
            : "Add a new service that customers can book"
        }
        size="full"
        footer={
          <ModalFooter>
            <ModalButton
              variant="outline"
              onClick={handleFormCancel}
              disabled={formSubmitting}
            >
              Cancel
            </ModalButton>
            <ModalButton
              onClick={handleFormSubmit}
              loading={formSubmitting}
            >
              {editingService ? "Update Service" : "Create Service"}
            </ModalButton>
          </ModalFooter>
        }
      >
        <ServiceForm
          service={editingService}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
          hideActions={true}
        />
      </Modal>

      {/* View Service Details Modal */}
      <Modal
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        title="Service Details"
        description="View complete service information"
        size="lg"
        footer={
          <ModalFooter>
            <ModalButton
              variant="outline"
              onClick={() => {
                setViewDialogOpen(false);
                if (viewingService) {
                  handleEdit(viewingService);
                }
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Service
            </ModalButton>
            <ModalButton
              onClick={() => {
                setViewDialogOpen(false);
              }}
            >
              Close
            </ModalButton>
          </ModalFooter>
        }
      >
        {viewingService && (
          <div className="space-y-6">
            {/* Service Image */}
            {viewingService.imageUrl && (
              <div className="w-full h-64 rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50">
                <img
                  src={viewingService.imageUrl}
                  alt={viewingService.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Status Badge */}
            <div className="flex justify-start">
              <Badge variant={viewingService.isActive ? "default" : "secondary"}>
                {viewingService.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Service Name</p>
                  <p className="text-base font-semibold text-foreground">{viewingService.name}</p>
                </div>
                {viewingService.category && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</p>
                    <p className="text-base text-foreground">{viewingService.category}</p>
                  </div>
                )}
                {viewingService.description && (
                  <div className="space-y-1 md:col-span-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                    <p className="text-base text-foreground whitespace-pre-wrap">{viewingService.description}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Service Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Service Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Duration
                  </p>
                  <p className="text-base font-semibold text-foreground">{viewingService.duration} minutes</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <DollarSign className="h-3 w-3" />
                    Price
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    ${Number(viewingService.price).toFixed(2)}
                  </p>
                </div>
                {viewingService.maxCapacity && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Users className="h-3 w-3" />
                      Max Capacity
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {viewingService.maxCapacity} {viewingService.maxCapacity === 1 ? "person" : "people"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Buffer Time */}
            {(viewingService.bufferTimeBefore || viewingService.bufferTimeAfter) && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Buffer Time</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingService.bufferTimeBefore && viewingService.bufferTimeBefore > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Timer className="h-3 w-3" />
                          Before Service
                        </p>
                        <p className="text-base text-foreground">{viewingService.bufferTimeBefore} minutes</p>
                      </div>
                    )}
                    {viewingService.bufferTimeAfter && viewingService.bufferTimeAfter > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Timer className="h-3 w-3" />
                          After Service
                        </p>
                        <p className="text-base text-foreground">{viewingService.bufferTimeAfter} minutes</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Location */}
            <div className="h-px bg-border" />
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Location</h3>
              <div className="space-y-1">
                <p className="text-base text-foreground">
                  {viewingService.location ? viewingService.location.name : "All Locations"}
                </p>
              </div>
            </div>

            {/* Timestamps */}
            {viewingService.createdAt && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Metadata</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</p>
                      <p className="text-base text-foreground">
                        {format(new Date(viewingService.createdAt), "PPpp")}
                      </p>
                    </div>
                    {viewingService.updatedAt && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Updated</p>
                        <p className="text-base text-foreground">
                          {format(new Date(viewingService.updatedAt), "PPpp")}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deletingService?.name}&quot;. This
              action cannot be undone and will remove all associated booking
              history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
