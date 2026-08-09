"use client";

import { useState } from "react";
import { Package, CreditCard, AlertCircle, Banknote, LockKeyhole, ShieldCheck } from "lucide-react";
import type { WorkflowCategory, CandidateService, CandidatePaymentStatus } from "@/types";
import { WorkflowStepper } from "@/components/candidate/WorkflowStepper";
import { CandidateStatusAdvancer } from "./CandidateStatusAdvancer";
import { ServiceStatusAdvancer } from "./ServiceStatusAdvancer";
import { PaymentNotificationModal } from "./PaymentNotificationModal";
import { setCandidateSpecialApprovalAction } from "../actions";
import { getAllowedTransitions, formatStatusLabel } from "@/lib/engine/candidate-workflow";

interface ServiceWorkflowViewProps {
  services: CandidateService[];
  candidateWorkflowCategory: WorkflowCategory;
  candidateCurrentStatus: string;
  candidateId: string;
  candidateName: string;
  isAdmin: boolean;
  allowedTransitions: string[];
  /** dual-currency formatted amounts keyed by service id */
  formattedPrices: Record<string, string>;
  /** financial summary (formatted strings for display) */
  totalServiceFee: string;
  depositAmount: string;
  partnerShare: string;
  sccgShare: string;
  marginPercentage: number;
  paymentStatus: CandidatePaymentStatus;
  /** raw numbers for payment notification modal */
  totalServiceFeeRaw: number;
  depositRequired: number;
  paidAmountEur: number;
  secondaryCurrency: string;
  exchangeRate: number;
  serviceUnlocked?: boolean;
}

