import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { ImportForm } from "@/components/organisms/ImportForm";

export const ImportPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link to="/" className="inline-flex items-center gap-2">
            <ArrowLeft size={20} />
            Back to Topics
          </Link>
        </div>

        <ImportForm />
      </div>
    </div>
  );
};
