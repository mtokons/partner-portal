import type { UserRoleType } from "@/types";

export type AdminRoleOption = {
  id: UserRoleType;
  label: string;
};

export const AVAILABLE_ROLES: AdminRoleOption[] = [
  { id: "admin", label: "Administrator" },
  { id: "sccg-admin", label: "SCCG Admin" },
  { id: "sccg-staff", label: "SCCG Staff" },
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

/**
 * Landing dashboards an admin can pin to a specific user, overriding the
 * role-based default. An empty `path` clears the override.
 */
export type DashboardOption = {
  path: string;
  label: string;
};

export const DASHBOARD_OPTIONS: DashboardOption[] = [
  { path: "", label: "Default (based on role)" },
  { path: "/admin/overview", label: "Admin Overview" },
  { path: "/sccg/dashboard", label: "SCCG Dashboard" },
  { path: "/admin/school", label: "School Admin" },
  { path: "/partner/dashboard", label: "Partner Dashboard" },
  { path: "/customer/dashboard", label: "Customer Dashboard" },
  { path: "/expert/dashboard", label: "Expert Dashboard" },
  { path: "/student/dashboard", label: "Student Dashboard" },
  { path: "/project-partner/dashboard", label: "Project Partner Dashboard" },
  { path: "/job-seeker/dashboard", label: "Job Seeker Dashboard" },
  { path: "/job-partner/dashboard", label: "Job Partner Dashboard" },
  { path: "/ausbildung/seeker/dashboard", label: "Ausbildung Seeker Dashboard" },
  { path: "/ausbildung/partner/dashboard", label: "Ausbildung Partner Dashboard" },
];
