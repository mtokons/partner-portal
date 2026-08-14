"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import {
  createSchoolBatch,
  createSchoolCertificate,
  createSchoolCourse,
  createSchoolEnrollment,
  createSchoolTeacher,
  creditBatchWallets,
  deleteSchoolBatch,
  deleteSchoolCourse,
  deleteSchoolEnrollment,
  fillBatchFromWaitingList,
  getSchoolAttendance,
  getSchoolBatchById,
  getSchoolCertificates,
  getSchoolCourseById,
  getSchoolEnrollmentById,
  getSchoolStudents,
  getSchoolTeacherById,
  revokeSchoolCertificate,
  updateSchoolBatch,
  updateSchoolCourse,
  updateSchoolEnrollment,
  updateSchoolTeacher,
} from "@/lib/firestore-services";
import type { BatchStatus, CertificateType, CourseLanguage, CourseLevel, SchoolTeamRole } from "@/types";

function value(formData: FormData, key: string, fallback = ""): string {
  const result = String(formData.get(key) || fallback).trim();
  return result;
}

function requiredValue(formData: FormData, key: string): string {
  const result = String(formData.get(key) || "").trim();
  if (!result) throw new Error(`${key} is required`);
  return result;
}

// ── Course Actions ──

export async function createCourseAction(formData: FormData) {
  const user = await requirePermission("school.course.create");
  const courseFee = Number(formData.get("courseFee") || 500);
  const level = value(formData, "level", "A1") as CourseLevel;
  
  await createSchoolCourse({
    courseName: requiredValue(formData, "courseName"),
    courseCode: requiredValue(formData, "courseCode").toUpperCase(),
    language: (value(formData, "language", "german") as CourseLanguage),
    level,
    description: value(formData, "description", `Comprehensive German Language course covering ${level} CEFR standards.`),
    totalSessions: Number(formData.get("totalSessions") || 24),
    sessionDurationMinutes: Number(formData.get("sessionDurationMinutes") || 90),
    totalDurationWeeks: Number(formData.get("totalDurationWeeks") || 8),
    courseFee,
    courseFeeCurrency: "EUR",
    maxStudentsPerBatch: Number(formData.get("maxStudentsPerBatch") || 20),
    status: "published",
    createdBy: user.email || user.id,
  });

  revalidatePath("/sccg/school/courses");
  revalidatePath("/sccg/school");
  return { success: true };
}

export async function updateCourseAction(courseId: string, formData: FormData) {
  await requirePermission("school.course.create");
  const courseFee = Number(formData.get("courseFee") || 500);
  const status = value(formData, "status", "published") as "published" | "draft" | "archived";

  await updateSchoolCourse(courseId, {
    courseName: requiredValue(formData, "courseName"),
    courseCode: requiredValue(formData, "courseCode").toUpperCase(),
    level: value(formData, "level", "A1") as CourseLevel,
    description: value(formData, "description"),
    courseFee,
    totalSessions: Number(formData.get("totalSessions") || 24),
    totalDurationWeeks: Number(formData.get("totalDurationWeeks") || 8),
    maxStudentsPerBatch: Number(formData.get("maxStudentsPerBatch") || 20),
    status,
  });

  revalidatePath("/sccg/school/courses");
  revalidatePath("/sccg/school");
  return { success: true };
}

export async function deleteCourseAction(courseId: string) {
  await requirePermission("school.course.create");
  await deleteSchoolCourse(courseId);
  revalidatePath("/sccg/school/courses");
  revalidatePath("/sccg/school");
  return { success: true };
}

// ── Batch Actions ──

