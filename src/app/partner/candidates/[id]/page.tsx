import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import {
  getCandidateById,
  getCandidateServices,
  getCandidateTasks,
  getPartnerByEmail,
} from "@/lib/sharepoint";
import { getEurToRate } from "@/lib/currency";
import { dual } from "@/lib/formatCurrency";
import { getAllowedTransitions } from "@/lib/engine/candidate-workflow";
import { format, parseISO, isPast } from "date-fns";
import { ArrowLeft, AlertCircle, FileText, CreditCard, ClipboardList, ShoppingBag } from "lucide-react";
import { isAdminEquivalent } from "@/lib/admin-guard";
import { getCandidateDocumentsAction } from "../actions";
import CandidateDocumentsSection from "./CandidateDocumentsSection";
import { ServiceWorkflowView } from "./ServiceWorkflowView";

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
  return CandidateDetail({ id, routeBase: "/partner/candidates" });
}

export async function CandidateDetail({ id, routeBase }: { id: string; routeBase: string }) {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = (user.roles || [user.role]) as string[];
  const isAdmin = isAdminEquivalent(roles);

  const [candidate, services, tasks] = await Promise.all([
    getCandidateById(id),
    getCandidateServices(id),
    getCandidateTasks(id),
  ]);

  if (!candidate) notFound();

  let activeMargin = user.marginPercentage;
  let secCur = "BDT";

  if (!isAdmin) {
    const partner = await getPartnerByEmail(user.email!);
    if (!partner || candidate.partnerId !== partner.id) notFound();
    activeMargin = partner.marginPercentage;
    secCur = partner.preferredCurrency || "BDT";
  } else {
    activeMargin = candidate.marginPercentage;
  }

  const rate = secCur !== "EUR" ? await getEurToRate(secCur) : 1;
  const d = (v: number) => dual(v, secCur, rate);

  const docsRes = await getCandidateDocumentsAction(candidate.id, candidate.fullName);
  const initialDocuments = docsRes.success && docsRes.data ? docsRes.data : [];

  // Parse payment history from notes JSON
  let paidAmountEur = 0;
  try {
    if (candidate.notes?.trim().startsWith("{")) {
      const notesData = JSON.parse(candidate.notes);
      paidAmountEur = (notesData.paidAmountEur as number) || 0;
    }
  } catch { /* ignore */ }

  const activeTasks = tasks.filter(
    (t) => t.status === "todo" || t.status === "in-progress"
  );

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href={routeBase}
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

      {/* Workflow + Services + Payment — interactive client component */}
      <ServiceWorkflowView
        services={services}
        candidateWorkflowCategory={candidate.workflowCategory}
        candidateCurrentStatus={candidate.currentStatus}
        candidateId={candidate.id}
        candidateName={candidate.fullName}
        isAdmin={isAdmin}
        allowedTransitions={getAllowedTransitions(candidate.workflowCategory, candidate.currentStatus as string)}
        formattedPrices={Object.fromEntries(services.map((s) => [s.id, d(s.totalPrice)]))}
        totalServiceFee={d(candidate.totalServiceFee)}
        depositAmount={d(candidate.depositAmount)}
        partnerShare={d(candidate.partnerShare)}
        sccgShare={d(candidate.sccgShare)}
        marginPercentage={candidate.marginPercentage}
        paymentStatus={candidate.paymentStatus}
        totalServiceFeeRaw={candidate.totalServiceFee}
        depositRequired={candidate.depositAmount}
        paidAmountEur={paidAmountEur}
        secondaryCurrency={secCur}
        exchangeRate={rate}
        serviceUnlocked={candidate.serviceUnlocked}
      />

      {/* Register Service */}
      <div className="flex items-center">
        <Link
          href={`${routeBase}/new?candidateId=${candidate.id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
        >
          <ShoppingBag className="w-4 h-4" /> Register Service
        </Link>
      </div>

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

      {/* Client Service Timeline Placeholder */}
      <div className="bg-card rounded-2xl border p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Client Service Timeline</h2>
        <div className="relative border-l-2 border-primary/20 ml-3 space-y-6">
          <div className="relative pl-6">
            <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary ring-4 ring-background" />
            <p className="text-sm font-semibold">Candidate Registered</p>
            <p className="text-xs text-muted-foreground mt-0.5">{candidate.createdAt ? format(parseISO(candidate.createdAt), "MMM d, yyyy h:mm a") : "—"}</p>
          </div>
          
          <div className="relative pl-6">
            <div className={`absolute -left-[5px] top-1 h-2 w-2 rounded-full ring-4 ring-background ${candidate.paymentStatus !== 'pending' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
            <p className="text-sm font-semibold">Payment Received</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {candidate.paymentStatus !== 'pending' ? "Payment completed" : "Awaiting payment"}
            </p>
          </div>
          
          <div className="relative pl-6">
            <div className={`absolute -left-[5px] top-1 h-2 w-2 rounded-full ring-4 ring-background ${candidate.currentStatus !== candidate.workflowCategory + '_step1' ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
            <p className="text-sm font-semibold">Service Started</p>
            <p className="text-xs text-muted-foreground mt-0.5">
               {candidate.currentStatus.replace(/_/g, " ")}
            </p>
          </div>
        </div>
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
