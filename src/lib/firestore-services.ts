/**
 * Firestore Services — New modules (HR, School, Payments, SCCG Cards, Certificates)
 *
 * All CRUD operations for features added in the V3 architecture.
 * Uses Firebase Admin SDK for server-side operations.
 */

import { getAdminFirestore } from "./firebase-admin";
import { generateSccgId, generateCardNumber, generateVerificationCode } from "./sccg-id";
import * as admin from "firebase-admin";
import type {
  Employee, EmployeeDocument, OnboardingTask,
  SchoolCourse, SchoolBatch, SchoolEnrollment, SchoolContent,
  SchoolAttendance, SchoolExamResult, SchoolCertificate,
  Payment, PaymentMethodConfig, EnhancedInvoice, EnhancedInstallment,
  InstallmentRule, SccgCard, SccgCardTransaction,
  AuditLogEntry, RoleChangeRequest, SchoolGradingScale, SchoolTeacher
} from "@/types";

function db() {
  return getAdminFirestore();
}

function now() {
  return new Date().toISOString();
}

/**
 * Ensures a Firestore document data object is a plain JSON-serializable object.
 * Converts Timestamps to ISO strings.
 */
function toPlainObject<T>(obj: any): T {
  return JSON.parse(JSON.stringify(obj));
}

// ============================================================
// HR — Employees
// ============================================================

export async function getEmployees(filters?: {
  department?: string;
  status?: string;
  search?: string;
}): Promise<Employee[]> {
  let q: FirebaseFirestore.Query = db().collection("employees").orderBy("fullName");
  if (filters?.department) q = q.where("department", "==", filters.department);
  if (filters?.status) q = q.where("status", "==", filters.status);
  const snap = await q.get();
  let results = snap.docs.map((d) => toPlainObject<Employee>({ id: d.id, ...d.data() }));
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(
      (e) => e.fullName.toLowerCase().includes(s) || e.email.toLowerCase().includes(s) || e.sccgId.toLowerCase().includes(s)
    );
  }
  return results;
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const snap = await db().collection("employees").doc(id).get();
  return snap.exists ? toPlainObject<Employee>({ id: snap.id, ...snap.data() }) : null;
}

export async function createEmployee(data: Omit<Employee, "id" | "sccgId" | "createdAt" | "updatedAt">): Promise<Employee> {
  const sccgId = await generateSccgId("EMP");
  const doc: Record<string, unknown> = {
    ...data,
    sccgId,
    createdAt: now(),
    updatedAt: now(),
  };
  const ref = await db().collection("employees").add(doc);
  return { id: ref.id, ...doc } as unknown as Employee;
}

export async function updateEmployee(id: string, data: Partial<Employee>): Promise<void> {
  await db().collection("employees").doc(id).update({ ...data, updatedAt: now() });
}

// ── Employee Documents ──

export async function getEmployeeDocuments(employeeId: string): Promise<EmployeeDocument[]> {
  const snap = await db().collection("employeeDocuments").where("employeeId", "==", employeeId).get();
  return snap.docs.map((d) => toPlainObject<EmployeeDocument>({ id: d.id, ...d.data() }));
}

export async function createEmployeeDocument(data: Omit<EmployeeDocument, "id">): Promise<EmployeeDocument> {
  const ref = await db().collection("employeeDocuments").add(data);
  return { id: ref.id, ...data };
}

export async function deleteEmployeeDocument(id: string): Promise<void> {
  await db().collection("employeeDocuments").doc(id).delete();
}

// ── Onboarding Tasks ──

export async function getOnboardingTasks(employeeId: string): Promise<OnboardingTask[]> {
  const snap = await db().collection("onboardingTasks").where("employeeId", "==", employeeId).get();
  return snap.docs.map((d) => toPlainObject<OnboardingTask>({ id: d.id, ...d.data() }));
}

export async function createOnboardingTask(data: Omit<OnboardingTask, "id">): Promise<OnboardingTask> {
  const ref = await db().collection("onboardingTasks").add(data);
  return { id: ref.id, ...data };
}

export async function completeOnboardingTask(id: string, completedBy: string): Promise<void> {
  await db().collection("onboardingTasks").doc(id).update({
    isCompleted: true,
    completedAt: now(),
    completedBy,
  });
}

/**
 * Create default onboarding checklist for a new employee
 */
