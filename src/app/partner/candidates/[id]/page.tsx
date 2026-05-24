import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import {
  getCandidateById,
  getCandidateServices,
  getCandidateTasks,
  getProducts,
  getPartnerByEmail,
} from "@/lib/sharepoint";
import { getAllowedTransitions } from "@/lib/engine/candidate-workflow";
import { WorkflowStepper } from "@/components/candidate/WorkflowStepper";
import { CandidateStatusAdvancer } from "./CandidateStatusAdvancer";
import { format, parseISO, isPast } from "date-fns";
import { ArrowLeft, AlertCircle, FileText, CreditCard, ClipboardList } from "lucide-react";
import { getCandidateDocumentsAction } from "../actions";
import BuyServiceTrigger from "./BuyServiceTrigger";
import CandidateDocumentsSection from "./CandidateDocumentsSection";

const TASK_ICON = {
  "Document Required": FileText,
  "Payment Due": CreditCard,
  "General Task": ClipboardList,
};
const TASK_COLOR = {
  "Document Required": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Payment Due": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "General Task": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = (user.roles || [user.role]) as string[];
  const isAdmin = roles.includes("admin");

  const [candidate, services, tasks, products] = await Promise.all([
    getCandidateById(id),
    getCandidateServices(id),
    getCandidateTasks(id),
    getProducts(),
  ]);

  if (!candidate) notFound();

  let activeMargin = user.marginPercentage;

  if (!isAdmin) {
    const partner = await getPartnerByEmail(user.email!);
    if (!partner || candidate.partnerId !== partner.id) notFound();
    activeMargin = partner.marginPercentage;
  } else {
    // For admin, we should ideally fetch the partner. 
    // We can fetch partner by email if we had it, but candidate.partnerId is what we have.
    // For now, if admin, we can fallback to candidate's stored margin, or ideally fetch the partner list and find it.
    // Let's just use candidate.marginPercentage for admins as a fallback.
    activeMargin = candidate.marginPercentage;
  }

  const docsRes = await getCandidateDocumentsAction(candidate.id, candidate.fullName);
  const initialDocuments = docsRes.success && docsRes.data ? docsRes.data : [];

  const allowedNext = getAllowedTransitions(
    candidate.workflowCategory,
    candidate.currentStatus as string
  );
  const activeTasks = tasks.filter(
    (t) => t.status === "todo" || t.status === "in-progress"
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/partner/candidates"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{candidate.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {candidate.sccgId}
            {candidate.submissionId && (
              <span className="ml-2 font-mono text-xs">#{candidate.submissionId.slice(0, 8)}</span>
            )}
          </p>
        </div>
        {candidate.isOnHold && (
          <span className="text-xs px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium">
            On Hold
          </span>
        )}
      </div>

      {/* Workflow stepper */}
      <div className="bg-card rounded-2xl border p-6 space-y-4">
        <h2 className="font-semibold text-foreground">
          {candidate.workflowCategory} Workflow
        </h2>
        <WorkflowStepper
          category={candidate.workflowCategory}
          currentStatus={candidate.currentStatus}
          isAdmin={isAdmin}
          allowedNext={allowedNext}
        />
        {isAdmin && allowedNext.length > 0 && (
          <CandidateStatusAdvancer
            candidateId={candidate.id}
            allowedNext={allowedNext}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal info */}
        <div className="bg-card rounded-2xl border p-6 space-y-3">
          <h2 className="font-semibold text-foreground">Personal Information</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ["Email", candidate.email],
              ["Phone", candidate.phone],
              ["Date of Birth", candidate.dateOfBirth ? format(parseISO(candidate.dateOfBirth), "MMM d, yyyy") : "—"],
              ["Nationality", candidate.nationality],
              ["Country", candidate.country],
              ["Passport", candidate.passportNumber ?? "—"],
              ["National ID", candidate.nationalId ?? "—"],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium text-foreground truncate">{value}</dd>
              </div>
            ))}
          </dl>
          {candidate.address && (
            <div className="text-sm">
              <dt className="text-muted-foreground">Address</dt>
              <dd className="font-medium text-foreground">{candidate.address}</dd>
            </div>
          )}
        </div>

        {/* Financial summary */}
        <div className="bg-card rounded-2xl border p-6 space-y-3">
          <h2 className="font-semibold text-foreground">Financial Split</h2>
          <div className="space-y-2 text-sm">
            {[
              ["Total Service Fee", `€${candidate.totalServiceFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
              ["Partner Share", `€${candidate.partnerShare.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${candidate.marginPercentage}%)`],
              ["SCCG Share", `€${candidate.sccgShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
              ["Required Deposit", `€${candidate.depositAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
            ].map(([label, value]) => (
              <div key={label as string} className="flex items-center justify-between py-1 border-b last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground">{value}</span>
              </div>
            ))}
          </div>
          <div className="pt-1">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                candidate.paymentStatus === "fully-paid"
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : candidate.paymentStatus === "deposit-paid"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
              }`}
            >
              {candidate.paymentStatus.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
        </div>
      </div>

      {/* Services */}
      <div className="bg-card rounded-2xl border overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Selected Services</h2>
          <BuyServiceTrigger
            candidateId={candidate.id}
            candidateName={candidate.fullName}
            candidateSccgId={candidate.sccgId || candidate.id}
            candidateMargin={activeMargin as any}
            products={products}
          />
        </div>
        {services.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No services purchased yet. Click "Buy Additional Service" to add one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Service</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Type</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Price</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qty</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 font-medium">{s.serviceName}</td>
                  <td className="px-4 py-2 text-muted-foreground capitalize">{s.packageType.replace(/-/g, " ")}</td>
                  <td className="px-4 py-2 text-right">€{s.basePrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-2 text-right">{s.quantity}</td>
                  <td className="px-4 py-2 text-right font-medium">€{s.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Tasks */}
      {activeTasks.length > 0 && (
        <div className="bg-card rounded-2xl border p-6 space-y-3">
          <h2 className="font-semibold text-foreground">Open Tasks ({activeTasks.length})</h2>
          <div className="space-y-2">
            {activeTasks.map((task) => {
              const Icon = TASK_ICON[task.taskCategory] ?? ClipboardList;
              const colorClass = TASK_COLOR[task.taskCategory] ?? "bg-muted text-muted-foreground";
              const isOverdue = task.dueDate && isPast(parseISO(task.dueDate));
              return (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40">
                  <div className={`p-1.5 rounded-lg shrink-0 ${colorClass}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.dueDate && (
                      <p className={`text-xs mt-0.5 flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                        {isOverdue && <AlertCircle className="w-3 h-3" />}
                        Due {format(parseISO(task.dueDate), "MMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes */}
      {(() => {
        let displayNotes = candidate.notes || "";
        try {
          if (displayNotes.trim().startsWith("{")) {
            const parsed = JSON.parse(displayNotes);
            displayNotes = parsed.customNotes || "";
          }
        } catch {}
        
        if (!displayNotes) return null;

        return (
          <div className="bg-card rounded-2xl border p-6">
            <h2 className="font-semibold text-foreground mb-2">Notes</h2>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{displayNotes}</p>
          </div>
        );
      })()}

      {/* Documents */}
      <CandidateDocumentsSection
        candidateId={candidate.id}
        candidateName={candidate.fullName}
        initialDocuments={initialDocuments}
      />

      {/* PDF actions */}
      <div className="flex items-center gap-3">
        <a
          href={`/api/candidate-pdf?candidateId=${candidate.id}&type=offer`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <FileText className="w-4 h-4" />
          Download Offer PDF
        </a>
        <a
          href={`/api/candidate-pdf?candidateId=${candidate.id}&type=invoice`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <FileText className="w-4 h-4" />
          Download Invoice PDF
        </a>
      </div>
    </div>
  );
}
