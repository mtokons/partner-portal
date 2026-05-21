"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import {
  WORKFLOW_ORDERED_STATUSES,
  formatStatusLabel,
  isOptionalStatus,
} from "@/lib/engine/candidate-workflow";
import type { WorkflowCategory, CandidateStatus } from "@/types";

interface WorkflowStepperProps {
  category: WorkflowCategory;
  currentStatus: CandidateStatus;
  isAdmin?: boolean;
  onAdvance?: (nextStatus: string) => void;
  allowedNext?: string[];
  advancing?: boolean;
}

export function WorkflowStepper({
  category,
  currentStatus,
  isAdmin,
  onAdvance,
  allowedNext = [],
  advancing,
}: WorkflowStepperProps) {
  const steps = WORKFLOW_ORDERED_STATUSES[category];
  const currentIdx = steps.indexOf(currentStatus as string);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {steps.map((step, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isOptional = isOptionalStatus(category, step);

          return (
            <div key={step} className="flex items-center shrink-0">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isDone
                      ? "bg-primary border-primary text-primary-foreground"
                      : isCurrent
                      ? "border-primary text-primary"
                      : "border-muted-foreground/30 text-muted-foreground/40"
                  } ${isOptional ? "opacity-70" : ""}`}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isCurrent && advancing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                <p
                  className={`text-[10px] mt-1 text-center max-w-[72px] leading-tight ${
                    isCurrent ? "text-primary font-semibold" : isDone ? "text-foreground" : "text-muted-foreground/50"
                  } ${isOptional ? "italic" : ""}`}
                >
                  {formatStatusLabel(step)}
                  {isOptional && <span className="block not-italic text-[9px]">(opt)</span>}
                </p>
              </div>

              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 w-8 shrink-0 mx-0.5 mt-[-20px] ${
                    i < currentIdx ? "bg-primary" : "bg-muted-foreground/20"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {isAdmin && allowedNext.length > 0 && onAdvance && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Advance to:</span>
          {allowedNext.map((next) => (
            <button
              key={next}
              onClick={() => onAdvance(next)}
              disabled={advancing}
              className="text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {formatStatusLabel(next)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
