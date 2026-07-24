import {
  LayoutDashboard, Users, Handshake, ClipboardList, Building2,
  DollarSign, ShoppingBag, Settings, LifeBuoy, UserPlus,
} from "lucide-react";
import {
  ManualSection, ManualStep, FeatureRow, ManualNote, ProcessFlow,
} from "./ManualShared";

export default function PartnerManual({ userName }: { userName: string }) {
  return (
    <div>
      {/* Role badge */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-5 py-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Partner Role</p>
          <p className="text-base font-semibold text-foreground mt-0.5">
            Welcome, {userName}. This manual covers all partner portal features and how to use them step by step.
          </p>
        </div>
      </div>

      {/* End-to-end process flow */}
      <div className="mb-6 rounded-2xl border border-border bg-card px-5 py-5">
        <p className="text-sm font-bold text-foreground mb-1">End-to-End Partner Flow</p>
        <p className="text-xs text-muted-foreground mb-2">Follow this sequence for your daily workflow.</p>
        <ProcessFlow steps={[
          "Log in and start from the Dashboard to review your KPIs.",
          "Check My Tasks for any pending actions from active workflows.",
          "Open Candidate Gallery to review or follow up on existing candidates.",
          "Use Register Candidate to add new candidates and select their services.",
          "Prepare or review Offers for active business opportunities.",
          "Manage your B2B Network — add companies and upload agreements.",
          "Review Finance: revenue, due payments, invoices, and refunds.",
          "Browse the Marketplace for service packages and resources.",
          "Use Support / Helpdesk if any issue requires SCCG follow-up.",
        ]} />
      </div>

      {/* Feature sections */}
      <ManualSection step={1} title="Dashboard" icon={<LayoutDashboard className="h-4 w-4 text-cyan-400" />}>
        <p className="text-sm text-muted-foreground mt-3 mb-2">
          Your home screen. Always start here. Shows live KPIs, partner tier, recent activity, and pending alerts.
        </p>
        <ManualStep number={1} text="Log in to the portal." />
        <ManualStep number={2} text="The dashboard loads automatically. Review the KPI cards at the top." />
        <ManualStep number={3} text="Check the activity feed and any alert badges for outstanding items." />
        <FeatureRow label="Go to Dashboard" href="/partner/dashboard" desc="Home screen with live partner metrics." />
      </ManualSection>

      <ManualSection step={2} title="Candidate Gallery" icon={<Users className="h-4 w-4 text-cyan-400" />}>
        <p className="text-sm text-muted-foreground mt-3 mb-2">
          View and manage all candidates connected to your account. Track their service status and workflows.
        </p>
        <ManualStep number={1} text="Open Candidate Gallery from the left menu." />
        <ManualStep number={2} text="Use the search bar to find a specific candidate by name or email." />
        <ManualStep number={3} text="Click a candidate row to open full details, documents, and service history." />
        <ManualStep number={4} text="Use the action buttons to update status or continue a workflow." />
        <FeatureRow label="Candidate Gallery" href="/partner/candidates" desc="Full list of candidates linked to your account." />
      </ManualSection>

      <ManualSection step={3} title="Register Candidate" icon={<UserPlus className="h-4 w-4 text-cyan-400" />}>
        <p className="text-sm text-muted-foreground mt-3 mb-2">
          Use this 6-step wizard to register a new candidate and assign services to them.
        </p>
        <ManualStep number={1} text="Click Register Candidate in the left menu or Candidate Gallery." />
        <ManualStep number={2} text="Step 1: Enter personal information — name, email, phone, address." />
        <ManualStep number={3} text="Step 2: Select services from the available catalogue." />
        <ManualStep number={4} text="Step 3: Set financial split and payment structure." />
        <ManualStep number={5} text="Step 4: Confirm payment details." />
        <ManualStep number={6} text="Step 5: Review and submit the registration." />
        <ManualStep number={7} text="Step 6: Upload required documents." />
        <ManualNote>If the candidate already exists, enter their email and the wizard will load their existing record. Only new services will be added — no duplicates.</ManualNote>
        <FeatureRow label="Register Candidate" href="/partner/candidates/new" desc="6-step registration wizard." />
      </ManualSection>

      <ManualSection step={4} title="Create Offer" icon={<Handshake className="h-4 w-4 text-cyan-400" />}>
        <p className="text-sm text-muted-foreground mt-3 mb-2">
          Prepare service offers for customers or candidates and track their acceptance status.
        </p>
        <ManualStep number={1} text="Open Create Offer from the left menu." />
        <ManualStep number={2} text="Click New Offer and select the target customer." />
        <ManualStep number={3} text="Add service items and set quantities and pricing." />
        <ManualStep number={4} text="Review and send the offer." />
        <ManualStep number={5} text="Monitor offer status — pending, accepted, or rejected." />
        <FeatureRow label="My Offers" href="/partner/offers" desc="Create and track service offers." />
      </ManualSection>

      <ManualSection step={5} title="My Tasks" icon={<ClipboardList className="h-4 w-4 text-cyan-400" />}>
        <p className="text-sm text-muted-foreground mt-3 mb-2">
          Track operational tasks assigned to you as part of active service workflows.
        </p>
        <ManualStep number={1} text="Open My Tasks from the left menu." />
        <ManualStep number={2} text="Review open tasks and their due dates." />
        <ManualStep number={3} text="Click a task to view details and take action." />
        <ManualStep number={4} text="Mark tasks complete once the action is done." />
        <FeatureRow label="My Tasks" href="/partner/tasks" desc="Operational task board." />
      </ManualSection>

      <ManualSection step={6} title="My B2B Network" icon={<Building2 className="h-4 w-4 text-cyan-400" />}>
        <p className="text-sm text-muted-foreground mt-3 mb-2">
          Manage your corporate B2B partner companies, upload agreements, and issue cooperation certificates.
        </p>
        <ManualStep number={1} text="Open My B2B Network from the left menu." />
        <ManualStep number={2} text="Click Add B2B Company to create a new entry." />
        <ManualStep number={3} text="Fill in company name, contact person, phone, and address." />
        <ManualStep number={4} text="Upload a signed B2B agreement using the Upload button." />
        <ManualStep number={5} text="Use Issue Certificate to generate a cooperation certificate with QR code." />
        <ManualNote>The Certificate Template button is visible to admin users only. Regular partners can issue and re-issue their own certificates.</ManualNote>
        <FeatureRow label="My B2B Network" href="/partner/b2b" desc="B2B company records and certificates." />
      </ManualSection>

      <ManualSection step={7} title="Finance" icon={<DollarSign className="h-4 w-4 text-cyan-400" />}>
        <p className="text-sm text-muted-foreground mt-3 mb-2">
          Review all financial information related to your account: revenue, payments, invoices, and refunds.
        </p>
        <FeatureRow label="Finance Overview" href="/partner/finance" desc="Summary of partner financial activity." />
        <FeatureRow label="My Revenue" href="/partner/finance/revenue" desc="Detailed breakdown of earned revenue." />
        <FeatureRow label="Due Payments" href="/partner/finance/due-payments" desc="Outstanding amounts and due dates." />
        <FeatureRow label="Invoices" href="/partner/finance/invoices" desc="Invoice list and download." />
        <FeatureRow label="Make Payment" href="/partner/finance/payments" desc="Submit payment using available methods." />
        <FeatureRow label="Refund Requests" href="/partner/finance/refunds" desc="Track refund submissions." />
      </ManualSection>

      <ManualSection step={8} title="Marketplace" icon={<ShoppingBag className="h-4 w-4 text-cyan-400" />}>
        <p className="text-sm text-muted-foreground mt-3 mb-2">
          Browse available products and services. Download branding, graphics, and resource files.
        </p>
        <ManualStep number={1} text="Open Marketplace from the left menu." />
        <ManualStep number={2} text="Use the tabs to browse All Products, Downloads, or Other Resources." />
        <ManualStep number={3} text="Click a product to view details or add to your order." />
        <FeatureRow label="Marketplace" href="/partner/marketplace" desc="Products, services, and downloads." />
      </ManualSection>

      <ManualSection step={9} title="Account Settings & Support" icon={<Settings className="h-4 w-4 text-cyan-400" />}>
        <FeatureRow label="Account Settings" href="/partner/settings" desc="Update profile, company, and contact details." />
        <FeatureRow label="Support / Helpdesk" href="/partner/support" desc="Open a support ticket or view existing ones." />
        <ManualStep number={1} text="Go to Support / Helpdesk if you have a question or issue that requires SCCG attention." />
        <ManualStep number={2} text="Click New Ticket, describe the issue, and submit." />
        <ManualStep number={3} text="Track responses in the ticket list." />
      </ManualSection>
    </div>
  );
}
