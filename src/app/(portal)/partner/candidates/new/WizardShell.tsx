"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import type { WorkflowCategory, PartnerMargin } from "@/types";
import type { FinancialSplitResult } from "@/lib/engine/financial-split";
import { Step1Lookup } from "./steps/Step1Lookup";
import { Step2PersonalInfo } from "./steps/Step2PersonalInfo";
import { Step3ServicePackage } from "./steps/Step3ServicePackage";
import { Step4FinancialSplit } from "./steps/Step4FinancialSplit";
import { Step5Payment } from "./steps/Step5Payment";
import { Step6Documents } from "./steps/Step6Documents";
import { Step7Finalizer } from "./steps/Step7Finalizer";

export interface SelectedService {
  servicePricingId: string;
  serviceName: string;
  packageType: "all-inclusive" | "premium-bundle" | "add-on";
  basePrice: number;
  quantity: number;
}

export interface WizardState {
  step: number;
  existingCandidateId?: string;
  isNewCandidate: boolean;
  personalInfo: {
    fullName: string;
    dateOfBirth: string;
    email: string;
    phone: string;
    address?: string;
    passportNumber?: string;
    nationalId?: string;
    nationality: string;
    country: string;
    workflowCategory: WorkflowCategory;
  };
  selectedServices: SelectedService[];
  financialSplit?: FinancialSplitResult;
  paymentOption: "pay-now" | "pay-later";
  paymentMethod?: string;
  paymentReference?: string;
  uploadedDocuments: { documentType: string; fileUrl: string; fileName: string }[];
  submissionResult?: { submissionId: string; candidateId: string };
}

const STEP_LABELS = [
  "Lookup",
  "Personal Info",
  "Services",
  "Financial Split",
  "Payment",
  "Documents",
  "Submit",
];

const INITIAL_STATE: WizardState = {
  step: 1,
  isNewCandidate: true,
  personalInfo: {
    fullName: "",
    dateOfBirth: "",
    email: "",
    phone: "",
    nationality: "",
    country: "",
    workflowCategory: "Training",
  },
  selectedServices: [],
  paymentOption: "pay-later",
  uploadedDocuments: [],
};

interface WizardShellProps {
  partnerMargin: PartnerMargin;
  partnerId: string;
}

export function WizardShell({ partnerMargin, partnerId }: WizardShellProps) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);

  function onNext(partial: Partial<WizardState>) {
    setState((prev) => ({
      ...prev,
      ...partial,
      step: prev.step + 1,
    }));
  }

  function onBack() {
    setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  }

  const currentStep = state.step;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      {currentStep <= 7 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1;
              const isDone = stepNum < currentStep;
              const isCurrent = stepNum === currentStep;
              return (
                <div key={label} className="flex flex-col items-center flex-1">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      isDone
                        ? "bg-primary border-primary text-primary-foreground"
                        : isCurrent
                        ? "border-primary text-primary bg-primary/5"
                        : "border-muted-foreground/30 text-muted-foreground/40"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
                  </div>
                  <p
                    className={`text-[10px] mt-1 text-center ${
                      isCurrent ? "text-primary font-semibold" : "text-muted-foreground/50"
                    }`}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="relative h-1 bg-muted rounded-full overflow-hidden mt-1">
            <div
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300"
              style={{ width: `${((currentStep - 1) / 6) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="bg-card rounded-2xl border p-6">
        {currentStep === 1 && (
          <Step1Lookup
            onNext={(partial) => onNext({ ...partial, step: undefined })}
            onNextStep={() => onNext({})}
          />
        )}
        {currentStep === 2 && (
          <Step2PersonalInfo
            initialData={state.personalInfo}
            onNext={(personalInfo) => onNext({ personalInfo })}
            onBack={onBack}
          />
        )}
        {currentStep === 3 && (
          <Step3ServicePackage
            workflowCategory={state.personalInfo.workflowCategory}
            selectedServices={state.selectedServices}
            onNext={(selectedServices) => onNext({ selectedServices })}
            onBack={onBack}
          />
        )}
        {currentStep === 4 && (
          <Step4FinancialSplit
            selectedServices={state.selectedServices}
            partnerMargin={partnerMargin}
            onNext={(financialSplit) => onNext({ financialSplit })}
            onBack={onBack}
          />
        )}
        {currentStep === 5 && (
          <Step5Payment
            depositAmount={state.financialSplit?.depositAmount ?? 0}
            onNext={(paymentData) => onNext(paymentData)}
            onBack={onBack}
          />
        )}
        {currentStep === 6 && (
          <Step6Documents
            workflowCategory={state.personalInfo.workflowCategory}
            candidateId={state.existingCandidateId}
            onNext={(uploadedDocuments) => onNext({ uploadedDocuments })}
            onBack={onBack}
          />
        )}
        {currentStep === 7 && (
          <Step7Finalizer
            state={state}
            partnerMargin={partnerMargin}
            partnerId={partnerId}
            onDone={(result) =>
              setState((prev) => ({ ...prev, submissionResult: result, step: 8 }))
            }
            onBack={onBack}
          />
        )}
        {currentStep === 8 && state.submissionResult && (
          <div className="text-center space-y-4 py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">Candidate Registered!</h2>
            <p className="text-muted-foreground text-sm">
              Submission ID:{" "}
              <span className="font-mono font-bold text-foreground">
                {state.submissionResult.submissionId}
              </span>
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href={`/partner/candidates/${state.submissionResult.candidateId}`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                View Candidate →
              </a>
              <button
                onClick={() => setState(INITIAL_STATE)}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Register Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
