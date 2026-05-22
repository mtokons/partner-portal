import type {
  WorkflowCategory,
  CandidateStatus,
  CandidateTask,
  CandidateTaskCategory,
  TaskPriority,
  Candidate,
} from "@/types";

interface TaskTemplate {
  title: string;
  taskCategory: CandidateTaskCategory;
  priority: TaskPriority;
  dueDaysFromNow: number;
}

// Auto-task templates indexed by [workflowCategory][status]
export const STATUS_TASK_TEMPLATES: Record<
  WorkflowCategory,
  Partial<Record<string, TaskTemplate[]>>
> = {
  Training: {
    REGISTERED: [
      {
        title: "Collect passport copy from candidate",
        taskCategory: "Document Required",
        priority: "high",
        dueDaysFromNow: 3,
      },
      {
        title: "Confirm registration deposit payment",
        taskCategory: "Payment Due",
        priority: "high",
        dueDaysFromNow: 7,
      },
    ],
    DOCUMENTS_UNDER_REVIEW: [
      {
        title: "Review submitted documents for completeness",
        taskCategory: "General Task",
        priority: "medium",
        dueDaysFromNow: 5,
      },
    ],
    TRAINING_STARTED: [
      {
        title: "Send training schedule to candidate",
        taskCategory: "General Task",
        priority: "medium",
        dueDaysFromNow: 2,
      },
    ],
  },
  Ausbildung: {
    REGISTERED: [
      {
        title: "Collect passport and ID documents",
        taskCategory: "Document Required",
        priority: "high",
        dueDaysFromNow: 3,
      },
      {
        title: "Confirm Ausbildung program deposit payment",
        taskCategory: "Payment Due",
        priority: "high",
        dueDaysFromNow: 7,
      },
    ],
    DOCUMENTS_UNDER_REVIEW: [
      {
        title: "Review academic transcripts and credentials",
        taskCategory: "Document Required",
        priority: "high",
        dueDaysFromNow: 5,
      },
    ],
    GERMAN_COURSE_ASSIGNED: [
      {
        title: "Share German course timetable with candidate",
        taskCategory: "General Task",
        priority: "medium",
        dueDaysFromNow: 2,
      },
    ],
    APPLICATION_STARTED: [
      {
        title: "Collect application supporting documents",
        taskCategory: "Document Required",
        priority: "high",
        dueDaysFromNow: 7,
      },
    ],
    WAITING_FOR_VISA_APPOINTMENT: [
      {
        title: "Confirm visa appointment date with candidate",
        taskCategory: "General Task",
        priority: "high",
        dueDaysFromNow: 3,
      },
    ],
    VISA_PROCESS: [
      {
        title: "Follow up on visa processing status",
        taskCategory: "General Task",
        priority: "medium",
        dueDaysFromNow: 14,
      },
    ],
  },
  "Student Visa": {
    REGISTERED: [
      {
        title: "Collect passport and academic documents",
        taskCategory: "Document Required",
        priority: "high",
        dueDaysFromNow: 3,
      },
      {
        title: "Confirm student visa program deposit payment",
        taskCategory: "Payment Due",
        priority: "high",
        dueDaysFromNow: 7,
      },
    ],
    DOCUMENTS_UNDER_REVIEW: [
      {
        title: "Verify language proficiency certificate",
        taskCategory: "Document Required",
        priority: "high",
        dueDaysFromNow: 5,
      },
    ],
    APPLICATION_STARTED: [
      {
        title: "Collect university application documents",
        taskCategory: "Document Required",
        priority: "high",
        dueDaysFromNow: 7,
      },
    ],
    WAITING_FOR_VISA_APPOINTMENT: [
      {
        title: "Confirm visa appointment booking",
        taskCategory: "General Task",
        priority: "high",
        dueDaysFromNow: 3,
      },
    ],
  },
  "Opportunity Card": {
    REGISTERED: [
      {
        title: "Collect qualification and work experience documents",
        taskCategory: "Document Required",
        priority: "high",
        dueDaysFromNow: 3,
      },
      {
        title: "Confirm Opportunity Card program deposit payment",
        taskCategory: "Payment Due",
        priority: "high",
        dueDaysFromNow: 7,
      },
    ],
    DOCUMENTS_UNDER_REVIEW: [
      {
        title: "Check ZAB-eligible qualifications",
        taskCategory: "General Task",
        priority: "high",
        dueDaysFromNow: 5,
      },
    ],
    ZAB_VERIFICATION_STARTED: [
      {
        title: "Submit ZAB verification documents",
        taskCategory: "Document Required",
        priority: "high",
        dueDaysFromNow: 7,
      },
    ],
    APPLICATION_SUBMITTED: [
      {
        title: "Track Opportunity Card application status",
        taskCategory: "General Task",
        priority: "medium",
        dueDaysFromNow: 14,
      },
    ],
    WAITING_FOR_VISA_CALL: [
      {
        title: "Prepare visa interview documentation",
        taskCategory: "Document Required",
        priority: "high",
        dueDaysFromNow: 7,
      },
    ],
  },
};

export function getTaskTemplatesForStatus(
  category: WorkflowCategory,
  status: CandidateStatus
): TaskTemplate[] {
  return STATUS_TASK_TEMPLATES[category]?.[status as string] ?? [];
}

export async function autoInsertCandidateTasks(
  candidate: Candidate,
  createdBy: string,
  createTaskFn: (data: Omit<CandidateTask, "id">) => Promise<CandidateTask>
): Promise<void> {
  const templates = getTaskTemplatesForStatus(
    candidate.workflowCategory,
    candidate.currentStatus
  );
  const now = new Date();

  for (const t of templates) {
    const dueDate = new Date(
      now.getTime() + t.dueDaysFromNow * 24 * 60 * 60 * 1000
    ).toISOString();

    await createTaskFn({
      title: t.title,
      description: `Auto-generated for ${candidate.fullName} — ${candidate.workflowCategory}`,
      status: "backlog",
      priority: t.priority,
      dueDate,
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      taskCategory: t.taskCategory,
      workflowCategory: candidate.workflowCategory,
      partnerId: candidate.partnerId,
      createdBy,
      createdAt: now.toISOString(),
      tags: [candidate.workflowCategory],
    });
  }
}
