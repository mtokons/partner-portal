"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { formatStatusLabel } from "@/lib/engine/candidate-workflow";
import { advanceServiceStatusAction } from "@/app/partner/candidates/actions";
import { AdvanceStatusModal } from "./AdvanceStatusModal";
import type { WorkflowCategory } from "@/types";

interface ServiceStatusAdvancerProps {
  serviceId: string;
  serviceName: string;
  candidateId: string;
  candidateName: string;
  currentStatus: string;
  workflowCategory: WorkflowCategory;
  allowedNext: string[];
}

export function ServiceStatusAdvancer({
  serviceId,
  serviceName,
  candidateId,
  candidateName,
  currentStatus,
  workflowCategory,
  allowedNext,
}: ServiceStatusAdvancerProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  function handleConfirm(comment: string) {
    if (!pendingStatus) return;
    setError(null);
    startTransition(async () => {
      const result = await advanceServiceStatusAction(
        serviceId,
        candidateId,
        workflowCategory,
        currentStatus,
        pendingStatus,
        comment || undefined
      );
      if (result?.error) {
        setError(result.error);
      } else {
        setPendingStatus(null);
      }
    });
  }

  return (
    <>
      <AdvanceStatusModal
        isOpen={!!pendingStatus}
        candidateName={`${candidateName} — ${serviceName}`}
        fromStatus={currentStatus}
        toStatus={pendingStatus ?? ""}
        isPending={isPending}
        onConfirm={handleConfirm}
        onClose={() => { if (!isPending) setPendingStatus(null); }}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Advance service to:</span>
          {allowedNext.map((next) => (
            <button
              key={next}
              onClick={() => setPendingStatus(next)}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              {formatStatusLabel(next)}
              <ArrowRight className="w-3 h-3" />
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    </>
  );
}