export async function createBatchAction(formData: FormData) {
  const user = await requirePermission("school.batch.create");
  const courseId = requiredValue(formData, "courseId");
  const course = await getSchoolCourseById(courseId);
  if (!course) throw new Error("Selected course not found");

  const teacherId = requiredValue(formData, "teacherId");
  const teacher = await getSchoolTeacherById(teacherId);
  if (!teacher) throw new Error("Selected instructor not found");

  const coordinatorId = value(formData, "coordinatorId");
  let coordinatorName = "";
  if (coordinatorId) {
    const coordinator = await getSchoolTeacherById(coordinatorId);
    coordinatorName = coordinator?.name || "";
  }

  const maxStudents = Number(formData.get("maxStudents") || course.maxStudentsPerBatch || 20);
  const courseFeeEur = Number(formData.get("courseFeeEur") || course.courseFee || 500);
  const totalRevenueEur = maxStudents * courseFeeEur;

  await createSchoolBatch({
    courseId: course.id,
    courseName: course.courseName,
    level: course.level || "A1",
    batchCode: requiredValue(formData, "batchCode").toUpperCase(),
    batchName: requiredValue(formData, "batchName"),
    teacherId: teacher.id,
    teacherName: teacher.name,
    coordinatorId: coordinatorId || undefined,
    coordinatorName: coordinatorName || undefined,
    startDate: requiredValue(formData, "startDate"),
    endDate: requiredValue(formData, "endDate"),
    schedule: value(formData, "schedule", "Mon & Wed 18:00 - 19:30 CET"),
    maxStudents,
    status: "planned",
    classroomOrLink: value(formData, "classroomOrLink"),
    courseFeeEur,
    totalRevenueEur,
    teacherSharePercent: 70,
    coordinatorSharePercent: 5,
    sccgSharePercent: 25,
    createdBy: user.email || user.id,
  });

  revalidatePath("/sccg/school/batches");
  revalidatePath("/sccg/school");
  return { success: true };
}

export async function updateBatchStatusAction(batchId: string, status: BatchStatus) {
  await requirePermission("school.batch.manage");
  const batch = await getSchoolBatchById(batchId);
  if (!batch) throw new Error("Batch not found");

  await updateSchoolBatch(batchId, { status });

  // If completed, automatically calculate and credit Instructor (70%) and Coordinator (5%) wallets
  if (status === "completed") {
    try {
      await creditBatchWallets(batchId);
    } catch (err) {
      console.error("[creditBatchWallets] Error:", err);
    }
  }

  revalidatePath("/sccg/school/batches");
  revalidatePath(`/sccg/school/batches/${batchId}`);
  revalidatePath("/sccg/school/team");
  revalidatePath("/sccg/school");
  return { success: true };
}

export async function deleteBatchAction(batchId: string) {
  await requirePermission("school.batch.manage");
  await deleteSchoolBatch(batchId);
  revalidatePath("/sccg/school/batches");
  revalidatePath("/sccg/school");
  return { success: true };
}

// ── Smart Waiting List & Enrollment Actions ──

export async function registerStudentAction(formData: FormData) {
  const user = await requirePermission("school.enrollment.create");
  const studentName = requiredValue(formData, "studentName");
  const studentEmail = requiredValue(formData, "studentEmail").toLowerCase();
  const mobileNumber = value(formData, "mobileNumber");
  const desiredLevel = value(formData, "desiredLevel", "A1").toUpperCase();
  const registrationType = value(formData, "registrationType", "batch"); // "batch" or "waiting-list"
  const batchId = value(formData, "batchId");
  const remarks = value(formData, "remarks");

  let assignedBatchId = "";
  let batchCode = "";
  let courseId = "";
  let courseName = `German ${desiredLevel}`;
  let totalFee = 500;
  let status: "enrolled" | "waiting-list" = "waiting-list";

  if (registrationType === "batch" && batchId && batchId !== "waiting-list") {
    const batch = await getSchoolBatchById(batchId);
    if (batch && !["completed", "cancelled", "archived"].includes(batch.status)) {
      if (batch.enrolledStudents < batch.maxStudents) {
        assignedBatchId = batch.id;
        batchCode = batch.batchCode;
        courseId = batch.courseId;
        courseName = batch.courseName;
        totalFee = batch.courseFeeEur || 500;
        status = "enrolled";
      }
    }
  }

  await createSchoolEnrollment({
    studentUserId: `std_${studentEmail.replace(/[^a-z0-9]/g, "_")}`,
    studentName,
    studentEmail,
    studentPhone: mobileNumber,
    mobileNumber,
    desiredLevel,
    remarks,
    batchId: assignedBatchId,
    batchCode,
    courseId,
    courseName,
    totalFee,
    discountAmount: 0,
    netFee: totalFee,
    paymentStatus: "pending",
    enrolledAt: new Date().toISOString(),
    status,
    enrollmentSource: "direct",
    batchConfirmed: status === "enrolled",
    createdBy: user.email || user.id,
  });

  revalidatePath("/sccg/school/students");
  revalidatePath("/sccg/school/waiting-list");
  revalidatePath("/sccg/school/batches");
  revalidatePath("/sccg/school");
  return { success: true, status };
}

