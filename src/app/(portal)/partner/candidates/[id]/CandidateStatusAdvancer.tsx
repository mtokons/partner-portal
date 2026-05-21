"use client";

import { useState, useTransition } from "react";
import { formatStatusLabel } from "@/lib/engine/candidate-workflow";
import { advanceCandidateStatusAction } from "@/app/(portal)/partner/candidates/actions";
import { Loader2 } from "lucide-react";

interface CandidateStatusAdvancerProps {
  candidateId: string;
  allowedNext: string[];
}

export function CandidateStatusAdvancer({
  candidateId,
  allowedNext,
}: CandidateStatusAdvancerProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleAdvance(nextStatus: string) {
    setError(null);
    startTransition(async () => {
      const result = await advanceCandidateStatusAction(candidateId, nextStatus);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Advance to:</span>
        {allowedNext.map((next) => (
          <button
            key={next}
            onClick={() => handleAdvance(next)}
            disabled={isPending}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            {formatStatusLabel(next)}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
