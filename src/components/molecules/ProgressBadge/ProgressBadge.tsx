import { Star } from "lucide-react";
import type { ProgressStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

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
    color: "#6B7280",
    bgColor: "rgba(107, 114, 128, 0.1)",
  },
  Studying: {
    label: "Studying",
    color: "#3B82F6",
    bgColor: "rgba(59, 130, 246, 0.1)",
  },
  Mastered: {
    label: "Mastered",
    color: "#10B981",
    bgColor: "rgba(16, 185, 129, 0.1)",
  },
  NeedsReview: {
    label: "Needs Review",
    color: "#F59E0B",
    bgColor: "rgba(245, 158, 11, 0.1)",
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