export async function fillBatchFromWaitingListAction(batchId: string) {
  await requirePermission("school.batch.manage");
  const result = await fillBatchFromWaitingList(batchId);
  
  revalidatePath("/sccg/school/batches");
  revalidatePath(`/sccg/school/batches/${batchId}`);
  revalidatePath("/sccg/school/waiting-list");
  revalidatePath("/sccg/school/students");
  revalidatePath("/sccg/school");
  return { success: true, ...result };
}

export async function moveStudentToBatchAction(enrollmentId: string, batchId: string) {
  await requirePermission("school.enrollment.manage");
  const batch = await getSchoolBatchById(batchId);
  if (!batch) throw new Error("Batch not found");
  if (batch.enrolledStudents >= batch.maxStudents) throw new Error("Batch is full");

  await updateSchoolEnrollment(enrollmentId, {
    batchId: batch.id,
    batchCode: batch.batchCode,
    courseId: batch.courseId,
    courseName: batch.courseName,
    status: "enrolled",
    batchConfirmed: true,
  });

  revalidatePath("/sccg/school/waiting-list");
  revalidatePath("/sccg/school/students");
  revalidatePath(`/sccg/school/batches/${batchId}`);
  revalidatePath("/sccg/school/batches");
  revalidatePath("/sccg/school");
  return { success: true };
}

export async function updateEnrollmentPaymentStatusAction(enrollmentId: string, paymentStatus: "paid" | "pending") {
  await requirePermission("school.enrollment.manage");
  const enrollment = await getSchoolEnrollmentById(enrollmentId);
  if (!enrollment) throw new Error("Enrollment not found");

  const amountPaid = paymentStatus === "paid" ? enrollment.netFee : 0;
  const amountRemaining = paymentStatus === "paid" ? 0 : enrollment.netFee;

  await updateSchoolEnrollment(enrollmentId, {
    paymentStatus,
    amountPaid,
    amountRemaining,
    paymentConfirmedAt: paymentStatus === "paid" ? new Date().toISOString() : undefined,
  });

  revalidatePath("/sccg/school/enrollments");
  revalidatePath("/sccg/school/students");
  if (enrollment.batchId) {
    revalidatePath(`/sccg/school/batches/${enrollment.batchId}`);
  }
  revalidatePath("/sccg/school");
  return { success: true };
}

export async function removeStudentFromWaitingListAction(enrollmentId: string) {
  await requirePermission("school.enrollment.manage");
  await deleteSchoolEnrollment(enrollmentId);
  revalidatePath("/sccg/school/waiting-list");
  revalidatePath("/sccg/school/students");
  revalidatePath("/sccg/school");
  return { success: true };
}

// ── Team Member & Wallet Actions ──

export async function createTeamMemberAction(formData: FormData) {
  await requirePermission("school.teacher.manage");
  const name = requiredValue(formData, "name");
  const email = requiredValue(formData, "email").toLowerCase();
  const roleCategory = value(formData, "roleCategory", "instructor") as SchoolTeamRole;
  const phone = value(formData, "phone");
  const specialization = value(formData, "specialization", "German Language Instruction");
  const language = value(formData, "language", "German");
  const revenueSharePercent = roleCategory === "coordinator" ? 5 : roleCategory === "instructor" ? 70 : 0;

  await createSchoolTeacher({
    userId: `usr_${email.replace(/[^a-z0-9]/g, "_")}`,
    name,
    email,
    phone,
    specialization,
    language,
    roleCategory,
    revenueSharePercent,
    walletBalance: 0,
    assignedBatches: [],
    status: "active",
  });

  revalidatePath("/sccg/school/team");
  revalidatePath("/sccg/school");
  return { success: true };
}

