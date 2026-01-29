import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ImportForm } from "@code-notes/ui/components/organisms/ImportForm";

export const ImportPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg transition-all duration-200 hover:bg-[var(--color-bg-muted)] border-2 border-transparent hover:border-[var(--color-border-light)] cursor-pointer"
          >
            <ArrowLeft size={20} />
            Back to Topics
          </Link>
        </div>

        <ImportForm />
      </div>
    </div>
  );
};

