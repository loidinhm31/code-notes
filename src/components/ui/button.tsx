import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-heading font-semibold transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-light)] text-white border-[3px] border-[var(--color-primary-dark)] shadow-[var(--shadow-clay-sm)] hover:shadow-[var(--shadow-clay-md)] hover:brightness-105 active:brightness-95",
        accent:
          "bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-light)] text-white border-[3px] border-[var(--color-accent-dark)] shadow-[var(--shadow-clay-sm)] hover:shadow-[var(--shadow-clay-md)] hover:brightness-105 active:brightness-95",
        secondary:
          "bg-gradient-to-br from-[var(--color-secondary)] to-[var(--color-secondary-light)] text-[var(--color-primary-dark)] border-[3px] border-[var(--color-secondary-dark)] shadow-[var(--shadow-clay-sm)] hover:shadow-[var(--shadow-clay-md)] hover:brightness-105 active:brightness-95",
        ghost:
          "bg-[var(--color-bg-muted)] text-[var(--color-text-muted)] border-2 border-[var(--color-border-light)] shadow-[var(--shadow-clay-sm)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-text-primary)]",
        destructive:
          "bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-accent-light)] text-white border-[3px] border-[var(--color-accent-dark)] shadow-[var(--shadow-clay-sm)] hover:shadow-[var(--shadow-clay-md)] hover:brightness-105 active:brightness-95",
        link: "text-[var(--color-primary)] underline-offset-4 hover:underline",
      },
      size: {
        default: "px-6 py-3 rounded-[var(--radius-md)]",
        sm: "px-4 py-2 text-sm rounded-[var(--radius-md)]",
        lg: "px-8 py-4 text-lg rounded-[var(--radius-lg)]",
        icon: "min-h-[44px] min-w-[44px] p-2 rounded-[var(--radius-md)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
