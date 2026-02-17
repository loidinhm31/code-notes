import { Star } from "lucide-react";
import type { ProgressStatus } from "@code-notes/shared";
import { Badge } from "@code-notes/ui/components/atoms";

interface ProgressBadgeProps {
  status: ProgressStatus;
  confidenceLevel?: number;
  compact?: boolean;
}

const STATUS_CONFIG: Record<
  ProgressStatus,
  { label: string; color: string; bgColor: string }
> = {
  NotStudied: {
    label: "Not Studied",
    color: "var(--color-text-muted)",
    bgColor: "var(--color-bg-muted)",
  },
  Studying: {
    label: "Studying",
    color: "var(--color-primary-light)",
    bgColor: "var(--color-bg-muted)",
  },
  Mastered: {
    label: "Mastered",
    color: "var(--color-success)",
    bgColor: "var(--color-bg-muted)",
  },
  NeedsReview: {
    label: "Needs Review",
    color: "var(--color-accent)",
    bgColor: "var(--color-bg-muted)",
  },
};

export const ProgressBadge = ({
  status,
  confidenceLevel,
  compact = false,
}: ProgressBadgeProps) => {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant="status"
      size={compact ? "compact" : "default"}
      style={{
        backgroundColor: config.bgColor,
        borderColor: config.color,
        color: config.color,
      }}
    >
      <div
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      <span className="font-medium">{config.label}</span>
      {confidenceLevel !== undefined && confidenceLevel > 0 && (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className={compact ? "w-3 h-3" : "w-4 h-4"}
              style={{
                fill: i < confidenceLevel ? config.color : "transparent",
                color: config.color,
              }}
            />
          ))}
        </div>
      )}
    </Badge>
  );
};
