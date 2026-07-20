import {
  LayoutDashboard, GraduationCap, TrendingUp, FileText,
} from "lucide-react";
import { ManualSection, ManualStep, FeatureRow, ProcessFlow } from "./ManualShared";

export default function StudentManual({ userName }: { userName: string }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-blue-400/30 bg-blue-500/10 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-blue-300">Student Role</p>
          <p className="text-base font-semibold text-foreground mt-0.5">
            Welcome, {userName}. This manual explains how to access your courses, track progress, and manage documents.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card px-5 py-5">
        <p className="text-sm font-bold text-foreground mb-1">Student Flow</p>
        <ProcessFlow steps={[
          "Log in and check the Dashboard for active course information.",
          "Open My Courses to see enrolled courses and materials.",
          "Review Progress to track completion and milestones.",
          "Access Documents for certificates and supporting files.",
        ]} />
      </div>

      <ManualSection step={1} title="Dashboard" icon={<LayoutDashboard className="h-4 w-4 text-blue-400" />}>
        <ManualStep number={1} text="Log in and the student dashboard loads automatically." />
        <ManualStep number={2} text="Review your active courses and any upcoming sessions." />
        <FeatureRow label="Dashboard" href="/student/dashboard" desc="Student home screen." />
      </ManualSection>

      <ManualSection step={2} title="My Courses" icon={<GraduationCap className="h-4 w-4 text-blue-400" />}>
        <ManualStep number={1} text="Open My Courses to see all enrolled programmes." />
        <ManualStep number={2} text="Click a course to access materials and schedule." />
        <FeatureRow label="My Courses" href="/student/courses" desc="Enrolled course catalogue." />
      </ManualSection>

      <ManualSection step={3} title="Progress" icon={<TrendingUp className="h-4 w-4 text-blue-400" />}>
        <ManualStep number={1} text="Open Progress to see completed and outstanding milestones." />
        <FeatureRow label="Progress" href="/student/progress" desc="Course and milestone progress tracker." />
      </ManualSection>

      <ManualSection step={4} title="Documents" icon={<FileText className="h-4 w-4 text-blue-400" />}>
        <ManualStep number={1} text="Open Documents to download certificates, letters, and other files." />
        <FeatureRow label="Documents" href="/student/documents" desc="Certificates and uploaded documents." />
      </ManualSection>
    </div>
  );
}
