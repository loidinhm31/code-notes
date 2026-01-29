import * as React from "react";

import { cn } from "@code-notes/ui/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full bg-[var(--color-bg-card)]",
        "border-[3px] border-[var(--color-border)]",
        "rounded-[var(--radius-md)]",
        "px-4 py-3",
        "text-[var(--color-text-primary)]",
        "shadow-[var(--shadow-clay-sm)]",
        "transition-all duration-200",
        "focus-visible:outline-none focus-visible:border-[var(--color-primary)] focus-visible:shadow-[var(--shadow-clay-md)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "placeholder:text-[var(--color-text-muted)]",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
