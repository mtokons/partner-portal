"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import type { WorkflowCategory, PartnerMargin, Product } from "@/types";
import type { FinancialSplitResult } from "@/lib/engine/financial-split";
import { Step2PersonalInfo } from "./steps/Step2PersonalInfo";
import { Step3ServicePackage } from "./steps/Step3ServicePackage";
import { Step4FinancialSplit } from "./steps/Step4FinancialSplit";
import { Step5Payment } from "./steps/Step5Payment";
import { Step6ReviewSubmit } from "./steps/Step6ReviewSubmit";
import { Step7Documents } from "./steps/Step7Documents";

export interface SelectedService {
  servicePricingId: string;
  serviceName: string;
  packageType: "all-inclusive" | "premium-bundle" | "add-on";
  basePrice: number;
  quantity: number;
  initialPaymentAmount?: number;
  workflowCategory?: string;
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
  submissionResult?: { candidateId: string; submissionId?: string };
}

// 6-step flow for new candidates, 5-step flow for existing (skip personal info)
const STEP_LABELS_NEW = [
  "Personal Info",
  "Services",
  "Financial Split",
  "Payment",
  "Submit",
  "Documents",
];
const STEP_LABELS_EXISTING = [
  "Services",
  "Financial Split",
  "Payment",
  "Submit",
];

interface ExistingCandidateData {
  id: string;
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
}

interface WizardShellProps {
  partnerMargin: PartnerMargin;
  partnerId: string;
  products: Product[];
  secondaryCurrency?: string;
  exchangeRate?: number;
  existingCandidate?: ExistingCandidateData;
  /** Admin/SCCG direct-sale mode — adjusts navigation links */
  adminMode?: boolean;
  /** Pre-fill personal info from booking */
  prefill?: { name: string; email: string; phone: string; notes: string };
}

