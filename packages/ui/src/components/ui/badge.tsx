import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@code-notes/ui/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-2 font-semibold border-2 shadow-[var(--shadow-clay-sm)] transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-secondary)] text-[var(--color-text-primary)] border-[var(--color-secondary-light)]",
        status: "border-2", // For ProgressBadge with dynamic colors
        accent:
          "bg-[var(--color-accent)] text-white border-[var(--color-accent-dark)]",
        secondary:
          "bg-[var(--color-secondary)] text-[var(--color-primary-dark)] border-[var(--color-secondary-dark)]",
        outline:
          "bg-transparent text-[var(--color-text-primary)] border-[var(--color-border)]",
      },
      size: {
        default: "px-3 py-1.5 text-sm rounded-[var(--radius-md)]",
        compact: "px-2 py-1 text-xs rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
