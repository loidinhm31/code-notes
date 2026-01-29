import { Link } from "react-router-dom";
import { useNav } from "@code-notes/ui/hooks/useNav";
import { ArrowLeft, Database } from "lucide-react";

export const SettingsPage = () => {
  const { to } = useNav();
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <Link
          to={to("")}
          className="inline-flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--color-bg-muted)] border-2 border-transparent hover:border-[var(--color-border-light)] cursor-pointer"
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

      <div>
        <div className="clay-card p-6 mb-6">
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
                to={to("data-management")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)] hover:shadow-[var(--shadow-clay-md)] cursor-pointer border-2 border-[var(--color-primary-dark)]"
              >
                <Database className="w-4 h-4" />
                Manage Data (Import/Export)
              </Link>
            </div>
          </div>
        </div>

        {/* Add other settings sections here as needed */}
      </div>
    </div>
  );
};
