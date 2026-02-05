import { type ReactNode } from "react";
import { ThemeToggle } from "@code-notes/ui/components/atoms";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // Theme initialization is handled by ThemeProvider in CodeNotesApp

  return (
    <div className="min-h-screen-safe bg-background text-foreground">
      {/* Theme Toggle - Fixed Position */}
      <div
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          zIndex: 1000,
        }}
        className="safe-top safe-right"
      >
        <ThemeToggle />
      </div>

      <main id="main-content">{children}</main>
    </div>
  );
}
