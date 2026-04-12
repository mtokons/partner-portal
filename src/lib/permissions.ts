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
  "quotation.create": ["admin", "partner-individual", "partner-institutional"],
  "quotation.view.own": ["admin", "finance", "partner-individual", "partner-institutional", "customer"],
  "quotation.view.all": ["admin", "finance"],
  "quotation.send": ["admin", "partner-individual", "partner-institutional"],

  // Sales Orders
  "order.view.own": ["admin", "finance", "partner-individual", "partner-institutional", "customer"],
  "order.view.all": ["admin", "finance"],
  "order.update.status": ["admin"],

  // Payments
  "payment.make": ["customer"],
  "payment.upload.slip": ["customer"],
  "payment.verify": ["admin", "finance"],
  "payment.view": ["admin", "finance"],
  "payment.record": ["admin", "finance"],
  "payment.refund": ["admin", "finance"],
  "payout.approve": ["admin", "finance"],

  // Invoices
  "invoice.view.own": ["admin", "finance", "partner-individual", "partner-institutional", "expert", "customer"],
  "invoice.view.all": ["admin", "finance"],
  "invoice.view": ["admin", "finance"],
  "invoice.generate": ["admin", "finance"],
  "invoice.create": ["admin", "finance"],
  "invoice.manage": ["admin", "finance"],

  // Installments
  "installment.view": ["admin", "finance", "partner-individual", "partner-institutional"],
  "installment.manage": ["admin", "finance"],

  // SCCG Card
  "card.view.own": ["admin", "finance", "partner-individual", "partner-institutional", "expert", "teacher", "school-manager", "customer"],
  "card.issue": ["admin", "finance"],
  "card.freeze": ["admin", "finance"],
  "sccg-card.view": ["admin", "finance"],
  "sccg-card.create": ["admin", "finance"],
  "sccg-card.manage": ["admin", "finance"],

  // Sessions
  "session.deliver": ["expert", "teacher"],
  "session.view.own": ["expert", "teacher", "school-manager", "customer"],

  // Commission
  "commission.view.own": ["partner-individual", "partner-institutional", "expert"],
  "commission.view.all": ["admin", "finance"],
  "commission.configure": ["admin"],

  // Reports
  "report.financial": ["admin", "finance"],
  "report.partner": ["admin", "finance"],
  "report.school": ["admin", "school-manager", "hr"],

  // HR
  "hr.employee.view": ["admin", "hr"],
  "hr.employee.create": ["admin", "hr"],
  "hr.employee.edit": ["admin", "hr"],
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
  "school.content.upload": ["teacher", "admin", "school-manager"],
  "school.results.enter": ["teacher"],
  "school.results.publish": ["teacher", "admin", "school-manager"],
  "school.certificate.issue": ["admin", "school-manager"],
  "school.certificate.revoke": ["admin"],
  "school.report": ["admin", "school-manager", "finance"],
  "school.teacher.manage": ["admin", "school-manager"],
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
  const allowedRoles = PERMISSION_MAP[permission] as readonly string[];

  const hasPermission = userRoles.some((r: string) => allowedRoles.includes(r));

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
