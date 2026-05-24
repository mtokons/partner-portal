import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getCandidateById,
  getCandidateServices,
  getCandidateTasks,
} from "@/lib/sharepoint";
import { getAllowedTransitions } from "@/lib/engine/candidate-workflow";
import { WorkflowStepper } from "@/components/candidate/WorkflowStepper";
import { CandidateStatusAdvancer } from "@/app/partner/candidates/[id]/CandidateStatusAdvancer";
import { format, parseISO, isPast } from "date-fns";
import { ArrowLeft, AlertCircle, FileText, CreditCard, ClipboardList, ToggleLeft } from "lucide-react";
import { AdminOnHoldToggle } from "./AdminOnHoldToggle";

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

export default async function AdminCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [candidate, services, tasks] = await Promise.all([
    getCandidateById(id),
    getCandidateServices(id),
    getCandidateTasks(id),
  ]);

  if (!candidate) notFound();

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
        <Link href="/admin/candidates" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{candidate.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {candidate.sccgId}
            {candidate.submissionId && (
              <span className="ml-2 font-mono text-xs">#{candidate.submissionId.slice(0, 8)}</span>
            )}
            <span className="ml-2 text-xs">Partner: {candidate.partnerName ?? candidate.partnerId}</span>
          </p>
        </div>
        <AdminOnHoldToggle candidateId={candidate.id} isOnHold={candidate.isOnHold ?? false} />
      </div>

      {/* Workflow stepper with advance */}
      <div className="bg-card rounded-2xl border p-6 space-y-4">
        <h2 className="font-semibold">{candidate.workflowCategory} Workflow</h2>
        <WorkflowStepper
          category={candidate.workflowCategory}
          currentStatus={candidate.currentStatus}
          isAdmin={true}
          allowedNext={allowedNext}
        />
        {allowedNext.length > 0 && (
          <CandidateStatusAdvancer candidateId={candidate.id} allowedNext={allowedNext} />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal info */}
        <div className="bg-card rounded-2xl border p-6 space-y-3">
          <h2 className="font-semibold">Personal Information</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {[
              ["Email", candidate.email],
              ["Phone", candidate.phone],
              ["DOB", candidate.dateOfBirth ? format(parseISO(candidate.dateOfBirth), "MMM d, yyyy") : "—"],
              ["Nationality", candidate.nationality],
              ["Country", candidate.country],
              ["Passport", candidate.passportNumber ?? "—"],
              ["National ID", candidate.nationalId ?? "—"],
              ["Payment Status", candidate.paymentStatus.replace(/-/g, " ")],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium capitalize">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Financial */}
        <div className="bg-card rounded-2xl border p-6 space-y-2">
          <h2 className="font-semibold">Financial Split</h2>
          <div className="space-y-1.5 text-sm">
            {[
              ["Total Fee", `€${candidate.totalServiceFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
              [`Partner Share (${candidate.marginPercentage}%)`, `€${candidate.partnerShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
              ["SCCG Share", `€${candidate.sccgShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
              ["Deposit", `€${candidate.depositAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between border-b pb-1 last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Services */}
      {services.length > 0 && (
        <div className="bg-card rounded-2xl border overflow-hidden">
          <div className="px-6 py-4 border-b"><h2 className="font-semibold">Services</h2></div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Service</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {services.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2">{s.serviceName}</td>
                  <td className="px-4 py-2 text-right">€{s.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tasks */}
      {activeTasks.length > 0 && (
        <div className="bg-card rounded-2xl border p-6 space-y-3">
          <h2 className="font-semibold">Open Tasks ({activeTasks.length})</h2>
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

      {/* PDF */}
      <div className="flex items-center gap-3">
        <a
          href={`/api/candidate-pdf?candidateId=${candidate.id}&type=offer`}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <FileText className="w-4 h-4" />Offer PDF
        </a>
        <a
          href={`/api/candidate-pdf?candidateId=${candidate.id}&type=invoice`}
          target="_blank"
          className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <FileText className="w-4 h-4" />Invoice PDF
        </a>
      </div>
    </div>
  );
}
