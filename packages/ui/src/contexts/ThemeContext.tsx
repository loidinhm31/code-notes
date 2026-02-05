import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark";

// Custom event name for theme changes (used by ShadowWrapper in qm-center-app)
export const CODE_NOTES_THEME_EVENT = "code-notes-theme-change";
export const CODE_NOTES_THEME_STORAGE_KEY = "code-notes-theme";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  /**
   * When true, the app is embedded in another app (e.g., qm-center).
   * In embedded mode, theme changes are dispatched via custom events
   * instead of modifying document.documentElement directly.
   * This prevents theme conflicts between multiple embedded apps.
   */
  embedded?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  embedded = false,
}) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem(CODE_NOTES_THEME_STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    // Check system preference
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }

    // Default to light
    return "light";
  });

  useEffect(() => {
    // Save to localStorage (always)
    localStorage.setItem(CODE_NOTES_THEME_STORAGE_KEY, theme);

    if (embedded) {
      // In embedded mode, dispatch custom event for ShadowWrapper to handle
      // This avoids modifying document.documentElement which would affect other apps
      window.dispatchEvent(
        new CustomEvent(CODE_NOTES_THEME_EVENT, {
          detail: { theme },
        }),
      );
    } else {
      // In standalone mode, apply theme to document element directly
      const root = window.document.documentElement;

      // Set data-theme attribute
      root.setAttribute("data-theme", theme);

      // Remove all previous theme classes
      root.classList.remove("dark");

      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [theme, embedded]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
