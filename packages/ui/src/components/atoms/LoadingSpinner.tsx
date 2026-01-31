import React from "react";

export const LoadingSpinner = React.memo(function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
});

LoadingSpinner.displayName = "LoadingSpinner";