export async function createDefaultOnboardingTasks(employeeId: string): Promise<void> {
  const defaults = [
    { taskName: "Upload NID / Passport copy", category: "documents" as const, isRequired: true },
    { taskName: "Upload signed offer letter", category: "documents" as const, isRequired: true },
    { taskName: "Upload photograph", category: "documents" as const, isRequired: true },
    { taskName: "Submit bank details form", category: "documents" as const, isRequired: true },
    { taskName: "Portal account created", category: "access" as const, isRequired: true },
    { taskName: "Office 365 email provisioned", category: "access" as const, isRequired: true },
    { taskName: "Laptop / workstation assigned", category: "equipment" as const, isRequired: false },
    { taskName: "Intro meeting with manager", category: "introduction" as const, isRequired: true },
    { taskName: "NDA signed", category: "documents" as const, isRequired: true },
    { taskName: "Probation review date set", category: "training" as const, isRequired: true },
  ];

  const batch = db().batch();
  for (const task of defaults) {
    const ref = db().collection("onboardingTasks").doc();
    batch.set(ref, {
      employeeId,
      ...task,
      isCompleted: false,
      completedAt: null,
      completedBy: null,
      dueDate: null,
      notes: null,
    });
  }
  await batch.commit();
}

// ============================================================
// Language School — Courses
// ============================================================

export async function getSchoolCourses(status?: string): Promise<SchoolCourse[]> {
  let q: FirebaseFirestore.Query = db().collection("schoolCourses").orderBy("courseName");
  if (status) q = q.where("status", "==", status);
  const snap = await q.get();
  return snap.docs.map((d) => toPlainObject<SchoolCourse>({ id: d.id, ...d.data() }));
}

export async function getSchoolCourseById(id: string): Promise<SchoolCourse | null> {
  const snap = await db().collection("schoolCourses").doc(id).get();
  return snap.exists ? toPlainObject<SchoolCourse>({ id: snap.id, ...snap.data() }) : null;
}

export async function createSchoolCourse(data: Omit<SchoolCourse, "id" | "sccgId" | "createdAt" | "updatedAt">): Promise<SchoolCourse> {
  const sccgId = await generateSccgId("CRS");
  const doc = { ...data, sccgId, createdAt: now(), updatedAt: now() };
  const ref = await db().collection("schoolCourses").add(doc);
  return { id: ref.id, ...doc } as unknown as SchoolCourse;
}

export async function updateSchoolCourse(id: string, data: Partial<SchoolCourse>): Promise<void> {
  await db().collection("schoolCourses").doc(id).update({ ...data, updatedAt: now() });
}

export async function deleteSchoolCourse(id: string): Promise<void> {
  await db().collection("schoolCourses").doc(id).delete();
}

// ── Batches ──

export async function getSchoolBatches(filters?: {
  courseId?: string;
  status?: string;
  teacherId?: string;
}): Promise<SchoolBatch[]> {
  let q: FirebaseFirestore.Query = db().collection("schoolBatches").orderBy("startDate", "desc");
  if (filters?.courseId) q = q.where("courseId", "==", filters.courseId);
  if (filters?.status) q = q.where("status", "==", filters.status);
  if (filters?.teacherId) q = q.where("teacherId", "==", filters.teacherId);
  const snap = await q.get();
  return snap.docs.map((d) => toPlainObject<SchoolBatch>({ id: d.id, ...d.data() }));
}

export async function getSchoolBatchById(id: string): Promise<SchoolBatch | null> {
  const snap = await db().collection("schoolBatches").doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as SchoolBatch) : null;
}

export async function createSchoolBatch(data: Omit<SchoolBatch, "id" | "sccgId" | "createdAt" | "updatedAt" | "enrolledStudents">): Promise<SchoolBatch> {
  const sccgId = await generateSccgId("BCH");
  const doc = { ...data, sccgId, enrolledStudents: 0, createdAt: now(), updatedAt: now() };
  const ref = await db().collection("schoolBatches").add(doc);
  return { id: ref.id, ...doc } as unknown as SchoolBatch;
}

export async function updateSchoolBatch(id: string, data: Partial<SchoolBatch>): Promise<void> {
  await db().collection("schoolBatches").doc(id).update({ ...data, updatedAt: now() });
}

export async function deleteSchoolBatch(id: string): Promise<void> {
  await db().collection("schoolBatches").doc(id).delete();
}