export function ServiceWorkflowView({
  services,
  candidateWorkflowCategory,
  candidateCurrentStatus,
  candidateId,
  candidateName,
  isAdmin,
  allowedTransitions,
  formattedPrices,
  totalServiceFee,
  depositAmount,
  partnerShare,
  sccgShare,
  marginPercentage,
  paymentStatus,
  totalServiceFeeRaw,
  depositRequired,
  paidAmountEur: paidAmountEurProp,
  secondaryCurrency,
  exchangeRate,
  serviceUnlocked: serviceUnlockedProp,
}: ServiceWorkflowViewProps) {
  // Selected service index — null means show primary candidate workflow
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // Local payment state — updated optimistically after recording payment
  const [localPaymentStatus, setLocalPaymentStatus] = useState<CandidatePaymentStatus>(paymentStatus);
  const [localPaidAmount, setLocalPaidAmount] = useState<number>(paidAmountEurProp);

  // Payment modal state: which service triggered it
  const [paymentModal, setPaymentModal] = useState<CandidateService | null>(null);
  // Account-level Add Payment modal (not tied to a specific service)
  const [accountPaymentOpen, setAccountPaymentOpen] = useState(false);
  // Admin "Special Approval" — unlock service start without payment
  const [serviceUnlocked, setServiceUnlocked] = useState<boolean>(!!serviceUnlockedProp);
  const [unlockPending, setUnlockPending] = useState(false);

  async function toggleSpecialApproval() {
    const next = !serviceUnlocked;
    setUnlockPending(true);
    setServiceUnlocked(next); // optimistic
    const res = await setCandidateSpecialApprovalAction(candidateId, next);
    if (!res.success) {
      setServiceUnlocked(!next); // revert
      alert(res.error || "Failed to update Special Approval");
    }
    setUnlockPending(false);
  }

  function handlePaymentSuccess(newPaidAmount: number, newStatus: CandidatePaymentStatus) {
    setLocalPaidAmount(newPaidAmount);
    setLocalPaymentStatus(newStatus);
    setPaymentModal(null);
    setAccountPaymentOpen(false);
  }

  // Determine what workflow to show
  const selectedService = selectedIdx !== null ? services[selectedIdx] : null;
  const activeCategory = selectedService
    ? ((selectedService.workflowCategory || candidateWorkflowCategory) as WorkflowCategory)
    : candidateWorkflowCategory;

  // Per-service status: use the service's own currentStatus field
  const activeStatus = selectedService
    ? (selectedService.currentStatus || "REGISTERED")
    : candidateCurrentStatus;

  const isPrimary = !selectedService;
  const isServiceOwnWorkflow = selectedService !== null && !!selectedService.workflowCategory;
  const noServiceWorkflow = selectedService !== null && !selectedService.workflowCategory;

  // Compute allowed transitions for the active workflow
  const activeAllowed = isPrimary
    ? allowedTransitions
    : getAllowedTransitions(activeCategory, activeStatus);

  // Payment status styling (use local state)
  const paymentStatusStyle =
    localPaymentStatus === "fully-paid"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : localPaymentStatus === "deposit-paid"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";

  const isPaymentPending = localPaymentStatus === "pending" && !serviceUnlocked;

  return (
    <div className="space-y-6">
      {/* Payment gate warning banner */}
      {isPaymentPending && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-5 py-4">
          <LockKeyhole className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-300">Service Workflow Locked</p>
            <p className="text-amber-700 dark:text-amber-400 mt-0.5">
              Initial payment confirmation required before SCCG can start services. Use the
              <span className="font-semibold"> Payment Notification</span> button on any service to record the received amount.
            </p>
          </div>
        </div>
      )}

      {/* Workflow Stepper Card — changes based on selected service */}
      <div className="bg-card rounded-2xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-foreground">{activeCategory} Workflow</h2>
            {isPrimary && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                Primary
              </span>
            )}
            {noServiceWorkflow && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                Uses primary workflow
              </span>
            )}
            {isServiceOwnWorkflow && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                {selectedService!.serviceName}
              </span>
            )}
          </div>
          {selectedService && (
            <button
              onClick={() => setSelectedIdx(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Show primary workflow
            </button>
          )}
        </div>
        <WorkflowStepper
          category={activeCategory}
          currentStatus={activeStatus}
          isAdmin={isAdmin}
          allowedNext={activeAllowed}
        />
        {/* Primary workflow advancer — blocked if payment pending */}
        {isAdmin && isPrimary && allowedTransitions.length > 0 && (
          isPaymentPending ? (
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3">
              <LockKeyhole className="w-4 h-4 shrink-0" />
              Status advancement is locked until initial payment is confirmed.
            </div>
          ) : (
            <CandidateStatusAdvancer
              candidateId={candidateId}
              candidateName={candidateName}
              currentStatus={candidateCurrentStatus}
              allowedNext={allowedTransitions}
            />
          )
        )}
        {/* Per-service workflow advancer */}
        {isAdmin && !isPrimary && isServiceOwnWorkflow && activeAllowed.length > 0 && selectedService && (
          <ServiceStatusAdvancer
            serviceId={selectedService.id}
            serviceName={selectedService.serviceName}
            candidateId={candidateId}
            candidateName={candidateName}
            currentStatus={activeStatus}
            workflowCategory={activeCategory}
            allowedNext={activeAllowed}
          />
        )}
      </div>

      {/* Single Services Table */}
      <div className="bg-card rounded-2xl border overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Services ({services.length})</h2>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">Click row to view workflow · Use Payment Notification to record payments</span>
        </div>
        {services.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No services registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Service</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Workflow</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qty</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {services.map((s, idx) => {
                const isActive = selectedIdx === idx;
                const svcCat = s.workflowCategory || candidateWorkflowCategory;
                return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedIdx(isActive ? null : idx)}
                    className={`cursor-pointer transition-colors ${
                      isActive
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium">{s.serviceName}</span>
                      <span className="text-muted-foreground ml-2 text-xs capitalize">
                        {s.packageType.replace(/-/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-primary/10 text-primary">
                        {svcCat}
                      </span>
                      {!s.workflowCategory && (
                        <span className="ml-1 text-[10px] text-muted-foreground">(inherited)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {formatStatusLabel(s.currentStatus || "REGISTERED")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{s.quantity}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formattedPrices[s.id] ?? `€${s.totalPrice.toFixed(2)}`}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setPaymentModal(s)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors whitespace-nowrap border border-emerald-200 dark:border-emerald-800"
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        Payment
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
        {services.length > 0 && (
          <div className="px-4 py-2 text-[11px] text-muted-foreground border-t bg-muted/20">
            Click a service row to view its workflow progress
          </div>
        )}
      </div>

      {/* Payment & Account Status */}
      <div className="bg-card rounded-2xl border p-6 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold text-foreground">Payment & Account Status</h2>
            {serviceUnlocked && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold inline-flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Special Approval
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={toggleSpecialApproval}
                disabled={unlockPending}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                  serviceUnlocked
                    ? "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
                }`}
                title="Unlock service start without payment (admin override)"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                {serviceUnlocked ? "Revoke Approval" : "Special Approval"}
              </button>
            )}
            <button
              onClick={() => setAccountPaymentOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              <Banknote className="w-3.5 h-3.5" />
              Add Payment
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Fee</p>
            <p className="font-semibold text-foreground">{totalServiceFee}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Required Deposit</p>
            <p className="font-semibold text-foreground">{depositAmount}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Partner Share ({marginPercentage}%)</p>
            <p className="font-semibold text-green-600 dark:text-green-400">{partnerShare}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">SCCG Share</p>
            <p className="font-semibold text-foreground">{sccgShare}</p>
          </div>
        </div>
        {/* Payment progress bar */}
        {totalServiceFeeRaw > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-semibold text-foreground">€{localPaidAmount.toFixed(2)} / €{totalServiceFeeRaw.toFixed(2)}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (localPaidAmount / totalServiceFeeRaw) * 100).toFixed(1)}%` }}
              />
            </div>
            {depositRequired > 0 && localPaidAmount < depositRequired && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Required deposit: €{depositRequired.toFixed(2)} · Remaining: €{Math.max(0, depositRequired - localPaidAmount).toFixed(2)}
              </p>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 pt-1">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${paymentStatusStyle}`}>
            {localPaymentStatus.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
          {localPaymentStatus === "pending" && (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3 h-3" />
              Awaiting initial payment — use Payment Notification button to record
            </span>
          )}
          {localPaymentStatus === "deposit-paid" && (
            <span className="text-xs text-muted-foreground">
              Deposit received — remaining balance due before completion
            </span>
          )}
          {localPaymentStatus === "fully-paid" && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Full payment received
            </span>
          )}
        </div>
      </div>

      {/* Payment Notification Modal */}
      {paymentModal && (
        <PaymentNotificationModal
          candidateId={candidateId}
          candidateName={candidateName}
          serviceId={paymentModal.id}
          serviceName={paymentModal.serviceName}
          serviceTotal={paymentModal.totalPrice}
          depositRequired={depositRequired}
          alreadyPaid={localPaidAmount}
          totalServiceFee={totalServiceFeeRaw}
          secondaryCurrency={secondaryCurrency}
          exchangeRate={exchangeRate}
          onClose={() => setPaymentModal(null)}
          onSuccess={handlePaymentSuccess}
        />
      )}

      {/* Account-level Add Payment Modal */}
      {accountPaymentOpen && (
        <PaymentNotificationModal
          candidateId={candidateId}
          candidateName={candidateName}
          serviceName="Account Payment"
          serviceTotal={totalServiceFeeRaw}
          depositRequired={depositRequired}
          alreadyPaid={localPaidAmount}
          totalServiceFee={totalServiceFeeRaw}
          secondaryCurrency={secondaryCurrency}
          exchangeRate={exchangeRate}
          onClose={() => setAccountPaymentOpen(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
