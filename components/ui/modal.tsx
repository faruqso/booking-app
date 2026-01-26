"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  showCloseButton?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-5xl",
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  showCloseButton = true,
  className,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          sizeClasses[size],
          "max-h-[90vh] flex flex-col p-0 overflow-hidden bg-white",
          className
        )}
      >
        <DialogHeader className="sticky top-0 z-10 bg-white px-6 pt-6 pb-4 space-y-0 m-0">
          <div className={cn(showCloseButton && "pr-8")}>
            <DialogTitle className="text-xl font-bold leading-tight m-0 text-gray-900">{title}</DialogTitle>
            {description && (
              <DialogDescription className="mt-2 text-sm m-0 text-gray-600">
                {description}
              </DialogDescription>
            )}
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 m-0 px-6">
          <div className="py-6">{children}</div>
        </div>
        {footer && (
          <div className="sticky bottom-0 z-10 bg-white border-t border-gray-200 px-6 py-5">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalFooter({ children, className }: ModalFooterProps) {
  return (
    <div className={cn("flex items-center gap-2.5 flex-wrap", className)}>{children}</div>
  );
}

interface ModalButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  children: React.ReactNode;
  className?: string;
}

export function ModalButton({
  onClick,
  disabled,
  loading,
  variant = "default",
  children,
  className,
}: ModalButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}

interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  loading?: boolean;
  variant?: "default" | "destructive";
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export function ConfirmationModal({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  variant = "default",
  icon,
  children,
}: ConfirmationModalProps) {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="md"
    >
      {icon && <div className="mb-4">{icon}</div>}
      {children}
      <ModalFooter>
        <ModalButton variant="outline" onClick={handleCancel} disabled={loading}>
          {cancelText}
        </ModalButton>
        <ModalButton
          variant={variant}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmText}
        </ModalButton>
      </ModalFooter>
    </Modal>
  );
}

