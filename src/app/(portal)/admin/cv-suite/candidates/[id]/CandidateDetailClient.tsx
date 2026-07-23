"use client";

import { useState } from "react";
import Link from "next/link";
import { format, parseISO, isPast } from "date-fns";
import {
  ArrowLeft,
  User,
  DollarSign,
  FileText,
  ClipboardList,
  Download,
  History,
  AlertCircle,
  CreditCard,
  PauseCircle,
  CheckCircle2,
} from "lucide-react";
import { WorkflowStepper } from "@/components/candidate/WorkflowStepper";
import { getAllowedTransitions, formatStatusLabel } from "@/lib/engine/candidate-workflow";
import { cn } from "@/lib/utils";
import type { CandidateDetail } from "../../actions";

const TABS = [
  { key: "overview", label: "Overview", icon: User },
  { key: "finance", label: "Services & Finance", icon: DollarSign },
  { key: "documents", label: "Documents", icon: FileText },
  { key: "tasks", label: "Tasks", icon: ClipboardList },
  { key: "export", label: "Export", icon: Download },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const TASK_ICON: Record<string, typeof FileText> = {
  "Document Required": FileText,
  "Payment Due": CreditCard,
  "General Task": ClipboardList,
};
const TASK_COLOR: Record<string, string> = {
  "Document Required": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Payment Due": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  "General Task": "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export function CandidateDetailClient({ detail }: { detail: CandidateDetail }) {
  const { candidate, services, tasks } = detail;
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const allowedNext = getAllowedTransitions(
    candidate.workflowCategory,
    candidate.currentStatus as string
  );
  const activeTasks = tasks.filter(
    (t) => t.status === "todo" || t.status === "in-progress"
  );
  const completedTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/cv-suite/candidates"
          className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">
                {candidate.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{candidate.fullName}</h2>
              <p className="text-sm text-muted-foreground">
                {candidate.sccgId}
                <span className="mx-2">·</span>
                {candidate.workflowCategory}
                <span className="mx-2">·</span>
                {formatStatusLabel(candidate.currentStatus as string)}
              </p>
            </div>
          </div>
        </div>
        {candidate.isOnHold && (
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
            <PauseCircle className="w-3.5 h-3.5" />
            On Hold
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200",
              activeTab === tab.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.key === "tasks" && activeTasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded-full bg-primary text-primary-foreground font-bold">
                {activeTasks.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-200">
        {/* ── Overview Tab ────────────────────────────────────── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Workflow Stepper */}
            <div className="bg-card rounded-2xl border p-6 space-y-4">
              <h3 className="font-semibold text-foreground">
                {candidate.workflowCategory} Workflow
              </h3>
              <WorkflowStepper
                category={candidate.workflowCategory}
                currentStatus={candidate.currentStatus}
                isAdmin={true}
                allowedNext={allowedNext}
              />
            </div>

            {/* Personal Info */}
            <div className="bg-card rounded-2xl border p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Personal Information</h3>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                {([
                  ["Full Name", candidate.fullName],
                  ["Email", candidate.email],
                  ["Phone", candidate.phone],
                  ["Date of Birth", candidate.dateOfBirth ? format(parseISO(candidate.dateOfBirth), "MMM d, yyyy") : "—"],
                  ["Nationality", candidate.nationality],
                  ["Country", candidate.country],
                  ["Passport #", candidate.passportNumber ?? "—"],
                  ["National ID", candidate.nationalId ?? "—"],
                  ["Partner", candidate.partnerName ?? candidate.partnerId],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-muted-foreground text-xs uppercase tracking-wider mb-1">{label}</dt>
                    <dd className="font-medium text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
              {candidate.address && (
                <div className="text-sm pt-2 border-t">
                  <dt className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Address</dt>
                  <dd className="font-medium text-foreground">{candidate.address}</dd>
                </div>
              )}
              {candidate.notes && (
                <div className="text-sm pt-2 border-t">
                  <dt className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Notes</dt>
                  <dd className="text-foreground whitespace-pre-wrap">{candidate.notes}</dd>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Finance Tab ─────────────────────────────────────── */}
        {activeTab === "finance" && (
          <div className="space-y-6">
            {/* Financial Split */}
            <div className="bg-card rounded-2xl border p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Financial Split</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {([
                  ["Total Fee", candidate.totalServiceFee, "text-foreground"],
                  [`Partner (${candidate.marginPercentage}%)`, candidate.partnerShare, "text-blue-600 dark:text-blue-400"],
                  ["SCCG Share", candidate.sccgShare, "text-emerald-600 dark:text-emerald-400"],
                  ["Deposit", candidate.depositAmount, "text-violet-600 dark:text-violet-400"],
                ] as [string, number, string][]).map(([label, amount, color]) => (
                  <div key={label} className="p-4 rounded-xl bg-muted/30 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className={cn("text-lg font-bold tabular-nums", color)}>
                      €{amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-muted-foreground">Payment Status:</span>
                <span
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium",
                    candidate.paymentStatus === "fully-paid"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : candidate.paymentStatus === "deposit-paid"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  )}
                >
                  {candidate.paymentStatus.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </div>
            </div>

            {/* Services Table */}
            {services.length > 0 && (
              <div className="bg-card rounded-2xl border overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h3 className="font-semibold text-foreground">Selected Services</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Service</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Price</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Qty</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {services.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-medium">{s.serviceName}</td>
                        <td className="px-4 py-3 text-muted-foreground capitalize">
                          {s.packageType.replace(/-/g, " ")}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          €{s.basePrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3 text-right">{s.quantity}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          €{s.totalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t bg-muted/10">
                      <td colSpan={4} className="px-4 py-3 text-right font-semibold text-muted-foreground">
                        Total
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        €{candidate.totalServiceFee.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Documents Tab ───────────────────────────────────── */}
        {activeTab === "documents" && (
          <div className="bg-card rounded-2xl border p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Document Checklist</h3>
            <p className="text-sm text-muted-foreground">
              Documents uploaded via the registration wizard are stored in SharePoint.
              Full integration with real-time document tracking is coming soon.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {getRequiredDocs(candidate.workflowCategory).map((doc) => (
                <div
                  key={doc}
                  className="flex items-center gap-3 p-3 rounded-xl border bg-muted/20"
                >
                  <div className="p-1.5 rounded-lg bg-muted">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium flex-1">{doc}</span>
                  <span className="text-xs text-muted-foreground">Pending</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tasks Tab ───────────────────────────────────────── */}
        {activeTab === "tasks" && (
          <div className="space-y-6">
            {activeTasks.length > 0 && (
              <div className="bg-card rounded-2xl border p-6 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Active Tasks ({activeTasks.length})
                </h3>
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
                            <p className={cn("text-xs mt-0.5 flex items-center gap-1", isOverdue ? "text-red-500" : "text-muted-foreground")}>
                              {isOverdue && <AlertCircle className="w-3 h-3" />}
                              Due {format(parseISO(task.dueDate), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                        <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", task.status === "in-progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-muted text-muted-foreground")}>
                          {task.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {completedTasks.length > 0 && (
              <div className="bg-card rounded-2xl border p-6 space-y-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  Completed ({completedTasks.length})
                </h3>
                <div className="space-y-2">
                  {completedTasks.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 opacity-60">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-sm line-through">{task.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tasks.length === 0 && (
              <div className="bg-card rounded-2xl border p-8 text-center">
                <p className="text-sm text-muted-foreground">No tasks assigned yet.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Export Tab ───────────────────────────────────────── */}
        {activeTab === "export" && (
          <div className="bg-card rounded-2xl border p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Export Documents</h3>
            <p className="text-sm text-muted-foreground">
              Generate and download PDF documents for this candidate.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={`/api/candidate-pdf?candidateId=${candidate.id}&type=offer`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-4 rounded-xl border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
              >
                <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Service Offer PDF</p>
                  <p className="text-xs text-muted-foreground">Branded offer with services & pricing</p>
                </div>
                <Download className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary" />
              </a>

              <a
                href={`/api/candidate-pdf?candidateId=${candidate.id}&type=invoice`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-4 rounded-xl border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
              >
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Invoice PDF</p>
                  <p className="text-xs text-muted-foreground">Payment details & balance due</p>
                </div>
                <Download className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary" />
              </a>

              <a
                href={`/api/cv-suite/export?id=${candidate.id}&content=cv&format=pdf-individual`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-4 rounded-xl border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
              >
                <div className="p-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Candidate CV PDF</p>
                  <p className="text-xs text-muted-foreground">Professional profile summary</p>
                </div>
                <Download className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary" />
              </a>

              <a
                href={`/api/cv-suite/export?id=${candidate.id}&content=dossier&format=pdf-individual`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-4 p-4 rounded-xl border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
              >
                <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Full Dossier PDF</p>
                  <p className="text-xs text-muted-foreground">Complete candidate file</p>
                </div>
                <Download className="w-4 h-4 ml-auto text-muted-foreground group-hover:text-primary" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper
function getRequiredDocs(category: string): string[] {
  const map: Record<string, string[]> = {
    Training: ["Passport Copy", "CV/Resume", "Educational Certificates"],
    Ausbildung: ["Passport Copy", "CV/Resume", "Educational Certificates", "German Course Certificate", "Academic Transcripts"],
    "Student Visa": ["Passport Copy", "CV/Resume", "Educational Certificates", "Language Proficiency", "University Application"],
    "Opportunity Card": ["Passport Copy", "CV/Resume", "Educational Certificates", "Work Experience Letters", "ZAB Documents"],
  };
  return map[category] ?? ["Passport Copy", "CV/Resume"];
}
