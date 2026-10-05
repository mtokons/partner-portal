/**
 * Permission Guard — Server Action authorization middleware
 *
 * Enforces role-based access control on all server actions.
 * Must be called at the start of every protected server action.
 */

import { auth } from "@/auth";
import type { SessionUser, UserRoleType } from "@/types";
import { writeAuditLog } from "./audit-log";

// Permission → allowed roles mapping
const PERMISSION_MAP = {
  // User management
  "user.view.all": ["admin", "hr"],
  "user.profile.edit": ["admin", "hr"],
  "user.role.change": ["admin"],
  "user.suspend": ["admin"],
  "user.delete": ["admin"],

  // Quotation / Offer
  "quotation.create": ["admin", "sccg-staff", "partner-individual", "partner-institutional"],
  "quotation.view.own": ["admin", "sccg-staff", "finance", "partner-individual", "partner-institutional", "customer"],
  "quotation.view.all": ["admin", "finance", "sccg-staff"],
  "quotation.send": ["admin", "sccg-staff", "partner-individual", "partner-institutional"],

  // Sales Orders
  "order.view.own": [
    "admin",
    "sccg-admin",
    "sccg-staff",
    "school-manager",
    "school-admin",
    "teacher",
    "finance",
    "hr",
    "project-admin",
    "project-partner-admin",
    "partner",
    "partner-individual",
    "partner-institutional",
    "customer",
  ],
  "order.view.all": [
    "admin",
    "sccg-admin",
    "sccg-staff",
    "school-manager",
    "school-admin",
    "teacher",
    "finance",
    "hr",
    "project-admin",
    "project-partner-admin",
  ],
  "order.update.status": [
    "admin",
    "sccg-admin",
    "sccg-staff",
    "school-manager",
    "school-admin",
    "finance",
  ],

  // Payments
  "payment.make": ["customer"],
  "payment.upload.slip": ["customer"],
  "payment.verify": ["admin", "finance", "sccg-staff"],
  "payment.view": ["admin", "finance", "sccg-staff"],
  "payment.record": ["admin", "finance", "sccg-staff"],
  "payment.refund": ["admin", "finance", "sccg-staff"],
  "payout.approve": ["admin", "finance", "sccg-staff"],
  "expert-payment.manage": ["admin", "sccg-staff"],
  "partner.performance.view": ["admin", "sccg-staff"],

  // Invoices
  "invoice.view.own": ["admin", "finance", "sccg-staff", "partner-individual", "partner-institutional", "expert", "customer"],
  "invoice.view.all": ["admin", "finance", "sccg-staff"],
  "invoice.view": ["admin", "finance", "sccg-staff"],
  "invoice.generate": ["admin", "finance", "sccg-staff"],
  "invoice.create": ["admin", "finance", "sccg-staff"],
  "invoice.manage": ["admin", "finance", "sccg-staff"],

  // Installments
  "installment.view": ["admin", "finance", "sccg-staff", "partner-individual", "partner-institutional"],
  "installment.manage": ["admin", "finance", "sccg-staff"],

  // SCCG Card
  "card.view.own": ["admin", "finance", "sccg-staff", "partner-individual", "partner-institutional", "expert", "teacher", "school-manager", "customer"],
  "card.issue": ["admin", "finance", "sccg-staff"],
  "card.freeze": ["admin", "finance", "sccg-staff"],
  "sccg-card.view": ["admin", "finance", "sccg-staff"],
  "sccg-card.create": ["admin", "finance", "sccg-staff"],
  "sccg-card.manage": ["admin", "finance", "sccg-staff"],

  // Sessions
  "session.deliver": ["expert", "teacher"],
  "session.view.own": ["admin", "sccg-staff", "expert", "teacher", "school-manager", "customer"],
  "session.view.all": ["admin", "sccg-staff"],
  "session.manage": ["admin", "sccg-staff"],
  "expert.assign": ["admin", "sccg-staff"],

  // Commission
  "commission.view.own": ["partner-individual", "partner-institutional", "expert"],
  "commission.view.all": ["admin", "finance", "sccg-staff"],
  "commission.configure": ["admin", "sccg-staff"],

  // Reports
  "report.financial": ["admin", "finance", "sccg-staff"],
  "report.partner": ["admin", "finance", "sccg-staff"],
  "report.school": ["admin", "school-manager", "hr"],

  // HR
  "hr.employee.view": ["admin", "sccg-staff", "hr"],
  "hr.employee.create": ["admin", "sccg-staff", "hr"],
  "hr.employee.edit": ["admin", "sccg-staff", "hr"],
  "hr.employee.status.change": ["admin", "hr"],
  "hr.employee.salary.view": ["admin", "hr"],
  "hr.employee.salary.edit": ["admin", "hr"],
  "hr.employee.document.upload": ["admin", "hr"],
  "hr.employee.document.view": ["admin", "hr"],
  "hr.report": ["admin", "hr"],

  // School
  "school.course.create": ["admin", "sccg-admin", "school-manager", "sccg-staff", "teacher"],
  "school.course.publish": ["admin", "sccg-admin", "school-manager", "sccg-staff"],
  "school.batch.create": ["admin", "sccg-admin", "school-manager", "sccg-staff", "teacher"],
  "school.batch.manage": ["admin", "sccg-admin", "school-manager", "sccg-staff", "teacher"],
  "school.enrollment.create": ["admin", "sccg-admin", "school-manager", "sccg-staff", "teacher", "partner", "partner-individual", "partner-institutional"],
  "school.enrollment.manage": ["admin", "sccg-admin", "school-manager", "sccg-staff", "teacher", "partner", "partner-individual", "partner-institutional"],
  "school.attendance.record": ["teacher", "admin", "sccg-admin", "school-manager", "sccg-staff"],
  "school.content.upload": ["teacher", "admin", "sccg-admin", "sccg-staff", "school-manager"],
  "school.results.enter": ["teacher", "admin", "sccg-admin", "school-manager", "sccg-staff"],
  "school.results.publish": ["teacher", "admin", "sccg-admin", "school-manager", "sccg-staff"],
  "school.certificate.issue": ["admin", "sccg-admin", "school-manager", "sccg-staff"],
  "school.certificate.revoke": ["admin", "sccg-admin", "school-manager", "sccg-staff"],
  "school.report": ["admin", "sccg-admin", "sccg-staff", "school-manager", "finance", "teacher", "partner"],
  "school.teacher.manage": ["admin", "sccg-admin", "school-manager", "sccg-staff", "teacher", "partner"],

  // Candidate management (SCCG Partner Portal)
  "candidate.create": ["partner-individual", "partner-institutional", "admin", "sccg-staff"],
  "candidate.view.own": ["partner-individual", "partner-institutional"],
  "candidate.view.all": ["admin", "sccg-staff", "finance"],
  "candidate.status.advance": ["admin", "sccg-staff"],
  "candidate.status.advance.own": ["partner-individual", "partner-institutional"],
  "candidate.document.upload": ["partner-individual", "partner-institutional", "admin", "sccg-staff"],
  "candidate.share": ["admin", "sccg-staff"],

  // Helpdesk ticketing
  "helpdesk.ticket.create": ["partner-individual", "partner-institutional", "admin", "sccg-staff"],
  "helpdesk.ticket.view.own": ["partner-individual", "partner-institutional"],
  "helpdesk.ticket.view.all": ["admin", "sccg-staff"],
  "helpdesk.ticket.respond": ["admin", "sccg-staff"],
} as const;

