"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Modal, ModalFooter, ModalButton } from "@/components/ui/modal";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Users, Loader2, Mail, UserPlus, Edit, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/ui/help-tooltip";

const staffSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(1, "Name is required"),
});

type StaffFormValues = z.infer<typeof staffSchema>;

interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  emailVerified: Date | null;
}

export default function StaffPage() {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const form = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  const editForm = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      email: "",
      name: "",
    },
  });

  useEffect(() => {
    if (status === "authenticated") {
      // Only business owners can access this page
      if (session?.user?.role !== "BUSINESS_OWNER") {
        window.location.href = "/dashboard";
        return;
      }
      fetchStaff();
    } else if (status === "unauthenticated") {
      window.location.href = "/auth/signin";
    }
  }, [status, session]);

  const fetchStaff = async () => {
    try {
      const response = await fetch("/api/staff");
      if (response.ok) {
        const data = await response.json();
        setStaff(data.staff || []);
      } else if (response.status === 403) {
        toast({
          title: "Access Denied",
          description: "Only business owners can manage staff",
          variant: "destructive",
        });
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.error("Failed to fetch staff:", error);
      toast({
        title: "Error",
        description: "Failed to load staff",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resendInvitation = async (staffId: string) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/staff/${staffId}/resend-invitation`, {
        method: "POST",
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Invitation email has been resent successfully.",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to resend invitation");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend invitation",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onSubmit = async (data: StaffFormValues) => {
    setSaving(true);
    try {
      const response = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchStaff();
        setDialogOpen(false);
        form.reset();
        toast({
          title: "Success",
          description: "Staff member invited successfully. They will receive an email to set their password.",
        });
      } else {
        const errorData = await response.json();
        const errorCode = errorData.code;
        const canResend = errorData.canResend;
        
        // Handle different error cases with helpful messages
        let errorMessage = errorData.error || "Failed to invite staff";
        let tipMessage = null;

        if (errorCode === "ALREADY_STAFF") {
          if (canResend) {
            // Find the pending staff member to offer resend
            const pendingStaff = staff.find(
              (s) => s.email.toLowerCase() === data.email.toLowerCase() && !s.emailVerified
            );
            if (pendingStaff) {
              errorMessage = "An invitation has already been sent to this email.";
              tipMessage = "You can resend the invitation from the staff list using the 'Resend' button.";
            }
          } else {
            errorMessage = "This person is already a verified staff member of your business.";
          }
        } else if (errorCode === "STAFF_OTHER_BUSINESS") {
          errorMessage = "This email is already associated with another business as a staff member.";
        } else if (errorCode === "BUSINESS_OWNER") {
          errorMessage = "This email is already registered as a business owner.";
        }

        // Show error toast first (will appear on top)
        toast({
          title: "Cannot Send Invitation",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });

        // Show tip second (will appear below error)
        if (tipMessage) {
          // Small delay to ensure proper stacking - tip appears below error
          setTimeout(() => {
            toast({
              title: "Tip",
              description: tipMessage,
              duration: 5000,
            });
          }, 100);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to invite staff",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onEditSubmit = async (data: StaffFormValues) => {
    if (!selectedStaff) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/staff/${selectedStaff.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await fetchStaff();
        setEditDialogOpen(false);
        setSelectedStaff(null);
        editForm.reset();
        toast({
          title: "Success",
          description: "Staff member updated successfully",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to update staff");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update staff",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (staffMember: StaffMember) => {
    setSelectedStaff(staffMember);
    editForm.reset({
      email: staffMember.email,
      name: staffMember.name || "",
    });
    setEditDialogOpen(true);
  };

  const handleDelete = async (staffId: string) => {
    if (!confirm("Are you sure you want to remove this staff member? They will no longer have access to the dashboard.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/staff/${staffId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchStaff();
        toast({
          title: "Success",
          description: "Staff member removed successfully",
        });
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove staff");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove staff",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
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
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
            <HelpTooltip content="Invite and manage staff members who can help you manage bookings and services." />
          </div>
          <p className="text-muted-foreground">
            Invite staff members to help manage your business
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Staff
        </Button>
      </div>

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Members</CardTitle>
          <CardDescription>
            Manage staff access to your business dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No staff members</h3>
              <p className="text-muted-foreground mb-4">
                Invite staff members to help manage your business
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Staff
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((staffMember) => (
                    <TableRow key={staffMember.id}>
                      <TableCell className="font-medium">
                        {staffMember.name || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {staffMember.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        {staffMember.emailVerified ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Verified
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                            <XCircle className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(staffMember.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!staffMember.emailVerified && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => resendInvitation(staffMember.id)}
                              disabled={saving}
                              title="Resend invitation email"
                            >
                              <Mail className="h-4 w-4 mr-1" />
                              Resend
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(staffMember)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(staffMember.id)}
                            disabled={deleting || staffMember.id === session?.user?.id}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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

      {/* Invite Staff Modal */}
      <Modal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Invite Staff Member"
        description="Send an invitation to a new staff member. They will receive an email to set their password."
        size="md"
        footer={
          <ModalFooter>
            <ModalButton variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </ModalButton>
            <Button
              type="submit"
              form="invite-staff-form"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inviting...
                </>
              ) : (
                "Send Invitation"
              )}
            </Button>
          </ModalFooter>
        }
      >
        <Form {...form}>
          <form id="invite-staff-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </Modal>

      {/* Edit Staff Modal */}
      <Modal
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="Edit Staff Member"
        description="Update staff member information"
        size="md"
        footer={
          <ModalFooter>
            <ModalButton variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
              Cancel
            </ModalButton>
            <Button
              type="submit"
              form="edit-staff-form"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </ModalFooter>
        }
      >
        <Form {...editForm}>
          <form id="edit-staff-form" onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
            <FormField
              control={editForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={editForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="john@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </Modal>
    </div>
  );
}

