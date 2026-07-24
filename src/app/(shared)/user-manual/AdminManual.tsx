import {
  LayoutDashboard, Shield, Users, ShoppingCart, DollarSign,
  Wallet, Megaphone, Building2, GraduationCap, Mail, Settings,
} from "lucide-react";
import { ManualSection, FeatureRow, ProcessFlow, ManualNote } from "./ManualShared";

export default function AdminManual({ userName }: { userName: string }) {
  return (
    <div>
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-rose-300">Admin Role</p>
          <p className="text-base font-semibold text-foreground mt-0.5">
            Welcome, {userName}. This manual covers all administrative modules and how to operate them.
          </p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card px-5 py-5">
        <p className="text-sm font-bold text-foreground mb-1">Admin Operational Flow</p>
        <ProcessFlow steps={[
          "Start with System Overview each session to review live KPIs.",
          "Check Approvals to action any pending partner registrations.",
          "Review Partners and Candidates for operational follow-up.",
          "Monitor All Orders and Sessions for service delivery status.",
          "Check Global Financials, Invoices, Payments, and Payouts.",
          "Manage Wallets, SCCG Cards, and Promotions as needed.",
          "Use Helpdesk and Send Email for communication and escalation handling.",
        ]} />
      </div>

      <ManualSection step={1} title="Dashboard & System Overview" icon={<LayoutDashboard className="h-4 w-4 text-rose-400" />}>
        <FeatureRow label="Dashboard" href="/admin/dashboard" desc="Operational summary for the admin role." />
        <FeatureRow label="System Overview" href="/admin/overview" desc="Live KPIs across all portal modules." />
        <FeatureRow label="Task Board" href="/admin/tasks" desc="Kanban board for internal administrative tasks." />
      </ManualSection>

      <ManualSection step={2} title="Partner Management" icon={<Shield className="h-4 w-4 text-rose-400" />}>
        <FeatureRow label="Approvals" href="/admin/approvals" desc="Review and approve or reject new partner registrations." />
        <FeatureRow label="Manage Partners" href="/admin/partners" desc="View all partner accounts, statuses, and financial settings." />
        <FeatureRow label="All Candidates" href="/admin/candidates" desc="Full cross-partner candidate view." />
        <ManualNote>MarginPercentage and TierStatus for each partner can be updated in the Partners list in SharePoint or via the Manage Partners page.</ManualNote>
      </ManualSection>

      <ManualSection step={3} title="User Management" icon={<Users className="h-4 w-4 text-rose-400" />}>
        <FeatureRow label="Manage Users" href="/admin/users" desc="All portal user accounts." />
        <FeatureRow label="Customers" href="/admin/customers" desc="Customer account management." />
        <FeatureRow label="Experts" href="/admin/experts" desc="Expert and teacher account management." />
      </ManualSection>

      <ManualSection step={4} title="Sales & CRM" icon={<ShoppingCart className="h-4 w-4 text-rose-400" />}>
        <FeatureRow label="Manage Products" href="/admin/products" desc="Create and update service catalogue products." />
        <FeatureRow label="Register Candidate" href="/admin/candidates/new" desc="Admin-level candidate registration wizard." />
        <FeatureRow label="All Orders" href="/admin/orders" desc="Cross-partner service order overview." />
        <FeatureRow label="All Sessions" href="/admin/sessions" desc="Full session activity." />
        <FeatureRow label="Bookings & Leads" href="/sales/bookings" desc="External booking and lead management." />
      </ManualSection>

      <ManualSection step={5} title="Finance" icon={<DollarSign className="h-4 w-4 text-rose-400" />}>
        <FeatureRow label="Global Financials" href="/admin/financials" desc="Platform-wide financial summary." />
        <FeatureRow label="Invoices" href="/admin/invoices" desc="All issued invoices." />
        <FeatureRow label="Payments" href="/admin/payments" desc="All received payments." />
        <FeatureRow label="Payouts" href="/admin/payouts" desc="Partner payout management." />
        <FeatureRow label="Expert Payments" href="/admin/expert-payments" desc="Expert and teacher payment records." />
        <FeatureRow label="Financial Reports" href="/admin/reports" desc="Aggregated reports for accounting." />
      </ManualSection>

      <ManualSection step={6} title="Wallet & Rewards" icon={<Wallet className="h-4 w-4 text-rose-400" />}>
        <FeatureRow label="Manage Wallets" href="/admin/wallets" desc="Partner coin wallet balances." />
        <FeatureRow label="SCCG Cards" href="/admin/sccg-cards" desc="Manage physical and digital SCCG loyalty cards." />
        <FeatureRow label="Gift Cards" href="/admin/gift-cards" desc="Manage gift card issuance and redemptions." />
      </ManualSection>

      <ManualSection step={7} title="Marketing" icon={<Megaphone className="h-4 w-4 text-rose-400" />}>
        <FeatureRow label="Promo Codes" href="/admin/promo-codes" desc="Create and manage discount codes." />
        <FeatureRow label="Promotions" href="/admin/promotions" desc="Active promotions and campaigns." />
        <FeatureRow label="Referrals" href="/admin/referrals" desc="Referral tracking and management." />
        <FeatureRow label="Commission Rules" href="/admin/commission-rules" desc="Set and update partner commission structures." />
        <FeatureRow label="Commission Ledger" href="/admin/commissions" desc="View all commission records." />
      </ManualSection>

      <ManualSection step={8} title="Human Resources" icon={<Building2 className="h-4 w-4 text-rose-400" />}>
        <FeatureRow label="HR Dashboard" href="/admin/hr" desc="Employee summary and HR overview." />
        <FeatureRow label="Employees" href="/admin/hr/employees" desc="Manage employee records." />
      </ManualSection>

      <ManualSection step={9} title="Language School" icon={<GraduationCap className="h-4 w-4 text-rose-400" />}>
        <FeatureRow label="School Dashboard" href="/admin/school" desc="Language school operational overview." />
        <FeatureRow label="Courses" href="/admin/school/courses" desc="Manage course catalogue." />
        <FeatureRow label="Batches" href="/admin/school/batches" desc="Manage student batches." />
        <FeatureRow label="Enrollments" href="/admin/school/enrollments" desc="Student enrolment management." />
        <FeatureRow label="Teachers" href="/admin/school/teachers" desc="Teacher assignments and profiles." />
        <FeatureRow label="Certificates" href="/admin/school/certificates" desc="School completion certificates." />
        <FeatureRow label="All Students" href="/admin/school/students" desc="Full student list." />
      </ManualSection>

      <ManualSection step={10} title="Administration" icon={<Mail className="h-4 w-4 text-rose-400" />}>
        <FeatureRow label="Send Email" href="/admin/send-email" desc="Send emails directly to users from the portal." />
        <FeatureRow label="Email Templates" href="/admin/email-templates" desc="Manage system email templates." />
        <FeatureRow label="Helpdesk" href="/admin/helpdesk" desc="View and respond to all partner support tickets." />
        <FeatureRow label="Menu Configuration" href="/admin/menu-config" desc="Customise per-role and per-user menu items." />
        <FeatureRow label="Data Sources" href="/admin/data-sources" desc="Debug SharePoint list connectivity." />
      </ManualSection>
    </div>
  );
}
