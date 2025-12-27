import { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 safe-area-inset">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative clay-card w-full max-w-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--color-bg-card)",
          boxShadow: "var(--shadow-clay-lg)",
          maxHeight:
            "calc(90vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-6"
          style={{ borderBottom: "3px solid var(--color-border-light)" }}
        >
          <h2
            className="text-2xl font-bold"
            style={{ color: "var(--color-primary)" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 transition-all duration-200"
            style={{
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-bg-muted)",
              color: "var(--color-text-muted)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-accent)";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--color-bg-muted)";
              e.currentTarget.style.color = "var(--color-text-muted)";
            }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div
          className="p-6 overflow-y-auto"
          style={{
            maxHeight:
              "calc(90vh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 140px)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
