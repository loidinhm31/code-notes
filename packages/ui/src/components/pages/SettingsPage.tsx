import React from "react";
import { Link } from "react-router-dom";
import { useNav, useAuth } from "@code-notes/ui/hooks";
import { useTheme, type Theme } from "@code-notes/ui/contexts";
import {
  ArrowLeft,
  Database,
  LogIn,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Sun,
  Terminal,
  User,
} from "lucide-react";
import { Button, Card } from "@code-notes/ui/components/atoms";
import { SyncSettings } from "@code-notes/ui/components/organisms";

interface SettingsPageProps {}

export const SettingsPage = ({}: SettingsPageProps) => {
  const { to, navigate } = useNav();
  const { isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] =
    [
      { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
      { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
      {
        value: "cyber",
        label: "Cyber",
        icon: <Terminal className="h-4 w-4" />,
      },
      {
        value: "system",
        label: "System",
        icon: <Monitor className="h-4 w-4" />,
      },
    ];

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <Link
          to={to("/")}
          className="inline-flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-(--color-bg-muted) border-2 border-transparent hover:border-[var(--color-border-light)] cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Topics
        </Link>

        <h1
          className="text-4xl font-bold mb-2"
          style={{ color: "var(--color-primary)" }}
        >
          Settings
        </h1>
        <p style={{ color: "var(--color-text-muted)" }}>
          Manage application settings and data
        </p>
      </div>

      <div className="space-y-6">
        {/* Theme Settings */}
        <div className="clay-card p-6">
          <div className="flex items-start gap-4">
            <Palette
              className="w-6 h-6"
              style={{ color: "var(--color-primary)" }}
            />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-2">Theme</h2>
              <p className="mb-4" style={{ color: "var(--color-text-muted)" }}>
                Choose your preferred appearance
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {themeOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-3 transition-all ${
                      theme === option.value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                        : "border-[var(--color-border-light)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-bg-muted)]"
                    }`}
                    style={{
                      color:
                        theme === option.value
                          ? "var(--color-primary)"
                          : "var(--color-text-primary)",
                    }}
                  >
                    {option.icon}
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="clay-card p-6">
          <div className="flex items-start gap-4">
            <Database
              className="w-6 h-6"
              style={{ color: "var(--color-primary)" }}
            />
            <div className="flex-1">
              <h2 className="text-2xl font-semibold mb-2">Data Management</h2>
              <p className="mb-4" style={{ color: "var(--color-text-muted)" }}>
                Your data is stored locally on this device. Use import/export to
                backup or transfer your data.
              </p>
              <Link
                to={to("/data-management")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 bg-(--color-primary) text-white hover:bg-[var(--color-primary-light)] hover:shadow-[var(--shadow-clay-md)] cursor-pointer border-2 border-[var(--color-primary-dark)]"
              >
                <Database className="w-4 h-4" />
                Manage Data (Import/Export)
              </Link>
            </div>
          </div>
        </div>

        {isAuthenticated ? (
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <User
                className="w-6 h-6"
                style={{ color: "var(--color-primary)" }}
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Account</h3>
                <p
                  className="mb-4"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Manage your account connection
                </p>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    await logout();
                  }}
                  className="w-full"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <LogIn
                className="w-6 h-6"
                style={{ color: "var(--color-primary)" }}
              />
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">
                  Login to connect to server
                </h3>
                <p
                  className="mb-4"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Connect your account to sync data
                </p>
                <Button className="w-full" onClick={() => navigate("/login")}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Login / Register
                </Button>
              </div>
            </div>
          </Card>
        )}

        <SyncSettings />
      </div>
    </div>
  );
};
