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
  deleteSchoolCertificate,
  deleteSchoolCourse,
  deleteSchoolEnrollment,
  deleteSchoolTeacher,
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
  updateSchoolCertificate,
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
  try {
    const user = await requirePermission("school.course.create");
    const courseFee = Number(formData.get("courseFee") || 500);
    const level = value(formData, "level", "A1") as CourseLevel;
    const productId = value(formData, "productId") || undefined;
    
    const course = await createSchoolCourse({
      courseName: requiredValue(formData, "courseName"),
      courseCode: requiredValue(formData, "courseCode").toUpperCase(),
      productId,
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
      createdBy: user?.email || user?.id || "system",
    });

    revalidatePath("/sccg/school/courses");
    revalidatePath("/sccg/school");
    return { success: true, courseId: course.id };
  } catch (err: any) {
    console.error("[createCourseAction] Error:", err);
    return { success: false, error: err?.message || "Failed to create course" };
  }
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
  try {
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
    const teacherSharePercent = teacher.revenueSharePercent !== undefined ? teacher.revenueSharePercent : 70;

    const batch = await createSchoolBatch({
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
      teacherSharePercent,
      coordinatorSharePercent: 5,
      sccgSharePercent: Math.max(0, 100 - teacherSharePercent - (coordinatorId ? 5 : 0)),
      createdBy: user?.email || user?.id || "system",
    });

    revalidatePath("/sccg/school/batches");
    revalidatePath("/sccg/school");
    return { success: true, batchId: batch.id };
  } catch (err: any) {
    console.error("[createBatchAction] Error:", err);
    return { success: false, error: err?.message || "Failed to create batch" };
  }
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

export async function updateBatchAction(batchId: string, formData: FormData) {
  await requirePermission("school.batch.manage");
  const batch = await getSchoolBatchById(batchId);
  if (!batch) throw new Error("Batch not found");

  const updates: any = {};
  if (formData.has("batchName")) updates.batchName = value(formData, "batchName");
  if (formData.has("startDate")) updates.startDate = value(formData, "startDate");
  if (formData.has("endDate")) updates.endDate = value(formData, "endDate");
  if (formData.has("schedule")) updates.schedule = value(formData, "schedule");
  if (formData.has("maxStudents")) updates.maxStudents = Number(formData.get("maxStudents")) || batch.maxStudents;
  if (formData.has("courseFeeEur")) updates.courseFeeEur = Number(formData.get("courseFeeEur")) || batch.courseFeeEur;
  if (formData.has("status")) updates.status = value(formData, "status") as BatchStatus;
  if (formData.has("classroomOrLink")) updates.classroomOrLink = value(formData, "classroomOrLink");

  await updateSchoolBatch(batchId, updates);
  revalidatePath("/sccg/school/batches");
  revalidatePath(`/sccg/school/batches/${batchId}`);
  revalidatePath("/sccg/school");
  return { success: true };
}

export async function updateEnrollmentTimelineAction(enrollmentId: string, courseTimeline: string) {
  try {
    await requirePermission("school.certificate.issue");
  } catch {
    await requirePermission("school.enrollment.manage");
  }

  const enrollment = await getSchoolEnrollmentById(enrollmentId);
  if (!enrollment) throw new Error("Enrollment not found");

  await updateSchoolEnrollment(enrollmentId, {
    courseTimeline: courseTimeline.trim(),
  });

  // If a certificate was already issued for this enrollment, update its timeline too (safely)
  if (enrollment.completionCertId) {
    try {
      await updateSchoolCertificate(enrollment.completionCertId, { courseTimeline: courseTimeline.trim() });
    } catch (err) {
      console.warn("Could not update completion certificate:", err);
    }
  }
  if (enrollment.participationCertId) {
    try {
      await updateSchoolCertificate(enrollment.participationCertId, { courseTimeline: courseTimeline.trim() });
    } catch (err) {
      console.warn("Could not update participation certificate:", err);
    }
  }

  try {
    revalidatePath("/sccg/school/certificates");
    revalidatePath("/sccg/school/batches");
    if (enrollment.batchId) {
      revalidatePath(`/sccg/school/batches/${enrollment.batchId}`);
    }
  } catch (_) {}

  return { success: true };
}

export async function updateCertificateTimelineAction(certId: string, courseTimeline: string) {
  try {
    await requirePermission("school.certificate.issue");
  } catch {
    await requirePermission("school.batch.manage");
  }

  await updateSchoolCertificate(certId, {
    courseTimeline: courseTimeline.trim(),
  });

  try {
    revalidatePath("/sccg/school/certificates");
  } catch (_) {}

  return { success: true };
}

// ── Smart Waiting List & Enrollment Actions ──