// ── Enrollments ──

export async function getSchoolEnrollments(filters?: {
  batchId?: string;
  courseId?: string;
  studentUserId?: string;
  status?: string;
}): Promise<SchoolEnrollment[]> {
  let q: FirebaseFirestore.Query = db().collection("schoolEnrollments").orderBy("createdAt", "desc");
  if (filters?.batchId) q = q.where("batchId", "==", filters.batchId);
  if (filters?.courseId) q = q.where("courseId", "==", filters.courseId);
  if (filters?.studentUserId) q = q.where("studentUserId", "==", filters.studentUserId);
  if (filters?.status) q = q.where("status", "==", filters.status);
  const snap = await q.get();
  return snap.docs.map((d) => toPlainObject<SchoolEnrollment>({ id: d.id, ...d.data() }));
}

export async function getSchoolEnrollmentById(id: string): Promise<SchoolEnrollment | null> {
  const snap = await db().collection("schoolEnrollments").doc(id).get();
  return snap.exists ? toPlainObject<SchoolEnrollment>({ id: snap.id, ...snap.data() }) : null;
}

export async function createSchoolEnrollment(
  data: Omit<SchoolEnrollment, "id" | "sccgId" | "amountPaid" | "amountRemaining" | "createdAt" | "updatedAt">
): Promise<SchoolEnrollment> {
  const sccgId = await generateSccgId("ENR");
  const doc = {
    ...data,
    sccgId,
    amountPaid: 0,
    amountRemaining: data.netFee,
    createdAt: now(),
    updatedAt: now(),
  };
  const ref = await db().collection("schoolEnrollments").add(doc);

  // Increment batch enrolled count
  await db().collection("schoolBatches").doc(data.batchId).update({
    enrolledStudents: admin.firestore.FieldValue.increment(1),
  });

  return { id: ref.id, ...doc } as unknown as SchoolEnrollment;
}

export async function updateSchoolEnrollment(id: string, data: Partial<SchoolEnrollment>): Promise<void> {
  await db().collection("schoolEnrollments").doc(id).update({ ...data, updatedAt: now() });
}

export async function deleteSchoolEnrollment(id: string): Promise<void> {
  const enrollment = await getSchoolEnrollmentById(id);
  if (enrollment) {
    // Decrement batch count
    await db().collection("schoolBatches").doc(enrollment.batchId).update({
      enrolledStudents: admin.firestore.FieldValue.increment(-1),
    });
  }
  await db().collection("schoolEnrollments").doc(id).delete();
}

interface SchoolStudentRecord {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  phone?: string;
  role?: string;
  sccgId?: string;
  [key: string]: unknown;
}

export async function getSchoolStudents(filters?: { search?: string }): Promise<SchoolStudentRecord[]> {
  const q = db().collection("users").where("role", "in", ["student", "user"]); // Students and general users who can be enrolled
  const snap = await q.get();
  let students: SchoolStudentRecord[] = snap.docs.map((d) => toPlainObject<SchoolStudentRecord>({ id: d.id, ...d.data() }));

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    students = students.filter(
      (st) =>
        (st.name || "").toLowerCase().includes(s) ||
        (st.email || "").toLowerCase().includes(s) ||
        (st.sccgId || "").toLowerCase().includes(s)
    );
  }
  return students;
}

// ── Content ──

export async function getSchoolContent(filters?: { courseId?: string; batchId?: string }): Promise<SchoolContent[]> {
  let q: FirebaseFirestore.Query = db().collection("schoolContent").orderBy("sortOrder");
  if (filters?.courseId) q = q.where("courseId", "==", filters.courseId);
  if (filters?.batchId) q = q.where("batchId", "==", filters.batchId);
  const snap = await q.get();
  return snap.docs.map((d) => toPlainObject<SchoolContent>({ id: d.id, ...d.data() }));
}

export async function createSchoolContent(data: Omit<SchoolContent, "id" | "createdAt" | "updatedAt">): Promise<SchoolContent> {
  const doc = { ...data, createdAt: now(), updatedAt: now() };
  const ref = await db().collection("schoolContent").add(doc);
  return { id: ref.id, ...doc } as unknown as SchoolContent;
}

export async function updateSchoolContent(id: string, data: Partial<SchoolContent>): Promise<void> {
  await db().collection("schoolContent").doc(id).update({ ...data, updatedAt: now() });
}

