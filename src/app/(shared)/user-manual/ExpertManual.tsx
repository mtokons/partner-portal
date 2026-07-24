import {
  LayoutDashboard, Users, Calendar, BookOpen, CreditCard, Bell,
} from "lucide-react";
import { ManualSection, ManualStep, FeatureRow, ProcessFlow } from "./ManualShared";

export default function ExpertManual({ userName }: { userName: string }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-violet-400/30 bg-violet-500/10 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-300">Teacher / Expert Role</p>
          <p className="text-base font-semibold text-foreground mt-0.5">
            Welcome, {userName}. This manual covers how to manage clients, sessions, teaching, and earnings.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card px-5 py-5">
        <p className="text-sm font-bold text-foreground mb-1">End-to-End Expert Flow</p>
        <ProcessFlow steps={[
          "Log in and check the Dashboard for upcoming sessions and client activity.",
          "Review My Clients to see who is assigned to you.",
          "Open Sessions to manage scheduled and past appointments.",
          "Use My Teaching to access course batches and material.",
          "Check My Earnings for payment status and history.",
          "Review Notifications for any system updates.",
        ]} />
      </div>

      <ManualSection step={1} title="Dashboard" icon={<LayoutDashboard className="h-4 w-4 text-violet-400" />}>
        <ManualStep number={1} text="Log in and the dashboard loads automatically." />
        <ManualStep number={2} text="Review upcoming sessions and client summary cards." />
        <FeatureRow label="Dashboard" href="/expert/dashboard" desc="Expert home screen with session and client overview." />
      </ManualSection>

      <ManualSection step={2} title="My Clients" icon={<Users className="h-4 w-4 text-violet-400" />}>
        <ManualStep number={1} text="Open My Clients to see all assigned clients." />
        <ManualStep number={2} text="Click a client to view their profile and session history." />
        <FeatureRow label="My Clients" href="/expert/clients" desc="Manage assigned client relationships." />
      </ManualSection>

      <ManualSection step={3} title="Sessions" icon={<Calendar className="h-4 w-4 text-violet-400" />}>
        <ManualStep number={1} text="Open Sessions to view scheduled, completed, and upcoming sessions." />
        <ManualStep number={2} text="Click a session to open details, notes, and completion actions." />
        <ManualStep number={3} text="Mark sessions complete after delivery." />
        <FeatureRow label="Sessions" href="/expert/sessions" desc="Session management and completion tracking." />
      </ManualSection>

      <ManualSection step={4} title="My Teaching" icon={<BookOpen className="h-4 w-4 text-violet-400" />}>
        <ManualStep number={1} text="Open My Teaching to see assigned course batches." />
        <ManualStep number={2} text="Review enrolled students per batch and session schedule." />
        <FeatureRow label="My Teaching" href="/expert/teaching" desc="Course batches and teaching assignments." />
      </ManualSection>

      <ManualSection step={5} title="My Earnings" icon={<CreditCard className="h-4 w-4 text-violet-400" />}>
        <ManualStep number={1} text="Open My Earnings to review payment records from SCCG." />
        <ManualStep number={2} text="Check payment status and expected next payment." />
        <FeatureRow label="My Earnings" href="/expert/payments" desc="Payment history and earning records." />
      </ManualSection>

      <ManualSection step={6} title="Notifications" icon={<Bell className="h-4 w-4 text-violet-400" />}>
        <ManualStep number={1} text="Open Notifications to review system messages and updates." />
        <FeatureRow label="Notifications" href="/expert/notifications" desc="System and workflow notifications." />
      </ManualSection>
    </div>
  );
}
