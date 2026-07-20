import {
  LayoutDashboard, FileText, ClipboardList, Package,
  GraduationCap, Calendar, MessageSquare, CreditCard,
} from "lucide-react";
import { ManualSection, ManualStep, FeatureRow, ManualNote, ProcessFlow } from "./ManualShared";

export default function CustomerManual({ userName }: { userName: string }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Customer Role</p>
          <p className="text-base font-semibold text-foreground mt-0.5">
            Welcome, {userName}. This manual explains how to track your journey, services, and communications.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card px-5 py-5">
        <p className="text-sm font-bold text-foreground mb-1">End-to-End Customer Flow</p>
        <ProcessFlow steps={[
          "Log in and review your Dashboard for a summary of your current status.",
          "Open My Offers to review active or pending service offers.",
          "Follow My Timeline to understand where you are in your service journey.",
          "Access My Packages and My Courses for service and learning details.",
          "Check Sessions for scheduled appointments.",
          "Use Messages to communicate with your support team.",
          "Review Payments and Invoices for financial clarity.",
        ]} />
      </div>

      <ManualSection step={1} title="Dashboard" icon={<LayoutDashboard className="h-4 w-4 text-emerald-400" />}>
        <p className="text-sm text-muted-foreground mt-3 mb-2">Your home screen. Shows a summary of your active services, messages, and upcoming actions.</p>
        <ManualStep number={1} text="Log in. The dashboard opens automatically." />
        <ManualStep number={2} text="Read the summary cards for offers, packages, and recent messages." />
        <ManualStep number={3} text="Use the quick links to jump to any area." />
        <FeatureRow label="Dashboard" href="/customer/dashboard" desc="Overview of your current service status." />
      </ManualSection>

      <ManualSection step={2} title="My Offers" icon={<FileText className="h-4 w-4 text-emerald-400" />}>
        <p className="text-sm text-muted-foreground mt-3 mb-2">Review offers your partner or SCCG has prepared for you. Accept or reject directly from here.</p>
        <ManualStep number={1} text="Open My Offers from the left menu." />
        <ManualStep number={2} text="Review the offer details — services, pricing, and validity." />
        <ManualStep number={3} text="Click Accept or Reject as appropriate." />
        <ManualNote>Once accepted, an offer converts to an active service order. This cannot be undone without contacting SCCG.</ManualNote>
        <FeatureRow label="My Offers" href="/customer/offers" desc="Review and respond to service offers." />
      </ManualSection>

      <ManualSection step={3} title="My Timeline" icon={<ClipboardList className="h-4 w-4 text-emerald-400" />}>
        <p className="text-sm text-muted-foreground mt-3 mb-2">A structured view of your service journey from start to finish. Shows completed steps, current stage, and what comes next.</p>
        <ManualStep number={1} text="Open My Timeline from the left menu." />
        <ManualStep number={2} text="Review each milestone and its status." />
        <ManualStep number={3} text="Contact support if any milestone is blocked or unclear." />
        <FeatureRow label="My Timeline" href="/customer/timeline" desc="Progress tracker for your service journey." />
      </ManualSection>

      <ManualSection step={4} title="Packages & Courses" icon={<Package className="h-4 w-4 text-emerald-400" />}>
        <FeatureRow label="My Packages" href="/customer/packages" desc="Review assigned service packages and their details." />
        <FeatureRow label="My Courses" href="/customer/school" desc="Access any enrolled language or professional courses." />
        <ManualStep number={1} text="Open My Packages to see what has been assigned to you." />
        <ManualStep number={2} text="Open My Courses to see enrolled courses and current progress." />
      </ManualSection>

      <ManualSection step={5} title="Sessions & Messages" icon={<Calendar className="h-4 w-4 text-emerald-400" />}>
        <FeatureRow label="Sessions" href="/customer/sessions" desc="Scheduled appointments and consultations." />
        <FeatureRow label="Messages" href="/customer/messages" desc="Direct communication with your partner or SCCG team." />
        <ManualStep number={1} text="Open Sessions to see upcoming and past appointments." />
        <ManualStep number={2} text="Open Messages to start or continue a conversation." />
        <ManualNote>Messages are monitored by your assigned partner. Responses appear in the same thread.</ManualNote>
      </ManualSection>

      <ManualSection step={6} title="Payments & Invoices" icon={<CreditCard className="h-4 w-4 text-emerald-400" />}>
        <FeatureRow label="Payments" href="/customer/payments" desc="View payment history and pending amounts." />
        <FeatureRow label="Invoices" href="/customer/invoices" desc="Download or review issued invoices." />
        <ManualStep number={1} text="Open Payments to see all past transactions and any open balance." />
        <ManualStep number={2} text="Open Invoices to download or review billing documents." />
        <ManualStep number={3} text="Contact support if a payment or invoice shows an error." />
      </ManualSection>
    </div>
  );
}
