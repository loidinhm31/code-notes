import { Link } from "react-router-dom";
import { ArrowLeft, Database } from "lucide-react";

export const SettingsPage = () => {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center gap-2  mb-4">
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
                to="/data-management"
                className="  inline-flex items-center gap-2"
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
