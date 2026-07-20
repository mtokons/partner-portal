import type { UserRoleType } from "@/types";

export type AdminRoleOption = {
  id: UserRoleType;
  label: string;
};

export const AVAILABLE_ROLES: AdminRoleOption[] = [
  { id: "admin", label: "Administrator" },
  { id: "finance", label: "Finance Manager" },
  { id: "hr", label: "HR Manager" },
  { id: "school-manager", label: "School Manager" },
  { id: "partner", label: "Partner" },
  { id: "expert", label: "Expert" },
  { id: "customer", label: "Customer" },
  { id: "teacher", label: "Teacher" },
  { id: "project-partner", label: "Project Partner Viewer" },
  { id: "project-partner-admin", label: "Project Partner Admin" },
  { id: "project-admin", label: "Project Admin" },
  { id: "job-seeker", label: "Job Seeker" },
  { id: "job-partner", label: "Job Partner" },
  { id: "ausbildung-seeker", label: "Ausbildung Seeker" },
  { id: "ausbildung-partner", label: "Ausbildung Partner" },
];
