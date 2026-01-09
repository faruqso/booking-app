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
import { Plus, Clock, DollarSign, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";

interface Service {
  id: string;
  name: string;
  description?: string;
  duration: number;
  price: number;
  isActive: boolean;
  createdAt: string;
}

export default function ServicesPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | undefined>();
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

  const handleEdit = (service: Service) => {
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

  const openDeleteDialog = (service: Service) => {
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
  const totalRevenue = services.reduce((sum, s) => sum + s.price, 0);

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
                  ${(totalRevenue / services.length || 0).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per service
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
              <Card key={service.id} className="hover:shadow-lg hover:border-primary/20 transition-all duration-200 cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle>{service.name}</CardTitle>
                        {!service.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      {service.description && (
                        <CardDescription>{service.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(service)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDeleteDialog(service)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      {service.duration} minutes
                    </span>
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="h-4 w-4" />
                      ${Number(service.price).toFixed(2)}
                    </span>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingService?.name}". This
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
