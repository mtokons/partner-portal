import { CvSuiteNav } from "@/components/cv-suite/CvSuiteNav";
import { FileText } from "lucide-react";

export default function CvSuiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              CV Suite
            </h1>
            <p className="text-sm text-muted-foreground">
              Candidate management, export & document tracking
            </p>
          </div>
        </div>
        <div className="sm:ml-auto">
          <CvSuiteNav />
        </div>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