export async function deleteSchoolContent(id: string): Promise<void> {
  await db().collection("schoolContent").doc(id).delete();
}

// ── Attendance ──

export async function getSchoolAttendance(batchId: string, sessionNumber?: number): Promise<SchoolAttendance[]> {
  let q: FirebaseFirestore.Query = db().collection("schoolAttendance").where("batchId", "==", batchId);
  if (sessionNumber !== undefined) q = q.where("sessionNumber", "==", sessionNumber);
  const snap = await q.get();
  return snap.docs.map((d) => toPlainObject<SchoolAttendance>({ id: d.id, ...d.data() }));
}

export async function recordAttendanceBatch(records: Omit<SchoolAttendance, "id">[]): Promise<void> {
  const batch = db().batch();
  for (const rec of records) {
    const ref = db().collection("schoolAttendance").doc();
    batch.set(ref, rec);
  }
  await batch.commit();
}

// ── Exam Results ──

export async function getSchoolExamResults(filters?: {
  batchId?: string;
  studentUserId?: string;
  status?: string;
}): Promise<SchoolExamResult[]> {
  let q: FirebaseFirestore.Query = db().collection("schoolExamResults").orderBy("createdAt", "desc");
  if (filters?.batchId) q = q.where("batchId", "==", filters.batchId);
  if (filters?.studentUserId) q = q.where("studentUserId", "==", filters.studentUserId);
  if (filters?.status) q = q.where("status", "==", filters.status);
  const snap = await q.get();
  return snap.docs.map((d) => toPlainObject<SchoolExamResult>({ id: d.id, ...d.data() }));
}

export async function createSchoolExamResult(data: Omit<SchoolExamResult, "id" | "createdAt" | "updatedAt">): Promise<SchoolExamResult> {
  const doc = { ...data, createdAt: now(), updatedAt: now() };
  const ref = await db().collection("schoolExamResults").add(doc);
  return { id: ref.id, ...doc } as unknown as SchoolExamResult;
}

export async function updateSchoolExamResult(id: string, data: Partial<SchoolExamResult>): Promise<void> {
  await db().collection("schoolExamResults").doc(id).update({ ...data, updatedAt: now() });
}

export async function publishExamResults(batchId: string, examType: string): Promise<number> {
  const snap = await db()
    .collection("schoolExamResults")
    .where("batchId", "==", batchId)
    .where("examType", "==", examType)
    .where("status", "==", "draft")
    .get();

  const batch = db().batch();
  const publishedAt = now();
  snap.docs.forEach((d) => {
    batch.update(d.ref, { status: "published", publishedAt, updatedAt: publishedAt });
  });
  await batch.commit();
  return snap.size;
}

// ── Certificates ──

export async function getSchoolCertificates(filters?: {
  studentUserId?: string;
  batchId?: string;
  status?: string;
  verificationCode?: string;
}): Promise<SchoolCertificate[]> {
  let q: FirebaseFirestore.Query = db().collection("schoolCertificates");
  if (filters?.studentUserId) q = q.where("studentUserId", "==", filters.studentUserId);
  if (filters?.batchId) q = q.where("batchId", "==", filters.batchId);
  if (filters?.status) q = q.where("status", "==", filters.status);
  if (filters?.verificationCode) q = q.where("verificationCode", "==", filters.verificationCode);
  const snap = await q.get();
  return snap.docs.map((d) => toPlainObject<SchoolCertificate>({ id: d.id, ...d.data() }));
}

export async function getSchoolCertificateById(id: string): Promise<SchoolCertificate | null> {
  const snap = await db().collection("schoolCertificates").doc(id).get();
  return snap.exists ? toPlainObject<SchoolCertificate>({ id: snap.id, ...snap.data() }) : null;
}

export async function createSchoolCertificate(
  data: Omit<SchoolCertificate, "id" | "sccgId" | "certificateNumber" | "verificationCode" | "verificationUrl" | "qrCodeData" | "createdAt">
): Promise<SchoolCertificate> {
  const sccgId = await generateSccgId("CERT");
  const prefix = data.certificateType === "participation" ? "CERT-PART" : "CERT-COMP";
  const year = new Date().getFullYear();
  const seqId = await generateSccgId("CERT"); // reuse for numbering
  const seq = seqId.split("-").pop() || "00001";
  const certificateNumber = `${prefix}-${year}-${seq}`;
  const verificationCode = generateVerificationCode();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://portal.sccg.com";
  const verificationUrl = `${baseUrl}/verify/${verificationCode}`;

  const doc = {
    ...data,
    sccgId,
    certificateNumber,
    verificationCode,
    verificationUrl,
    qrCodeData: verificationUrl, // QR encodes the URL
    createdAt: now(),
  };
  const ref = await db().collection("schoolCertificates").add(doc);
  return { id: ref.id, ...doc } as unknown as SchoolCertificate;
}

