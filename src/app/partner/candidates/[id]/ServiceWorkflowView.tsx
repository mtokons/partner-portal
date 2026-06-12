"use client";

import { useState } from "react";
import { Package, CreditCard, AlertCircle } from "lucide-react";
import type { WorkflowCategory, CandidateService, CandidatePaymentStatus } from "@/types";
import { WorkflowStepper } from "@/components/candidate/WorkflowStepper";
import { CandidateStatusAdvancer } from "./CandidateStatusAdvancer";
import { ServiceStatusAdvancer } from "./ServiceStatusAdvancer";
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
  /** financial summary */
  totalServiceFee: string;
  depositAmount: string;
  partnerShare: string;
  sccgShare: string;
  marginPercentage: number;
  paymentStatus: CandidatePaymentStatus;
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
}: ServiceWorkflowViewProps) {
  // Selected service index — null means show primary candidate workflow
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

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

  // Payment status styling
  const paymentStatusStyle =
    paymentStatus === "fully-paid"
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : paymentStatus === "deposit-paid"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";

  return (
    <div className="space-y-6">
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
        {/* Primary workflow advancer */}
        {isAdmin && isPrimary && allowedTransitions.length > 0 && (
          <CandidateStatusAdvancer
            candidateId={candidateId}
            candidateName={candidateName}
            currentStatus={candidateCurrentStatus}
            allowedNext={allowedTransitions}
          />
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
        </div>
        {services.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground text-sm">
            No services registered yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30">
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Service</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Workflow</th>
                <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Qty</th>
                <th className="text-right px-4 py-2 font-medium text-muted-foreground">Total</th>
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {services.length > 0 && (
          <div className="px-4 py-2 text-[11px] text-muted-foreground border-t bg-muted/20">
            Click a service to view its workflow progress
          </div>
        )}
      </div>

      {/* Payment & Account Status */}
      <div className="bg-card rounded-2xl border p-6 space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Payment & Account Status</h2>
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
        <div className="flex items-center gap-2 pt-1">
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${paymentStatusStyle}`}>
            {paymentStatus.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
          {paymentStatus === "pending" && (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-3 h-3" />
              Payment pending — please remind the candidate
            </span>
          )}
          {paymentStatus === "deposit-paid" && (
            <span className="text-xs text-muted-foreground">
              Deposit received — remaining balance due before completion
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
