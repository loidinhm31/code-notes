import {
  BookOpen,
  Brain,
  ChartBar,
  Upload,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSyncStatus, useNav } from "@code-notes/ui/hooks";

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const { isAuthenticated, syncStatus, isSyncing, lastSyncSuccess, error } =
    useSyncStatus();
  const { to, navigate } = useNav();

  const navItems: {
    id: string;
    label: string;
    icon: typeof BookOpen;
    path: string;
  }[] = [
    { id: "topics", label: "Topics", icon: BookOpen, path: "/" },
    { id: "quiz", label: "Quiz", icon: Brain, path: "/quiz" },
    { id: "progress", label: "Progress", icon: ChartBar, path: "/progress" },
    { id: "import", label: "Import", icon: Upload, path: "/import" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ];

  // Sync status helpers
  const getSyncIcon = () => {
    if (isSyncing) return RefreshCw;
    if (!isAuthenticated) return CloudOff;
    if (error) return AlertCircle;
    if (lastSyncSuccess === false) return AlertTriangle;
    if (lastSyncSuccess === true) return CheckCircle2;
    return Cloud;
  };

  const getSyncColor = () => {
    if (isSyncing) return "var(--color-primary)";
    if (!isAuthenticated) return "var(--color-text-muted)";
    if (error) return "var(--color-error)";
    if (lastSyncSuccess === false) return "var(--color-accent)";
    if (syncStatus?.pendingChanges && syncStatus.pendingChanges > 0)
      return "var(--color-primary)";
    if (lastSyncSuccess === true) return "var(--color-success)";
    return "var(--color-text-muted)";
  };

  const pendingCount = syncStatus?.pendingChanges ?? 0;
  const SyncIcon = getSyncIcon();

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      }`}
      style={{
        background: "var(--color-bg-white)",
        borderRight: "3px solid var(--color-border-light)",
        boxShadow: "var(--shadow-clay-md)",
      }}
    >
      {/* Logo / Brand */}
      <div
        className={`flex items-center gap-3 py-5 transition-all duration-300 ${
          isCollapsed ? "px-3 justify-center" : "px-6"
        }`}
        style={{ borderBottom: "3px solid var(--color-border-light)" }}
      >
        <div
          className="w-10 h-10 flex items-center justify-center text-white font-bold flex-shrink-0"
          style={{
            background: "var(--color-primary)",
            borderRadius: "var(--radius-lg)",
            border: "3px solid rgba(255, 255, 255, 0.5)",
            boxShadow: "var(--shadow-clay-sm)",
          }}
        >
          <BookOpen className="w-5 h-5" />
        </div>
        {!isCollapsed && (
          <div className="overflow-hidden">
            <h1
              className="text-lg font-bold whitespace-nowrap"
              style={{
                color: "var(--color-primary)",
                fontFamily: "var(--font-family-heading)",
              }}
            >
              Code Notes
            </h1>
            <p
              className="text-xs whitespace-nowrap"
              style={{ color: "var(--color-text-muted)" }}
            >
              Learn & Quiz
            </p>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(({ id, label, icon: Icon, path }) => (
            <li key={id}>
              <NavLink
                to={to(path)}
                end={path === "/"}
                title={isCollapsed ? label : undefined}
                className={({ isActive }) =>
                  `w-full flex items-center gap-3 py-3 transition-all duration-200 group ${
                    isCollapsed ? "px-0 justify-center" : "px-4"
                  }`
                }
                style={({ isActive }) => ({
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
                  boxShadow: isActive ? "var(--shadow-clay-sm)" : "none",
                  fontFamily: "var(--font-family-heading)",
                })}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={`w-5 h-5 flex-shrink-0 transition-all ${
                        isActive
                          ? "stroke-[2.5]"
                          : "stroke-2 group-hover:stroke-[2.5]"
                      }`}
                    />
                    {!isCollapsed && (
                      <>
                        <span
                          className={`text-sm whitespace-nowrap ${
                            isActive ? "font-semibold" : "font-medium"
                          }`}
                        >
                          {label}
                        </span>
                        {isActive && (
                          <div
                            className="ml-auto w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: "var(--color-primary)" }}
                          />
                        )}
                      </>
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Collapse Toggle Button */}
      <button
        onClick={onToggleCollapse}
        className="mx-3 mb-3 p-2 transition-all flex items-center justify-center"
        style={{
          color: "var(--color-text-muted)",
          borderRadius: "var(--radius-md)",
        }}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>

      {/* Footer with Sync Status */}
      <div
        className={`py-4 ${isCollapsed ? "px-2" : "px-4"}`}
        style={{ borderTop: "3px solid var(--color-border-light)" }}
      >
        <button
          onClick={() => navigate("/settings")}
          title={
            isSyncing
              ? "Syncing..."
              : pendingCount > 0
                ? `${pendingCount} pending`
                : "Sync status"
          }
          className={`w-full flex items-center gap-2 p-2 transition-all ${
            isCollapsed ? "justify-center" : ""
          }`}
          style={{
            color: getSyncColor(),
            borderRadius: "var(--radius-md)",
          }}
        >
          <SyncIcon
            className={`w-5 h-5 flex-shrink-0 ${isSyncing ? "animate-spin" : ""}`}
          />
          {!isCollapsed && (
            <span className="text-sm font-medium">
              {isSyncing
                ? "Syncing..."
                : pendingCount > 0
                  ? `${pendingCount} pending`
                  : "Synced"}
            </span>
          )}
          {isCollapsed && pendingCount > 0 && (
            <span
              className="absolute ml-6 -mt-4 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold text-white"
              style={{
                background: "var(--color-primary)",
              }}
            >
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </button>
        {!isCollapsed && (
          <p
            className="text-xs text-center mt-2"
            style={{ color: "var(--color-text-muted)" }}
          >
            v1.0.0
          </p>
        )}
      </div>
    </aside>
  );
}