export async function updateTeamMemberAction(memberId: string, formData: FormData) {
  await requirePermission("school.teacher.manage");
  const name = requiredValue(formData, "name");
  const phone = value(formData, "phone");
  const specialization = value(formData, "specialization");
  const roleCategory = value(formData, "roleCategory") as SchoolTeamRole;
  const status = value(formData, "status", "active") as "active" | "inactive";

  await updateSchoolTeacher(memberId, {
    name,
    phone,
    specialization,
    roleCategory: roleCategory || undefined,
    status,
  });

  revalidatePath("/sccg/school/team");
  return { success: true };
}

// ── Certificate & Evaluation Sheet Actions ──

export async function markEnrollmentCompletedAction(enrollmentId: string, formData: FormData) {
  await requirePermission("school.enrollment.manage");
  if (!(await getSchoolEnrollmentById(enrollmentId))) throw new Error("Enrollment not found");
  
  await updateSchoolEnrollment(enrollmentId, {
    status: "completed",
    completedAt: new Date().toISOString(),
    finalGrade: value(formData, "finalGrade", "Sehr Gut (1.0)"),
    examScore: Number(formData.get("examScore") || 95),
  });
  
  revalidatePath("/sccg/school/enrollments");
  revalidatePath("/sccg/school/students");
  revalidatePath("/sccg/school/certificates");
  return { success: true };
}

export async function issueCertificateAction(enrollmentId: string, certificateType: CertificateType) {
  const user = await requirePermission("school.certificate.issue");
  const enrollment = await getSchoolEnrollmentById(enrollmentId);
  if (!enrollment || enrollment.status !== "completed") throw new Error("Only completed enrollments are eligible");

  const [batch, course, existing, attendance] = await Promise.all([
    getSchoolBatchById(enrollment.batchId),
    getSchoolCourseById(enrollment.courseId),
    getSchoolCertificates({ studentUserId: enrollment.studentUserId }),
    getSchoolAttendance(enrollment.batchId),
  ]);

  const courseName = course?.courseName || enrollment.courseName || "German Language Course";
  const courseLevel = course?.level || (enrollment.desiredLevel as CourseLevel) || "A1";
  const batchCode = batch?.batchCode || enrollment.batchCode || "SCCG-GER";

  const duplicate = existing.find(
    (certificate) => certificate.enrollmentId === enrollment.id && certificate.certificateType === certificateType && certificate.status === "issued"
  );
  if (duplicate) return { certificateId: duplicate.id };

  const studentAttendance = attendance.filter((record) => record.studentUserId === enrollment.studentUserId);
  const attended = studentAttendance.filter((record) => ["present", "late", "excused"].includes(record.status)).length;
  const attendancePercentage = studentAttendance.length ? Math.round((attended / studentAttendance.length) * 100) : 100;

  const certificate = await createSchoolCertificate({
    certificateType,
    studentUserId: enrollment.studentUserId,
    studentName: enrollment.studentName,
    studentSccgId: enrollment.sccgId,
    enrollmentId: enrollment.id,
    courseId: enrollment.courseId || "course",
    courseName,
    courseLevel,
    batchId: enrollment.batchId || "batch",
    batchCode,
    attendancePercentage,
    finalGrade: enrollment.finalGrade || "Sehr Gut (1.0)",
    examScore: enrollment.examScore || 95,
    issuedDate: new Date().toISOString(),
    issuedBy: user.id,
    issuedByName: user.name || user.email || "SCCG Career Lab Germany",
    status: "issued",
    qrCodeData: "",
  });

  await updateSchoolEnrollment(
    enrollment.id,
    certificateType === "completion" ? { completionCertId: certificate.id } : { participationCertId: certificate.id }
  );

  revalidatePath("/sccg/school/certificates");
  revalidatePath("/sccg/school/students");
  return { certificateId: certificate.id, verificationCode: certificate.verificationCode };
}

export async function revokeCertificateAction(certificateId: string, formData: FormData) {
  const user = await requirePermission("school.certificate.revoke");
  const reason = requiredValue(formData, "reason");
  const certificate = (await getSchoolCertificates()).find((record) => record.id === certificateId);
  if (!certificate || certificate.status !== "issued") throw new Error("Active certificate not found");

  await revokeSchoolCertificate(certificateId, reason, user.email || user.id);
  revalidatePath("/sccg/school/certificates");
  revalidatePath(`/verify/${certificate.verificationCode}`);
  return { success: true };
}