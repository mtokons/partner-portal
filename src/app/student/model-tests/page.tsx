import { redirect } from "next/navigation";
import { getEffectiveUser } from "@/lib/effective-user";
import { BookOpen, Award, CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentModelTestsPage() {
  const user = await getEffectiveUser();
  if (!user) redirect("/login");

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Language & Examination Model Tests</h1>
          <p className="text-xs text-muted-foreground">
            Practice German B1/B2 Goethe & TELC model exams and track test performance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-card border rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-blue-500 font-bold text-sm">
            <Award className="w-5 h-5" />
            Goethe-Zertifikat B2
          </div>
          <p className="text-xs text-muted-foreground">
            Complete reading, listening, writing, and speaking mock examination modules.
          </p>
          <div className="pt-2 text-xs font-semibold text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Available for practice
          </div>
        </div>

        <div className="p-6 bg-card border rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-violet-500 font-bold text-sm">
            <Award className="w-5 h-5" />
            TELC Deutsch B2
          </div>
          <p className="text-xs text-muted-foreground">
            TELC style examination training with simulated time constraints.
          </p>
          <div className="pt-2 text-xs font-semibold text-emerald-500 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Available for practice
          </div>
        </div>

        <div className="p-6 bg-card border rounded-3xl space-y-3">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
            <Clock className="w-5 h-5" />
            Test History
          </div>
          <p className="text-xs text-muted-foreground">
            View completed test scores, evaluate errors, and download certificates.
          </p>
          <div className="pt-2 text-xs font-semibold text-muted-foreground">
            0 Tests Completed
          </div>
        </div>
      </div>
    </div>
  );
}