export async function registerStudentAction(formData: FormData) {
  try {
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
        const enrolled = Number(batch.enrolledStudents) || 0;
        const max = Number(batch.maxStudents) || 20;
        if (enrolled < max) {
          assignedBatchId = batch.id;
          batchCode = batch.batchCode || "";
          courseId = batch.courseId || "";
          courseName = batch.courseName || `German ${desiredLevel}`;
          let fee = Number(batch.courseFeeEur);
          if (!fee && batch.courseId) {
            const course = await getSchoolCourseById(batch.courseId).catch(() => null);
            if (course?.courseFee) fee = Number(course.courseFee);
          }
          totalFee = fee || 500;
          status = "enrolled";
        }
      }
    }

    const enrollment = await createSchoolEnrollment({
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
      createdBy: user?.email || user?.id || "system",
    });

    if (assignedBatchId) {
      const currentBatchEnrollments = await getSchoolEnrollments({ batchId: assignedBatchId }).catch(() => []);
      const newCount = currentBatchEnrollments.length;
      await updateSchoolBatch(assignedBatchId, {
        enrolledStudents: newCount,
        totalRevenueEur: newCount * totalFee,
      }).catch(() => {});
    }

    revalidatePath("/sccg/school/students");
    revalidatePath("/sccg/school/waiting-list");
    revalidatePath("/sccg/school/batches");
    if (assignedBatchId) {
      revalidatePath(`/sccg/school/batches/${assignedBatchId}`);
    }
    revalidatePath("/sccg/school");
    return { success: true, status, enrollmentId: enrollment.id };
  } catch (err: any) {
    console.error("[registerStudentAction] Error:", err);
    return { success: false, error: err?.message || "Failed to register student" };
  }
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

export async function deleteEnrollmentAction(enrollmentId: string) {
  try {
    await requirePermission("school.enrollment.manage");
    const enrollment = await getSchoolEnrollmentById(enrollmentId);
    if (!enrollment) throw new Error("Enrollment not found");

    await deleteSchoolEnrollment(enrollmentId);

    if (enrollment.batchId) {
      const remaining = await getSchoolEnrollments({ batchId: enrollment.batchId }).catch(() => []);
      const newCount = remaining.length;
      const batch = await getSchoolBatchById(enrollment.batchId).catch(() => null);
      const fee = Number(batch?.courseFeeEur) || 500;
      await updateSchoolBatch(enrollment.batchId, {
        enrolledStudents: newCount,
        totalRevenueEur: newCount * fee,
      }).catch(() => {});
      revalidatePath(`/sccg/school/batches/${enrollment.batchId}`);
    }

    revalidatePath("/sccg/school/enrollments");
    revalidatePath("/sccg/school/students");
    revalidatePath("/sccg/school/batches");
    revalidatePath("/sccg/school");
    return { success: true };
  } catch (err: any) {
    console.error("[deleteEnrollmentAction] Error:", err);
    throw err;
  }
}

export async function removeStudentFromWaitingListAction(enrollmentId: string) {
  await requirePermission("school.enrollment.manage");
  await deleteSchoolEnrollment(enrollmentId);
  revalidatePath("/sccg/school/waiting-list");
  revalidatePath("/sccg/school/students");
  revalidatePath("/sccg/school");
  return { success: true };
}

export async function createEnrollmentAction(formData: FormData) {
  try {
    const user = await requirePermission("school.enrollment.create");
    const studentEmail = requiredValue(formData, "studentEmail").toLowerCase();
    const batchId = requiredValue(formData, "batchId");
    const discountAmount = Number(formData.get("discountAmount") || 0);

    const batch = await getSchoolBatchById(batchId);
    if (!batch) throw new Error("Selected batch not found");

    const totalFee = batch.courseFeeEur || 500;
    const netFee = Math.max(0, totalFee - discountAmount);

    const enrollment = await createSchoolEnrollment({
      studentUserId: `std_${studentEmail.replace(/[^a-z0-9]/g, "_")}`,
      studentName: studentEmail.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      studentEmail,
      batchId: batch.id,
      batchCode: batch.batchCode,
      courseId: batch.courseId,
      courseName: batch.courseName,
      desiredLevel: batch.level || "A1",
      totalFee,
      discountAmount,
      netFee,
      paymentStatus: "pending",
      enrolledAt: new Date().toISOString(),
      status: "enrolled",
      enrollmentSource: "direct",
      batchConfirmed: true,
      createdBy: user?.email || user?.id || "system",
    });

    revalidatePath("/sccg/school/enrollments");
    revalidatePath("/sccg/school/students");
    revalidatePath("/sccg/school/batches");
    revalidatePath("/sccg/school");
    return { success: true, enrollmentId: enrollment.id };
  } catch (err: any) {
    console.error("[createEnrollmentAction] Error:", err);
    return { success: false, error: err?.message || "Failed to enroll student" };
  }
}

