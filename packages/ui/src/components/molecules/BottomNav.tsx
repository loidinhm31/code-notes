import { useState, useRef, useEffect } from "react";
import {
  BookOpen,
  Brain,
  ChartBar,
  Menu,
  X,
  Upload,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "@code-notes/ui/contexts";

type Page = "topics" | "quiz" | "progress" | "import" | "settings";

interface BottomNavProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      // Use 'click' instead of 'mousedown' to allow menu item clicks to complete first
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Main nav items shown directly in bottom nav
  const mainNavItems: {
    id: Page;
    label: string;
    icon: typeof BookOpen;
  }[] = [
    {
      id: "topics",
      label: "Topics",
      icon: BookOpen,
    },
    {
      id: "quiz",
      label: "Quiz",
      icon: Brain,
    },
    {
      id: "progress",
      label: "Progress",
      icon: ChartBar,
    },
  ];

  // Overflow items shown in hamburger menu
  const menuItems: {
    id: Page;
    label: string;
    icon: typeof Upload;
  }[] = [
    {
      id: "import",
      label: "Import",
      icon: Upload,
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  const isMenuItemActive = menuItems.some((item) => item.id === currentPage);

  return (
    <div ref={menuRef} className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Overflow Menu Popup */}
      {isMenuOpen && (
        <div
          className="absolute bottom-full right-4 mb-2 min-w-[180px] py-2"
          style={{
            background: "var(--color-bg-card)",
            borderRadius: "var(--radius-lg)",
            border: "3px solid var(--color-border-light)",
            boxShadow: "var(--shadow-clay-lg)",
          }}
        >
          {menuItems.map(({ id, label, icon: Icon }) => {
            const isActive = currentPage === id;
            return (
              <button
                key={id}
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate(id);
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 transition-all"
                style={{
                  color: isActive
                    ? "var(--color-primary)"
                    : "var(--color-text-primary)",
                  background: isActive
                    ? "var(--color-secondary-light)"
                    : "transparent",
                  fontFamily: "var(--font-heading)",
                }}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{label}</span>
                {isActive && (
                  <div
                    className="ml-auto w-2 h-2 rounded-full"
                    style={{ background: "var(--color-primary)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom Navigation Bar */}
      <nav
        style={{
          background: "var(--color-bg-card)",
          borderTop: "3px solid var(--color-border-light)",
          boxShadow: "var(--shadow-clay-md)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="max-w-lg mx-auto px-4">
          <div className="flex justify-around items-center py-2">
            {/* Main Nav Items */}
            {mainNavItems.map(({ id, label, icon: Icon }) => {
              const isActive = currentPage === id;
              return (
                <button
                  key={id}
                  onClick={() => onNavigate(id)}
                  className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all min-w-[70px] min-h-[56px]"
                  style={{
                    color: isActive
                      ? "var(--color-primary)"
                      : "var(--color-text-muted)",
                    background: isActive
                      ? "var(--color-secondary-light)"
                      : "transparent",
                    borderRadius: "var(--radius-lg)",
                    border: isActive
                      ? "2px solid var(--color-secondary)"
                      : "2px solid transparent",
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  <Icon
                    className={`w-6 h-6 ${isActive ? "stroke-[2.5]" : "stroke-2"}`}
                  />
                  <span
                    className={`text-xs ${isActive ? "font-bold" : "font-medium"}`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}

            {/* More Menu Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMenuOpen(!isMenuOpen);
              }}
              className="flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all min-w-[70px] min-h-[56px]"
              style={{
                color:
                  isMenuOpen || isMenuItemActive
                    ? "var(--color-primary)"
                    : "var(--color-text-muted)",
                background:
                  isMenuOpen || isMenuItemActive
                    ? "var(--color-secondary-light)"
                    : "transparent",
                borderRadius: "var(--radius-lg)",
                border:
                  isMenuOpen || isMenuItemActive
                    ? "2px solid var(--color-secondary)"
                    : "2px solid transparent",
                fontFamily: "var(--font-heading)",
              }}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <Menu
                  className={`w-6 h-6 ${isMenuItemActive ? "stroke-[2.5]" : "stroke-2"}`}
                />
              )}
              <span
                className={`text-xs ${isMenuOpen || isMenuItemActive ? "font-bold" : "font-medium"}`}
              >
                More
              </span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
