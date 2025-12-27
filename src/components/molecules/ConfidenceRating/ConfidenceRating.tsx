import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfidenceRatingProps {
  value: number; // 0-5
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

export const ConfidenceRating = ({
  value,
  onChange,
  readonly = false,
  size = "md",
}: ConfidenceRatingProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const iconSize = sizeClasses[size];

  const handleClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const rating = i + 1;
        const isFilled = rating <= value;

        return (
          <Button
            key={i}
            variant="ghost"
            size="icon"
            onClick={() => handleClick(rating)}
            disabled={readonly}
            className={`p-1 h-auto border-0 shadow-none ${
              !readonly ? "hover:scale-110" : ""
            }`}
            aria-label={`${rating} star${rating > 1 ? "s" : ""}`}
          >
            <Star
              className={iconSize}
              style={{
                fill: isFilled ? "var(--color-primary)" : "transparent",
                color: isFilled
                  ? "var(--color-primary)"
                  : "var(--color-text-muted)",
                transition: "all 0.2s",
              }}
            />
          </Button>
        );
      })}
      {value > 0 && (
        <span className="ml-2 text-sm font-medium text-[var(--color-text-secondary)]">
          {value}/5
        </span>
      )}
    </div>
  );
};