export function WizardShell({
  partnerMargin,
  partnerId,
  products,
  secondaryCurrency = "EUR",
  exchangeRate = 1,
  existingCandidate,
  adminMode = false,
  prefill,
}: WizardShellProps) {
  const candidatesPath = adminMode ? "/admin/candidates" : "/partner/candidates";
  const newCandidatePath = adminMode ? "/admin/candidates/new" : "/partner/candidates/new";
  const router = useRouter();

  const initialState: WizardState = {
    step: existingCandidate ? 2 : 1,
    isNewCandidate: !existingCandidate,
    existingCandidateId: existingCandidate?.id,
    personalInfo: existingCandidate
      ? {
          fullName: existingCandidate.fullName,
          dateOfBirth: existingCandidate.dateOfBirth || "",
          email: existingCandidate.email,
          phone: existingCandidate.phone,
          address: existingCandidate.address || "",
          passportNumber: existingCandidate.passportNumber || "",
          nationalId: existingCandidate.nationalId || "",
          nationality: existingCandidate.nationality,
          country: existingCandidate.country,
          workflowCategory: existingCandidate.workflowCategory || "Training & Language",
        }
      : {
          fullName: prefill?.name || "",
          dateOfBirth: "",
          email: prefill?.email || "",
          phone: prefill?.phone || "",
          nationality: "",
          country: "",
          workflowCategory: "Training & Language",
        },
    selectedServices: [],
    paymentOption: "pay-later",
    uploadedDocuments: [],
  };

  const [state, setState] = useState<WizardState>(initialState);

  function onNext(partial: Partial<WizardState> & { targetStep?: number }) {
    setState((prev) => {
      const nextStep = partial.targetStep ?? (prev.step + 1);
      let personalInfo = prev.personalInfo;
      if (partial.personalInfo) {
        personalInfo = { ...prev.personalInfo, ...partial.personalInfo };
      }
      return { ...prev, ...partial, personalInfo, step: nextStep };
    });
  }

  function onBack() {
    setState((prev) => ({ ...prev, step: Math.max(1, prev.step - 1) }));
  }

  const currentStep = state.step;
  const isExisting = !!existingCandidate;
  const STEP_LABELS = isExisting ? STEP_LABELS_EXISTING : STEP_LABELS_NEW;
  // For existing candidates, steps 2-6 internally but displayed as 1-5
  const displayStep = isExisting ? currentStep - 1 : currentStep;
  const totalSteps = STEP_LABELS.length;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      {displayStep <= totalSteps && (
        <div>
          <div className="flex items-center justify-between mb-2">
            {STEP_LABELS.map((label, i) => {
              const stepNum = i + 1;
              const isDone = stepNum < displayStep;
              const isCurrent = stepNum === displayStep;
              return (
                <div key={label} className="flex flex-col items-center flex-1">
                  <button
                    onClick={() => {
                      if (isDone) {
                        const internalStep = isExisting ? stepNum + 1 : stepNum;
                        setState((prev) => ({ ...prev, step: internalStep }));
                      }
                    }}
                    disabled={!isDone}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                      isDone
                        ? "bg-primary border-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                        : isCurrent
                        ? "border-primary text-primary bg-primary/5 cursor-default"
                        : "border-muted-foreground/30 text-muted-foreground/40 cursor-not-allowed"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="w-4 h-4" /> : stepNum}
                  </button>
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
              style={{ width: `${((displayStep - 1) / (totalSteps - 1)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="bg-card rounded-2xl border p-6">
        {currentStep === 1 && (
          <Step2PersonalInfo
            initialData={state.personalInfo}
            products={products}
            isExistingCandidate={!!state.existingCandidateId}
            onNext={(personalInfo) => onNext({ personalInfo })}
            onBack={() => router.push(candidatesPath)}
          />
        )}
        {currentStep === 2 && (
          <Step3ServicePackage
            workflowCategory={state.personalInfo.workflowCategory}
            selectedServices={state.selectedServices}
            products={products}
            onNext={(selectedServices, category) =>
              onNext({
                selectedServices,
                personalInfo: { ...state.personalInfo, workflowCategory: category },
              })
            }
            onBack={() => {
              if (isExisting) {
                router.push(`${candidatesPath}/${existingCandidate!.id}`);
              } else {
                onBack();
              }
            }}
            secondaryCurrency={secondaryCurrency}
            exchangeRate={exchangeRate}
          />
        )}
        {currentStep === 3 && (
          <Step4FinancialSplit
            selectedServices={state.selectedServices}
            partnerMargin={partnerMargin}
            onNext={(financialSplit) => onNext({ financialSplit })}
            onBack={onBack}
            secondaryCurrency={secondaryCurrency}
            exchangeRate={exchangeRate}
          />
        )}
        {currentStep === 4 && (
          <Step5Payment
            depositAmount={state.financialSplit?.depositAmount ?? 0}
            onNext={(paymentData) => onNext(paymentData)}
            onBack={onBack}
            secondaryCurrency={secondaryCurrency}
            exchangeRate={exchangeRate}
          />
        )}
        {currentStep === 5 && (
          <Step6ReviewSubmit
            state={state}
            partnerMargin={partnerMargin}
            partnerId={partnerId}
            onDone={(result) => {
              // Existing candidates skip documents → go straight to success (step 7)
              const nextStep = isExisting ? 7 : 6;
              setState((prev) => ({ ...prev, submissionResult: result, step: nextStep }));
            }}
            onBack={onBack}
            secondaryCurrency={secondaryCurrency}
            exchangeRate={exchangeRate}
          />
        )}
        {currentStep === 6 && (
          <Step7Documents
            workflowCategory={state.personalInfo.workflowCategory}
            candidateId={state.existingCandidateId || state.submissionResult?.candidateId}
            candidateName={state.personalInfo.fullName}
            existingDocuments={state.existingCandidateId ? state.uploadedDocuments : undefined}
            onNext={(uploadedDocuments) => onNext({ uploadedDocuments })}
          />
        )}
        {currentStep === 7 && state.submissionResult && (
          <div className="text-center space-y-4 py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-xl font-bold">
              {state.existingCandidateId ? "Service Order Added!" : "Candidate Registered!"}
            </h2>
            <p className="text-muted-foreground text-sm">
              Candidate ID:{" "}
              <span className="font-mono font-bold text-foreground">
                {state.submissionResult.candidateId}
              </span>
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <a
                href={`${candidatesPath}/${state.submissionResult.candidateId}`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                View Candidate →
              </a>
              <button
                onClick={() => router.push(candidatesPath)}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Back to Gallery
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