export type Permission = keyof typeof PERMISSION_MAP;

/**
 * Require the current session user to have the given permission.
 * Throws if unauthorized. Returns the session user on success.
 */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: No active session");
  }

  const user = session.user as SessionUser;
  const userRoles = user.roles || [user.role];
  const userEmail = (user.email || "").toLowerCase().trim();
  const isAdminDomainUser =
    userEmail.endsWith("@mysccg.de") ||
    userEmail === "mysccg@gmail.com";

  // SCCG Admin & admin domain users have full internal admin parity for server-action permissions.
  const effectiveRoles = [
    ...userRoles,
    ...(userRoles.some((r) => r?.toLowerCase() === "sccg-admin" || r?.toLowerCase() === "admin") || isAdminDomainUser
      ? ["admin", "sccg-admin", "school-manager", "sccg-staff"]
      : []),
  ];
  const allowedRoles = PERMISSION_MAP[permission] as readonly string[];

  const hasPermission = effectiveRoles.some((r: string) => allowedRoles.includes(r));

  if (!hasPermission) {
    // Log denied access attempt
    try {
      await writeAuditLog({
        action: "authorization.denied",
        actorId: user.id,
        actorEmail: user.email,
        targetId: permission,
        targetType: "permission",
        metadata: { userRoles, requiredRoles: [...allowedRoles] },
      });
    } catch {
      // Don't fail the request if audit log fails
      console.error("Failed to write audit log for denied access");
    }
    throw new Error(`Forbidden: Insufficient permissions for ${permission}`);
  }

  return user;
}

/**
 * Check if user has permission without throwing.
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  try {
    await requirePermission(permission);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current authenticated user, throw if not logged in.
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized: No active session");
  }
  return session.user as SessionUser;
}

/**
 * Check whether a user belongs to an administrative or staff role
 * (Super Admin, SCCG Operations Admin/Staff, School Admin/Manager/Teacher, Finance, HR, Project Admin).
 */
export function isAdministrativeUser(user?: SessionUser | null): boolean {
  if (!user) return false;
  const adminRoles = [
    "admin",
    "sccg-admin",
    "sccg-staff",
    "school-manager",
    "school-admin",
    "teacher",
    "finance",
    "hr",
    "project-admin",
    "project-partner-admin",
  ];
  const role = (user.role || "").toLowerCase();
  if (adminRoles.includes(role)) return true;
  if (user.roles?.some((r) => adminRoles.includes((r || "").toLowerCase()))) return true;
  const email = (user.email || "").toLowerCase().trim();
  if (email.endsWith("@mysccg.de") || email === "mysccg@gmail.com") return true;
  return false;
}

