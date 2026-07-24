import type { WorkflowCategory, CandidateStatus } from "@/types";

// Allowed next statuses for each [category][currentStatus].
// Optional steps appear as valid transitions — the UI labels them "(Optional)".
export const WORKFLOW_TRANSITIONS: Record<
  WorkflowCategory,
  Record<string, string[]>
> = {
  "Training & Language": {
    REGISTERED: ["DOCUMENTS_UNDER_REVIEW"],
    DOCUMENTS_UNDER_REVIEW: ["TRAINING_STARTED"],
    TRAINING_STARTED: ["TRAINING_FINISHED"],
    TRAINING_FINISHED: [],
  },
  Ausbildung: {
    REGISTERED: ["DOCUMENTS_UNDER_REVIEW"],
    DOCUMENTS_UNDER_REVIEW: ["GERMAN_COURSE_ASSIGNED"],
    GERMAN_COURSE_ASSIGNED: ["PROFESSIONAL_TRAINING_GOING_ON"],
    PROFESSIONAL_TRAINING_GOING_ON: ["APPLICATION_STARTED"],
    APPLICATION_STARTED: ["ADMISSION_PROCESS"],
    ADMISSION_PROCESS: ["WAITING_FOR_VISA_APPOINTMENT"],
    WAITING_FOR_VISA_APPOINTMENT: ["VISA_PROCESS"],
    VISA_PROCESS: ["COMPLETED"],
    COMPLETED: [],
  },
  "Student": {
    REGISTERED: ["DOCUMENTS_UNDER_REVIEW"],
    // Optional professional training step — allow skipping directly to APPLICATION_STARTED
    DOCUMENTS_UNDER_REVIEW: [
      "PROFESSIONAL_TRAINING_GOING_ON",
      "APPLICATION_STARTED",
    ],
    PROFESSIONAL_TRAINING_GOING_ON: ["APPLICATION_STARTED"],
    APPLICATION_STARTED: ["ADMISSION_UNDER_PROCESS"],
    ADMISSION_UNDER_PROCESS: ["WAITING_FOR_VISA_APPOINTMENT"],
    WAITING_FOR_VISA_APPOINTMENT: ["VISA_PROCESS"],
    VISA_PROCESS: ["COMPLETED"],
    COMPLETED: [],
  },
  "Opportunity Card": {
    REGISTERED: ["DOCUMENTS_UNDER_REVIEW"],
    // Optional German course — allow skipping to ZAB_VERIFICATION_STARTED
    DOCUMENTS_UNDER_REVIEW: [
      "GERMAN_COURSE_ASSIGNED",
      "ZAB_VERIFICATION_STARTED",
    ],
    GERMAN_COURSE_ASSIGNED: ["ZAB_VERIFICATION_STARTED"],
    ZAB_VERIFICATION_STARTED: ["ZAB_VERIFICATION_COMPLETED"],
    // Optional professional training — allow skipping to APPLICATION_SUBMITTED
    ZAB_VERIFICATION_COMPLETED: [
      "PROFESSIONAL_TRAINING_GOING_ON",
      "APPLICATION_SUBMITTED",
    ],
    PROFESSIONAL_TRAINING_GOING_ON: ["APPLICATION_SUBMITTED"],
    APPLICATION_SUBMITTED: ["WAITING_FOR_VISA_CALL"],
    WAITING_FOR_VISA_CALL: ["VISA_PROCESS_STARTED"],
    VISA_PROCESS_STARTED: ["COMPLETED"],
    COMPLETED: [],
  },
  "Others": {
    REGISTERED: ["IN_PROGRESS"],
    IN_PROGRESS: ["COMPLETED"],
    COMPLETED: [],
  },
};

// Display-ordered list of all statuses in a category's workflow (for stepper UI)
export const WORKFLOW_ORDERED_STATUSES: Record<WorkflowCategory, string[]> = {
  "Training & Language": [
    "REGISTERED",
    "DOCUMENTS_UNDER_REVIEW",
    "TRAINING_STARTED",
    "TRAINING_FINISHED",
  ],
  Ausbildung: [
    "REGISTERED",
    "DOCUMENTS_UNDER_REVIEW",
    "GERMAN_COURSE_ASSIGNED",
    "PROFESSIONAL_TRAINING_GOING_ON",
    "APPLICATION_STARTED",
    "ADMISSION_PROCESS",
    "WAITING_FOR_VISA_APPOINTMENT",
    "VISA_PROCESS",
    "COMPLETED",
  ],
  "Student": [
    "REGISTERED",
    "DOCUMENTS_UNDER_REVIEW",
    "PROFESSIONAL_TRAINING_GOING_ON",
    "APPLICATION_STARTED",
    "ADMISSION_UNDER_PROCESS",
    "WAITING_FOR_VISA_APPOINTMENT",
    "VISA_PROCESS",
    "COMPLETED",
  ],
  "Opportunity Card": [
    "REGISTERED",
    "DOCUMENTS_UNDER_REVIEW",
    "GERMAN_COURSE_ASSIGNED",
    "ZAB_VERIFICATION_STARTED",
    "ZAB_VERIFICATION_COMPLETED",
    "PROFESSIONAL_TRAINING_GOING_ON",
    "APPLICATION_SUBMITTED",
    "WAITING_FOR_VISA_CALL",
    "VISA_PROCESS_STARTED",
    "COMPLETED",
  ],
  "Others": [
    "REGISTERED",
    "IN_PROGRESS",
    "COMPLETED",
  ],
};

// Optional steps that can be skipped — shown differently in the stepper
export const OPTIONAL_STATUSES: Record<WorkflowCategory, string[]> = {
  "Training & Language": [],
  Ausbildung: [],
  "Student": ["PROFESSIONAL_TRAINING_GOING_ON"],
  "Opportunity Card": ["GERMAN_COURSE_ASSIGNED", "PROFESSIONAL_TRAINING_GOING_ON"],
  "Others": [],
};

export function getAllowedTransitions(
  category: WorkflowCategory,
  currentStatus: string
): string[] {
  return WORKFLOW_TRANSITIONS[category]?.[currentStatus] ?? [];
}

export function canTransitionTo(
  category: WorkflowCategory,
  currentStatus: string,
  nextStatus: string
): boolean {
  return getAllowedTransitions(category, currentStatus).includes(nextStatus);
}

export function getInitialStatus(_category: WorkflowCategory): CandidateStatus {
  return "REGISTERED";
}

export function isTerminalStatus(
  category: WorkflowCategory,
  status: string
): boolean {
  return getAllowedTransitions(category, status).length === 0;
}

export function isOptionalStatus(
  category: WorkflowCategory,
  status: string
): boolean {
  return OPTIONAL_STATUSES[category]?.includes(status) ?? false;
}

// Human-readable label for a status key
export function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

// Position index of currentStatus in the ordered list (for progress percentage)
export function getStatusProgress(
  category: WorkflowCategory,
  currentStatus: string
): number {
  const ordered = WORKFLOW_ORDERED_STATUSES[category];
  const idx = ordered.indexOf(currentStatus);
  if (idx < 0) return 0;
  return Math.round((idx / (ordered.length - 1)) * 100);
}
