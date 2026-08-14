import type { ConsoleType } from "@/lib/menu-engine";

export type AccessPolicy = {
  roles: string[];
  console: ConsoleType;
  dashboard: string;
  routePrefixes: string[];
};

const POLICIES: AccessPolicy[] = [
  { roles: ["admin", "project-admin"], console: "admin", dashboard: "/admin/overview", routePrefixes: ["/admin"] },
  { roles: ["sccg-admin", "sccg-staff"], console: "sccg", dashboard: "/sccg/dashboard", routePrefixes: ["/sccg"] },
  { roles: ["school-manager"], console: "school-admin", dashboard: "/admin/school", routePrefixes: ["/admin/school"] },
  { roles: ["project-partner", "project-partner-admin"], console: "project-partner", dashboard: "/project-partner/dashboard", routePrefixes: ["/project-partner"] },
  { roles: ["job-seeker"], console: "job-seeker", dashboard: "/job-seeker/dashboard", routePrefixes: ["/job-seeker"] },
  { roles: ["job-partner"], console: "job-partner", dashboard: "/job-partner/dashboard", routePrefixes: ["/job-partner"] },
  { roles: ["ausbildung-seeker"], console: "ausbildung-seeker", dashboard: "/ausbildung/seeker/dashboard", routePrefixes: ["/ausbildung/seeker"] },
  { roles: ["ausbildung-partner"], console: "ausbildung-partner", dashboard: "/ausbildung/partner/dashboard", routePrefixes: ["/ausbildung/partner"] },
  { roles: ["partner", "partner-individual", "partner-institutional"], console: "partner", dashboard: "/partner/dashboard", routePrefixes: ["/partner"] },
  { roles: ["customer"], console: "customer", dashboard: "/customer/dashboard", routePrefixes: ["/customer"] },
  { roles: ["expert", "teacher"], console: "expert", dashboard: "/expert/dashboard", routePrefixes: ["/expert"] },
  { roles: ["student"], console: "student", dashboard: "/student/dashboard", routePrefixes: ["/student"] },
];

const ROLE_ALIASES: Record<string, string> = {
  "super_admin": "admin",
  "project-admin": "project-admin",
  "project-partner-admin": "project-partner-admin",
};

export function normalizeRoles(roles: string[] | undefined | null): string[] {
  return Array.from(new Set((roles || []).map((role) => {
    const normalized = String(role || "").trim().toLowerCase();
    return ROLE_ALIASES[normalized] || normalized;
  }).filter(Boolean)));
}

export function getAccessPolicies(): AccessPolicy[] {
  return POLICIES.map((policy) => ({ ...policy, roles: [...policy.roles], routePrefixes: [...policy.routePrefixes] }));
}

export function getPolicyForRole(role: string | undefined | null): AccessPolicy | null {
  const normalized = normalizeRoles(role ? [role] : [])[0];
  return POLICIES.find((policy) => policy.roles.includes(normalized)) || null;
}

export function resolvePrimaryRole(roles: string[] | undefined | null): string | null {
  const normalized = normalizeRoles(roles);
  for (const policy of POLICIES) {
    const role = normalized.find((candidate) => policy.roles.includes(candidate));
    if (role) return role;
  }
  return null;
}

export function resolveConsoleForRoles(roles: string[] | undefined | null): ConsoleType | null {
  const role = resolvePrimaryRole(roles);
  return role ? getPolicyForRole(role)?.console || null : null;
}

export function resolveDashboardForRoles(roles: string[] | undefined | null): string | null {
  const role = resolvePrimaryRole(roles);
  return role ? getPolicyForRole(role)?.dashboard || null : null;
}

export function getPolicyForPath(pathname: string): AccessPolicy | null {
  return POLICIES.find((policy) => policy.routePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) || null;
}

export function rolesCanAccessPath(roles: string[] | undefined | null, pathname: string): boolean {
  const policy = getPolicyForPath(pathname);
  if (!policy) return true;
  const normalized = normalizeRoles(roles);
  return normalized.some((role) => policy.roles.includes(role)) || normalized.includes("admin") || normalized.includes("project-admin");
}
