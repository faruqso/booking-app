import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        // Label-only: soft, non-button-like so they don't compete with action buttons
        statusConfirmed: "border-blue-200 bg-blue-50 text-blue-700 font-normal",
        statusPending: "border-amber-200 bg-amber-50 text-amber-700 font-normal",
        statusCompleted: "border-gray-200 bg-gray-50 text-gray-600 font-normal",
        statusCancelled: "border-red-200 bg-red-50 text-red-700 font-normal",
        paymentPaid: "border-emerald-200 bg-emerald-50 text-emerald-700 font-normal",
        paymentPending: "border-gray-200 bg-gray-100 text-gray-600 font-normal",
        paymentProcessing: "border-amber-200 bg-amber-50 text-amber-700 font-normal",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
