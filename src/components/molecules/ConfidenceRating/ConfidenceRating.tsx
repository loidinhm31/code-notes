import { Star } from "lucide-react";

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
          <button
            key={i}
            onClick={() => handleClick(rating)}
            disabled={readonly}
            className={`transition-all duration-200 ${
              !readonly ? "cursor-pointer hover:scale-110" : "cursor-default"
            }`}
            style={{
              opacity: readonly ? 1 : 0.8,
            }}
            onMouseEnter={(e) => {
              if (!readonly) {
                e.currentTarget.style.opacity = "1";
              }
            }}
            onMouseLeave={(e) => {
              if (!readonly) {
                e.currentTarget.style.opacity = "0.8";
              }
            }}
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
          </button>
        );
      })}
      {value > 0 && (
        <span
          className="ml-2 text-sm font-medium"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {value}/5
        </span>
      )}
    </div>
  );
};
