import React from "react";

export const LoadingSpinner = React.memo(function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div
        className="w-8 h-8 border-4 rounded-full animate-spin"
        style={{
          borderColor: "var(--color-primary)",
          borderTopColor: "transparent",
        }}
      ></div>
    </div>
  );
});

LoadingSpinner.displayName = "LoadingSpinner";