export async function revokeSchoolCertificate(id: string, reason: string, revokedBy: string): Promise<void> {
  await db().collection("schoolCertificates").doc(id).update({
    status: "revoked",
    revokedAt: now(),
    revocationReason: reason,
    revokedBy,
  });
}

// ── Teachers ──

export async function getSchoolTeachers(filters?: { search?: string }): Promise<SchoolTeacher[]> {
  let q: FirebaseFirestore.Query = db().collection("schoolTeachers").orderBy("name");
  const snap = await q.get();
  let results = snap.docs.map((d) => toPlainObject<SchoolTeacher>({ id: d.id, ...d.data() }));
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    results = results.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        t.email.toLowerCase().includes(s) ||
        (t.specialization || "").toLowerCase().includes(s)
    );
  }
  return results;
}

export async function getSchoolTeacherById(id: string): Promise<SchoolTeacher | null> {
  const snap = await db().collection("schoolTeachers").doc(id).get();
  return snap.exists ? toPlainObject<SchoolTeacher>({ id: snap.id, ...snap.data() }) : null;
}

export async function createSchoolTeacher(data: Omit<SchoolTeacher, "id" | "sccgId" | "createdAt" | "updatedAt">): Promise<SchoolTeacher> {
  const sccgId = await generateSccgId("TCH");
  const doc = { ...data, sccgId, createdAt: now(), updatedAt: now() };
  const ref = await db().collection("schoolTeachers").add(doc);
  return { id: ref.id, ...doc } as unknown as SchoolTeacher;
}

export async function updateSchoolTeacher(id: string, data: Partial<SchoolTeacher>): Promise<void> {
  await db().collection("schoolTeachers").doc(id).update({ ...data, updatedAt: now() });
}

export async function deleteSchoolTeacher(id: string): Promise<void> {
  await db().collection("schoolTeachers").doc(id).delete();
}

// ── Grading Scale ──

export async function getGradingScale(courseId?: string): Promise<SchoolGradingScale[]> {
  let q: FirebaseFirestore.Query = db().collection("schoolGradingScales").orderBy("minScore", "desc");
  if (courseId) q = q.where("courseId", "==", courseId);
  const snap = await q.get();
  return snap.docs.map((d) => toPlainObject<SchoolGradingScale>({ id: d.id, ...d.data() }));
}

// ============================================================
// Payment Module
// ============================================================

export async function getPayments(filters?: {
  payerUserId?: string;
  salesOrderId?: string;
  status?: string;
  paymentContext?: string;
}): Promise<Payment[]> {
  let q: FirebaseFirestore.Query = db().collection("payments").orderBy("createdAt", "desc");
  if (filters?.payerUserId) q = q.where("payerUserId", "==", filters.payerUserId);
  if (filters?.salesOrderId) q = q.where("salesOrderId", "==", filters.salesOrderId);
  if (filters?.status) q = q.where("status", "==", filters.status);
  if (filters?.paymentContext) q = q.where("paymentContext", "==", filters.paymentContext);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Payment);
}

export async function getPaymentById(id: string): Promise<Payment | null> {
  const snap = await db().collection("payments").doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as Payment) : null;
}

export async function createPayment(data: Omit<Payment, "id" | "sccgId" | "createdAt" | "updatedAt">): Promise<Payment> {
  const sccgId = await generateSccgId("PAY");
  const doc = { ...data, sccgId, createdAt: now(), updatedAt: now() };
  const ref = await db().collection("payments").add(doc);
  return { id: ref.id, ...doc } as unknown as Payment;
}

export async function updatePayment(id: string, data: Partial<Payment>): Promise<void> {
  await db().collection("payments").doc(id).update({ ...data, updatedAt: now() });
}

// ── Payment Methods Config ──

