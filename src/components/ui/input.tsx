import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full bg-[var(--color-bg-card)]",
          "border-[3px] border-[var(--color-border)]",
          "rounded-[var(--radius-md)]",
          "px-4 py-3",
          "text-[var(--color-text-primary)]",
          "shadow-[var(--shadow-clay-sm)]",
          "transition-all duration-200",
          "focus-visible:outline-none focus-visible:border-[var(--color-primary)] focus-visible:shadow-[var(--shadow-clay-md)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "placeholder:text-[var(--color-text-muted)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
