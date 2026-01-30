import { useEffect, type ReactNode } from "react";
import { ThemeToggle } from "@code-notes/ui/components";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;

    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  }, []);

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