export async function getPaymentMethods(): Promise<PaymentMethodConfig[]> {
  const snap = await db().collection("paymentMethods").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentMethodConfig);
}

export async function getActivePaymentMethods(): Promise<PaymentMethodConfig[]> {
  const snap = await db().collection("paymentMethods").where("isActive", "==", true).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PaymentMethodConfig);
}

// ============================================================
// Enhanced Invoices
// ============================================================

export async function getEnhancedInvoices(filters?: {
  clientId?: string;
  salesOrderId?: string;
  status?: string;
  invoiceType?: string;
}): Promise<EnhancedInvoice[]> {
  let q: FirebaseFirestore.Query = db().collection("enhancedInvoices").orderBy("createdAt", "desc");
  if (filters?.clientId) q = q.where("clientId", "==", filters.clientId);
  if (filters?.salesOrderId) q = q.where("salesOrderId", "==", filters.salesOrderId);
  if (filters?.status) q = q.where("status", "==", filters.status);
  if (filters?.invoiceType) q = q.where("invoiceType", "==", filters.invoiceType);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EnhancedInvoice);
}

export async function createEnhancedInvoice(
  data: Omit<EnhancedInvoice, "id" | "sccgId" | "invoiceNumber" | "amountPaid" | "amountRemaining" | "createdAt" | "updatedAt">
): Promise<EnhancedInvoice> {
  const sccgId = await generateSccgId("INV");
  const prefixMap: Record<string, string> = { proforma: "PI", "tax-invoice": "INV", receipt: "RCP", "credit-note": "CN" };
  const prefix = prefixMap[data.invoiceType] || "INV";
  const year = new Date().getFullYear();
  const seq = sccgId.split("-").pop() || "00001";
  const invoiceNumber = `${prefix}-${year}-${seq}`;

  const doc = {
    ...data,
    sccgId,
    invoiceNumber,
    amountPaid: 0,
    amountRemaining: data.amount,
    createdAt: now(),
    updatedAt: now(),
  };
  const ref = await db().collection("enhancedInvoices").add(doc);
  return { id: ref.id, ...doc } as unknown as EnhancedInvoice;
}

export async function updateEnhancedInvoice(id: string, data: Partial<EnhancedInvoice>): Promise<void> {
  await db().collection("enhancedInvoices").doc(id).update({ ...data, updatedAt: now() });
}

// ============================================================
// Enhanced Installments
// ============================================================

export async function getInstallmentRules(): Promise<InstallmentRule[]> {
  const snap = await db().collection("installmentRules").where("isActive", "==", true).orderBy("minAmount").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as InstallmentRule);
}

export async function getEnhancedInstallments(filters?: {
  relatedEntityId?: string;
  clientId?: string;
  status?: string;
}): Promise<EnhancedInstallment[]> {
  let q: FirebaseFirestore.Query = db().collection("enhancedInstallments").orderBy("dueDate");
  if (filters?.relatedEntityId) q = q.where("relatedEntityId", "==", filters.relatedEntityId);
  if (filters?.clientId) q = q.where("clientId", "==", filters.clientId);
  if (filters?.status) q = q.where("status", "==", filters.status);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as EnhancedInstallment);
}

export async function createEnhancedInstallment(
  data: Omit<EnhancedInstallment, "id" | "sccgId" | "amountPaid" | "createdAt" | "updatedAt">
): Promise<EnhancedInstallment> {
  const sccgId = await generateSccgId("IST");
  const doc = { ...data, sccgId, amountPaid: 0, createdAt: now(), updatedAt: now() };
  const ref = await db().collection("enhancedInstallments").add(doc);
  return { id: ref.id, ...doc } as unknown as EnhancedInstallment;
}

export async function updateEnhancedInstallment(id: string, data: Partial<EnhancedInstallment>): Promise<void> {
  await db().collection("enhancedInstallments").doc(id).update({ ...data, updatedAt: now() });
}

/**
 * Auto-generate installments based on rules
 */
