"use client";

import { useState, useTransition } from "react";
import { ArrowRight } from "lucide-react";
import { formatStatusLabel } from "@/lib/engine/candidate-workflow";
import { advanceCandidateStatusAction } from "@/app/partner/candidates/actions";
import { AdvanceStatusModal } from "./AdvanceStatusModal";

interface CandidateStatusAdvancerProps {
  candidateId: string;
  candidateName: string;
  currentStatus: string;
  allowedNext: string[];
}

export function CandidateStatusAdvancer({
  candidateId,
  candidateName,
  currentStatus,
  allowedNext,
}: CandidateStatusAdvancerProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);

  function handleConfirm(comment: string) {
    if (!pendingStatus) return;
    setError(null);
    startTransition(async () => {
      const result = await advanceCandidateStatusAction(candidateId, pendingStatus, comment || undefined);
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
        candidateName={candidateName}
        fromStatus={currentStatus}
        toStatus={pendingStatus ?? ""}
        isPending={isPending}
        onConfirm={handleConfirm}
        onClose={() => { if (!isPending) setPendingStatus(null); }}
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Advance to:</span>
          {allowedNext.map((next) => (
            <button
              key={next}
              onClick={() => setPendingStatus(next)}
              disabled={isPending}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
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