// ── Teacher & Team Member Actions ──

export async function createTeacherAction(formData: FormData) {
  try {
    await requirePermission("school.teacher.manage");
    const name = requiredValue(formData, "name");
    const email = requiredValue(formData, "email").toLowerCase();
    const phone = value(formData, "phone");
    const specialization = value(formData, "specialization", "Deutsch als Fremdsprache (DaF)");
    const language = value(formData, "language", "German");
    const roleCategory = value(formData, "roleCategory", "instructor") as SchoolTeamRole;
    const expertId = value(formData, "expertId");
    const revenueSharePercent = formData.has("revenueSharePercent") && formData.get("revenueSharePercent") !== ""
      ? Number(formData.get("revenueSharePercent"))
      : (roleCategory === "coordinator" ? 5 : roleCategory === "instructor" ? 70 : 0);

    const teacher = await createSchoolTeacher({
      userId: `usr_${email.replace(/[^a-z0-9]/g, "_")}`,
      expertId: expertId || undefined,
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

    revalidatePath("/sccg/school/teachers");
    revalidatePath("/sccg/school/team");
    revalidatePath("/sccg/school/batches");
    revalidatePath("/sccg/school");
    return { success: true, teacherId: teacher.id };
  } catch (err: any) {
    console.error("[createTeacherAction] Error:", err);
    return { success: false, error: err?.message || "Failed to create teacher" };
  }
}

export async function updateTeacherAction(teacherId: string, formData: FormData) {
  try {
    await requirePermission("school.teacher.manage");
    const updates: Partial<SchoolTeacher> = {};
    if (formData.has("name")) updates.name = value(formData, "name");
    if (formData.has("phone")) updates.phone = value(formData, "phone");
    if (formData.has("specialization")) updates.specialization = value(formData, "specialization");
    if (formData.has("language")) updates.language = value(formData, "language");
    if (formData.has("roleCategory")) updates.roleCategory = value(formData, "roleCategory") as SchoolTeamRole;
    if (formData.has("revenueSharePercent")) updates.revenueSharePercent = Number(formData.get("revenueSharePercent"));
    if (formData.has("status")) updates.status = value(formData, "status", "active") as "active" | "inactive";

    await updateSchoolTeacher(teacherId, updates);
    revalidatePath("/sccg/school/teachers");
    revalidatePath("/sccg/school/team");
    revalidatePath("/sccg/school/batches");
    revalidatePath("/sccg/school");
    return { success: true };
  } catch (err: any) {
    console.error("[updateTeacherAction] Error:", err);
    return { success: false, error: err?.message || "Failed to update teacher" };
  }
}

export async function deleteTeacherAction(teacherId: string) {
  try {
    await requirePermission("school.teacher.manage");
    await deleteSchoolTeacher(teacherId);
    revalidatePath("/sccg/school/teachers");
    revalidatePath("/sccg/school/team");
    revalidatePath("/sccg/school/batches");
    revalidatePath("/sccg/school");
    return { success: true };
  } catch (err: any) {
    console.error("[deleteTeacherAction] Error:", err);
    return { success: false, error: err?.message || "Failed to delete teacher" };
  }
}

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
    enrollment.batchId ? getSchoolBatchById(enrollment.batchId) : Promise.resolve(null),
    enrollment.courseId ? getSchoolCourseById(enrollment.courseId) : Promise.resolve(null),
    getSchoolCertificates({ studentUserId: enrollment.studentUserId }),
    enrollment.batchId ? getSchoolAttendance(enrollment.batchId) : Promise.resolve([]),
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

  let courseTimeline = enrollment.courseTimeline;
  if (!courseTimeline && batch?.startDate && batch?.endDate) {
    const start = new Date(batch.startDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    const end = new Date(batch.endDate).toLocaleDateString("de-DE", { month: "long", year: "numeric" });
    courseTimeline = `${start} — ${end}`;
  }

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
    courseTimeline: courseTimeline || undefined,
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

export async function deleteCertificateAction(certificateId: string) {
  await requirePermission("school.certificate.revoke");
  try {
    const certs = await getSchoolCertificates();
    const cert = certs.find((c) => c.id === certificateId);
    if (cert?.enrollmentId) {
      await updateSchoolEnrollment(cert.enrollmentId, {
        completionCertId: "" as any,
        participationCertId: "" as any,
      });
    }
  } catch (err) {
    console.warn("Could not clear enrollment certificate references:", err);
  }
  await deleteSchoolCertificate(certificateId);
  try {
    revalidatePath("/sccg/school/certificates");
    revalidatePath("/sccg/school/students");
  } catch (_) {}
  return { success: true };
}