export async function generateInstallmentSchedule(params: {
  totalAmount: number;
  relatedEntityType: "sales-order" | "school-enrollment";
  relatedEntityId: string;
  orderId?: string;
  orderNumber?: string;
  schoolEnrollmentId?: string;
  clientId: string;
  clientName?: string;
  partnerId?: string;
  orderDate: Date;
}): Promise<EnhancedInstallment[]> {
  const rules = await getInstallmentRules();
  const rule = rules.find((r) => params.totalAmount >= r.minAmount && params.totalAmount <= r.maxAmount);

  if (!rule) {
    // Single payment — create one installment for full amount
    return [
      await createEnhancedInstallment({
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        schoolEnrollmentId: params.schoolEnrollmentId,
        clientId: params.clientId,
        clientName: params.clientName,
        partnerId: params.partnerId,
        installmentNumber: 1,
        totalInstallments: 1,
        amount: params.totalAmount,
        dueDate: params.orderDate.toISOString().split("T")[0],
        status: "due",
      }),
    ];
  }

  const installments: EnhancedInstallment[] = [];
  for (let i = 0; i < rule.installments; i++) {
    const amount = Math.round((params.totalAmount * rule.splitPercents[i]) / 100);
    const dueDate = new Date(params.orderDate);
    dueDate.setDate(dueDate.getDate() + rule.dueDaysFromOrder[i]);

    installments.push(
      await createEnhancedInstallment({
        relatedEntityType: params.relatedEntityType,
        relatedEntityId: params.relatedEntityId,
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        schoolEnrollmentId: params.schoolEnrollmentId,
        clientId: params.clientId,
        clientName: params.clientName,
        partnerId: params.partnerId,
        installmentNumber: i + 1,
        totalInstallments: rule.installments,
        amount,
        dueDate: dueDate.toISOString().split("T")[0],
        status: i === 0 ? "due" : "upcoming",
      })
    );
  }
  return installments;
}

// ============================================================
// SCCG Cards
// ============================================================

export async function getSccgCards(filters?: {
  issuedToUserId?: string;
  status?: string;
}): Promise<SccgCard[]> {
  let q: FirebaseFirestore.Query = db().collection("sccgCards").orderBy("createdAt", "desc");
  if (filters?.issuedToUserId) q = q.where("issuedToUserId", "==", filters.issuedToUserId);
  if (filters?.status) q = q.where("status", "==", filters.status);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SccgCard);
}

export async function getSccgCardById(id: string): Promise<SccgCard | null> {
  const snap = await db().collection("sccgCards").doc(id).get();
  return snap.exists ? ({ id: snap.id, ...snap.data() } as SccgCard) : null;
}

export async function createSccgCard(
  data: Omit<SccgCard, "id" | "sccgId" | "cardNumber" | "pinAttempts" | "createdAt" | "updatedAt">
): Promise<SccgCard> {
  const sccgId = await generateSccgId("CRD");
  const cardNumber = generateCardNumber();
  const doc = { ...data, sccgId, cardNumber, pinAttempts: 0, createdAt: now() };
  const ref = await db().collection("sccgCards").add(doc);
  return { id: ref.id, ...doc } as unknown as SccgCard;
}

export async function updateSccgCard(id: string, data: Partial<SccgCard>): Promise<void> {
  await db().collection("sccgCards").doc(id).update(data);
}

export async function getSccgCardTransactions(cardId: string): Promise<SccgCardTransaction[]> {
  const snap = await db().collection("sccgCardTransactions").where("sccgCardId", "==", cardId).orderBy("createdAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SccgCardTransaction);
}

export async function createSccgCardTransaction(data: Omit<SccgCardTransaction, "id">): Promise<SccgCardTransaction> {
  const ref = await db().collection("sccgCardTransactions").add(data);
  return { id: ref.id, ...data };
}

// ============================================================
// Role Change Requests (two-admin approval)
// ============================================================

export async function getRoleChangeRequests(status?: string): Promise<RoleChangeRequest[]> {
  let q: FirebaseFirestore.Query = db().collection("roleChangeRequests").orderBy("createdAt", "desc");
  if (status) q = q.where("status", "==", status);
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoleChangeRequest);
}

export async function createRoleChangeRequest(data: Omit<RoleChangeRequest, "id" | "createdAt">): Promise<RoleChangeRequest> {
  const doc = { ...data, createdAt: now() };
  const ref = await db().collection("roleChangeRequests").add(doc);
  return { id: ref.id, ...doc } as unknown as RoleChangeRequest;
}

export async function resolveRoleChangeRequest(id: string, approvedBy: string, status: "approved" | "rejected"): Promise<void> {
  await db().collection("roleChangeRequests").doc(id).update({
    status,
    approvedBy,
    resolvedAt: now(),
  });
}
