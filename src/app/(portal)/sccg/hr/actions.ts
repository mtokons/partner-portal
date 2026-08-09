"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { createDefaultOnboardingTasks, createEmployee, getEmployeeById, updateEmployee, completeOnboardingTask } from "@/lib/firestore-services";
import type { EmployeeDepartment, EmployeeStatus, EmploymentType } from "@/types";

const departments: EmployeeDepartment[] = ["management", "technology", "finance", "hr", "sales", "marketing", "operations", "language-school", "education", "support", "other"];
const employmentTypes: EmploymentType[] = ["full-time", "part-time", "contract", "intern", "probation"];
const statuses: EmployeeStatus[] = ["onboarding", "probation", "active", "on-leave", "suspended", "notice-period", "terminated", "resigned", "retired"];

function required(formData: FormData, key: string) {
  const value = String(formData.get(key) || "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

export async function createEmployeeAction(formData: FormData) {
  const user = await requirePermission("hr.employee.create");
  const department = required(formData, "department") as EmployeeDepartment;
  const employmentType = required(formData, "employmentType") as EmploymentType;
  if (!departments.includes(department) || !employmentTypes.includes(employmentType)) throw new Error("Invalid employee classification");

  const employee = await createEmployee({
    firebaseUid: "",
    fullName: required(formData, "fullName"),
    email: required(formData, "email").toLowerCase(),
    phone: required(formData, "phone"),
    designation: required(formData, "designation"),
    department,
    employmentType,
    joiningDate: required(formData, "joiningDate"),
    probationMonths: Number(formData.get("probationMonths") || 3),
    status: "onboarding",
    portalRoles: [],
    createdBy: user.email || user.id,
    updatedBy: user.email || user.id,
  });
  await createDefaultOnboardingTasks(employee.id);
  revalidatePath("/sccg/hr");
  revalidatePath("/sccg/hr/employees");
  redirect(`/sccg/hr/employees/${employee.id}`);
}

export async function changeEmployeeStatusAction(employeeId: string, status: EmployeeStatus) {
  const user = await requirePermission("hr.employee.status.change");
  if (!statuses.includes(status)) throw new Error("Invalid employee status");
  if (!await getEmployeeById(employeeId)) throw new Error("Employee not found");
  await updateEmployee(employeeId, { status, updatedBy: user.email || user.id });
  revalidatePath(`/sccg/hr/employees/${employeeId}`);
  revalidatePath("/sccg/hr");
}

export async function updateEmployeeSalaryAction(employeeId: string, formData: FormData) {
  const user = await requirePermission("hr.employee.salary.edit");
  if (!await getEmployeeById(employeeId)) throw new Error("Employee not found");
  const baseSalary = Number(formData.get("baseSalary"));
  const salaryCurrency = String(formData.get("salaryCurrency")) as "BDT" | "EUR";
  if (!Number.isFinite(baseSalary) || baseSalary < 0 || !["BDT", "EUR"].includes(salaryCurrency)) throw new Error("Invalid salary");
  await updateEmployee(employeeId, { baseSalary, salaryCurrency, updatedBy: user.email || user.id });
  revalidatePath(`/sccg/hr/employees/${employeeId}`);
}

export async function completeOnboardingTaskAction(employeeId: string, taskId: string) {
  const user = await requirePermission("hr.employee.edit");
  if (!await getEmployeeById(employeeId)) throw new Error("Employee not found");
  await completeOnboardingTask(taskId, user.email || user.id);
  revalidatePath(`/sccg/hr/employees/${employeeId}`);
}