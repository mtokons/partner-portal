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
  "order.view.own": ["admin", "sccg-staff", "finance", "partner-individual", "partner-institutional", "customer"],
  "order.view.all": ["admin", "finance", "sccg-staff"],
  "order.update.status": ["admin"],

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
  "school.course.create": ["admin", "school-manager", "teacher"],
  "school.course.publish": ["admin", "school-manager"],
  "school.batch.create": ["admin", "school-manager"],
  "school.batch.manage": ["admin", "school-manager"],
  "school.enrollment.create": ["admin", "school-manager"],
  "school.enrollment.manage": ["admin", "school-manager"],
  "school.attendance.record": ["teacher"],
  "school.content.upload": ["teacher", "admin", "sccg-staff", "school-manager"],
  "school.results.enter": ["teacher"],
  "school.results.publish": ["teacher", "admin", "school-manager"],
  "school.certificate.issue": ["admin", "school-manager"],
  "school.certificate.revoke": ["admin", "school-manager"],
  "school.report": ["admin", "sccg-staff", "school-manager", "finance"],
  "school.teacher.manage": ["admin", "school-manager"],

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
  // SCCG Admin has full internal admin parity for server-action permissions.
  const effectiveRoles = userRoles.some((r) => r?.toLowerCase() === "sccg-admin")
    ? [...userRoles, "admin"]
    : userRoles;
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
