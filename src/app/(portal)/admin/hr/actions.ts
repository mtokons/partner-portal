"use server";

import {
  getEmployees, createEmployee, updateEmployee,
  getEmployeeById, getEmployeeDocuments, createEmployeeDocument,
  getOnboardingTasks, completeOnboardingTask, createDefaultOnboardingTasks,
} from "@/lib/firestore-services";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit-log";
import { sendEmailViaGraph, buildWelcomeEmployeeEmail } from "@/lib/email";
import * as admin from "firebase-admin";
import { getAdminApp } from "@/lib/firebase-admin";
import { generateSccgId } from "@/lib/sccg-id";
import type { Employee, EmployeeDepartment, EmploymentType, EmployeeStatus, EmployeeDocType } from "@/types";

export async function fetchEmployees(filters?: { department?: string; status?: string; search?: string }) {
  await requirePermission("hr.employee.view");
  return getEmployees(filters);
}

export async function fetchEmployeeById(id: string) {
  await requirePermission("hr.employee.view");
  return getEmployeeById(id);
}

export async function fetchEmployeeDocuments(employeeId: string) {
  await requirePermission("hr.employee.document.view");
  return getEmployeeDocuments(employeeId);
}

export async function fetchOnboardingTasks(employeeId: string) {
  await requirePermission("hr.employee.view");
  return getOnboardingTasks(employeeId);
}

export async function markOnboardingTaskComplete(taskId: string) {
  const user = await requirePermission("hr.employee.edit");
  await completeOnboardingTask(taskId, user.id);
}

export async function createNewEmployee(data: {
  fullName: string;
  email: string;
  phone: string;
  designation: string;
  department: EmployeeDepartment;
  employmentType: EmploymentType;
  joiningDate: string;
  probationMonths: number;
  reportsToEmployeeId?: string;
  reportsToName?: string;
  personalEmail?: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "prefer-not-to-say";
  nationality?: string;
  address?: string;
  team?: string;
}) {
  const user = await requirePermission("hr.employee.create");

  // Create Firebase Auth account for the employee
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin not initialized");

  let firebaseUid: string;
  try {
    const userRecord = await admin.auth(app).createUser({
      email: data.email,
      displayName: data.fullName,
      disabled: false,
    });
    firebaseUid = userRecord.uid;
  } catch (err: unknown) {
    // If user already exists in Firebase Auth, get their UID
    try {
      const existing = await admin.auth(app).getUserByEmail(data.email);
      firebaseUid = existing.uid;
    } catch {
      throw err;
    }
  }

  const employee = await createEmployee({
    firebaseUid,
    fullName: data.fullName,
    email: data.email,
    personalEmail: data.personalEmail,
    phone: data.phone,
    dateOfBirth: data.dateOfBirth,
    gender: data.gender,
    nationality: data.nationality,
    address: data.address,
    designation: data.designation,
    department: data.department,
    team: data.team,
    employmentType: data.employmentType,
    joiningDate: data.joiningDate,
    probationMonths: data.probationMonths,
    reportsToEmployeeId: data.reportsToEmployeeId,
    reportsToName: data.reportsToName,
    status: "onboarding",
    portalRoles: [],
    createdBy: user.id,
    updatedBy: user.id,
  });

  // Create default onboarding tasks
  await createDefaultOnboardingTasks(employee.id);

  // Audit log
  await writeAuditLog({
    action: "employee.created",
    actorId: user.id,
    actorEmail: user.email,
    targetId: employee.id,
    targetType: "employee",
    after: { sccgId: employee.sccgId, fullName: employee.fullName, email: employee.email },
  });

  // Send welcome email via Office 365
  try {
    const emailData = buildWelcomeEmployeeEmail({
      employeeName: data.fullName,
      sccgId: employee.sccgId,
      designation: data.designation,
      department: data.department,
      joiningDate: data.joiningDate,
      managerName: data.reportsToName,
    });
    await sendEmailViaGraph({
      to: data.email,
      toName: data.fullName,
      subject: emailData.subject,
      htmlBody: emailData.htmlBody,
      senderUserId: process.env.O365_HR_SENDER || undefined,
    });
  } catch (err) {
    console.error("Failed to send welcome email:", err);
  }

  return employee;
}

export async function updateEmployeeProfile(id: string, data: Partial<Employee>) {
  const user = await requirePermission("hr.employee.edit");

  const before = await getEmployeeById(id);
  if (!before) throw new Error("Employee not found");

  // Remove fields that should not be editable here
  const { id: _id, sccgId: _sccg, firebaseUid: _uid, createdAt: _ca, createdBy: _cb, ...safeData } = data as Record<string, unknown>;
  void _id; void _sccg; void _uid; void _ca; void _cb;

  await updateEmployee(id, { ...safeData, updatedBy: user.id } as Partial<Employee>);

  await writeAuditLog({
    action: "employee.updated",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "employee",
    before: { fullName: before.fullName, designation: before.designation, department: before.department, status: before.status },
    after: safeData as Record<string, unknown>,
  });
}

export async function changeEmployeeStatus(id: string, newStatus: EmployeeStatus, notes?: string) {
  const user = await requirePermission("hr.employee.status.change");

  const employee = await getEmployeeById(id);
  if (!employee) throw new Error("Employee not found");

  // Validate status transitions
  const validTransitions: Record<string, string[]> = {
    onboarding: ["probation", "active", "terminated"],
    probation: ["active", "notice-period", "terminated"],
    active: ["on-leave", "suspended", "notice-period", "terminated"],
    "on-leave": ["active", "terminated"],
    suspended: ["active", "terminated"],
    "notice-period": ["resigned"],
    terminated: [],
    resigned: [],
    retired: [],
  };

  const allowed = validTransitions[employee.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot change status from '${employee.status}' to '${newStatus}'`);
  }

  const updates: Partial<Employee> = { status: newStatus, updatedBy: user.id };
  if (newStatus === "active" && employee.status === "probation") {
    updates.confirmationDate = new Date().toISOString().split("T")[0];
  }
  if (newStatus === "resigned" || newStatus === "terminated") {
    updates.lastWorkingDate = new Date().toISOString().split("T")[0];

    // Disable Firebase Auth account
    const app = getAdminApp();
    if (app && employee.firebaseUid) {
      try {
        await admin.auth(app).updateUser(employee.firebaseUid, { disabled: true });
      } catch (err) {
        console.error("Failed to disable Firebase Auth account:", err);
      }
    }
  }

  await updateEmployee(id, updates);

  await writeAuditLog({
    action: "employee.status.changed",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "employee",
    before: { status: employee.status },
    after: { status: newStatus, notes },
  });
}

export async function uploadEmployeeDocument(data: {
  employeeId: string;
  employeeSccgId: string;
  documentType: EmployeeDocType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  isConfidential: boolean;
  notes?: string;
}) {
  const user = await requirePermission("hr.employee.document.upload");

  const doc = await createEmployeeDocument({
    ...data,
    uploadedBy: user.id,
    uploadedAt: new Date().toISOString(),
  });

  await writeAuditLog({
    action: "employee.document.uploaded",
    actorId: user.id,
    actorEmail: user.email,
    targetId: data.employeeId,
    targetType: "employee-document",
    after: { documentType: data.documentType, fileName: data.fileName },
  });

  return doc;
}
