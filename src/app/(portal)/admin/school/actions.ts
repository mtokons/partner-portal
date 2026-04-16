"use server";

import {
  getSchoolCourses, createSchoolCourse, updateSchoolCourse, getSchoolCourseById,
  getSchoolBatches, createSchoolBatch, updateSchoolBatch, getSchoolBatchById,
  getSchoolEnrollments, createSchoolEnrollment, updateSchoolEnrollment, getSchoolEnrollmentById,
  getSchoolContent, createSchoolContent, updateSchoolContent, deleteSchoolContent,
  getSchoolAttendance, recordAttendanceBatch,
  getSchoolExamResults, createSchoolExamResult, updateSchoolExamResult, publishExamResults,
  getSchoolCertificates, createSchoolCertificate, revokeSchoolCertificate, getSchoolCertificateById,
  generateInstallmentSchedule,
  getSchoolStudents,
} from "@/lib/firestore-services";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit-log";
import {
  sendEmailViaGraph,
  buildEnrollmentConfirmationEmail,
  buildCertificateEmail,
  buildResultsPublishedEmail,
} from "@/lib/email";
import type {
  CourseLanguage, CourseLevel, CourseStatus, BatchStatus,
  SchoolStudentStatus, ContentType, ExamType,
  CertificateType, SchoolEnrollment,
} from "@/types";
import { revalidatePath } from "next/cache";
import { generateSccgId } from "@/lib/sccg-id";
import { getAdminFirestore } from "@/lib/firebase-admin";

// ── Courses ──

export async function fetchCourses(status?: string) {
  await requirePermission("school.course.create");
  return getSchoolCourses(status);
}

export async function fetchCourseById(id: string) {
  await requirePermission("school.course.create");
  return getSchoolCourseById(id);
}

export async function createCourse(data: {
  courseName: string;
  courseCode: string;
  language: CourseLanguage;
  level: CourseLevel;
  description: string;
  totalSessions: number;
  sessionDurationMinutes: number;
  totalDurationWeeks: number;
  courseFee: number;
  courseFeeCurrency: "BDT" | "EUR";
  maxStudentsPerBatch: number;
  prerequisites?: string;
}) {
  const user = await requirePermission("school.course.create");
  const isTeacher = (user.roles || []).includes("teacher") && !(user.roles || []).includes("admin") && !(user.roles || []).includes("school-manager");

  const course = await createSchoolCourse({
    ...data,
    status: isTeacher ? "draft" : "published", // Teachers create drafts
    createdBy: user.id,
  });

  await writeAuditLog({
    action: "school.course.created",
    actorId: user.id,
    actorEmail: user.email,
    targetId: course.id,
    targetType: "school-course",
    after: { courseName: course.courseName, courseCode: course.courseCode, status: course.status },
  });

  revalidatePath("/admin/school/courses");
  return course;
}

export async function publishCourse(id: string) {
  const user = await requirePermission("school.course.publish");
  await updateSchoolCourse(id, { status: "published" });

  await writeAuditLog({
    action: "school.course.published",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-course",
  });
  
  revalidatePath("/admin/school/courses");
}

// ── Batches ──

export async function fetchBatches(filters?: { courseId?: string; status?: string; teacherId?: string }) {
  await requirePermission("school.batch.manage");
  return getSchoolBatches(filters);
}

export async function fetchBatchById(id: string) {
  await requirePermission("school.batch.manage");
  return getSchoolBatchById(id);
}

export async function createBatch(data: {
  courseId: string;
  courseName: string;
  batchCode: string;
  batchName: string;
  teacherId: string;
  teacherName: string;
  startDate: string;
  endDate: string;
  schedule: string;
  maxStudents: number;
  classroomOrLink?: string;
  notes?: string;
}) {
  const user = await requirePermission("school.batch.create");

  const batch = await createSchoolBatch({
    ...data,
    status: "planned",
    createdBy: user.id,
  });

  await writeAuditLog({
    action: "school.batch.created",
    actorId: user.id,
    actorEmail: user.email,
    targetId: batch.id,
    targetType: "school-batch",
    after: { batchCode: batch.batchCode, courseName: data.courseName },
  });

  revalidatePath("/admin/school/batches");
  return batch;
}

export async function updateBatchStatus(id: string, status: BatchStatus) {
  const user = await requirePermission("school.batch.manage");
  await updateSchoolBatch(id, { status });

  await writeAuditLog({
    action: "school.batch.status.changed",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-batch",
    after: { status },
  });
  
  revalidatePath("/admin/school/batches");
}

export async function fetchAvailableBatches() {
  await requirePermission("school.batch.manage");
  const batches = await getSchoolBatches({ status: "planned" });
  
  // Attach course info (like fees) to batches for easier UI
  const courses = await getSchoolCourses();
  return batches.map(b => {
    const course = courses.find(c => c.id === b.courseId);
    return {
      ...b,
      baseFee: course?.baseFee || 0,
      courseName: course?.courseName || b.courseName,
    };
  });
}

// ── Enrollments ──

export async function fetchEnrollments(filters?: { batchId?: string; courseId?: string; studentUserId?: string; status?: string }) {
  await requirePermission("school.enrollment.manage");
  return getSchoolEnrollments(filters);
}

export async function fetchEnrollmentById(id: string) {
  await requirePermission("school.enrollment.manage");
  return getSchoolEnrollmentById(id);
}

export async function enrollStudent(data: {
  studentUserId?: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  isNewStudent?: boolean;
  batchId: string;
  batchCode: string;
  courseId: string;
  courseName: string;
  totalFee: number;
  discountAmount?: number;
  discountReason?: string;
}) {
  const adminUser = await requirePermission("school.enrollment.create");
  let finalStudentUserId = data.studentUserId;

  // 1. Handle New Student Registration
  if (data.isNewStudent || !finalStudentUserId) {
    const db = getAdminFirestore();
    const sccgId = await generateSccgId("USR");
    
    // Check if user already exists by email
    const existingUser = await db.collection("users").where("email", "==", data.studentEmail).limit(1).get();
    if (!existingUser.empty) {
      finalStudentUserId = existingUser.docs[0].id;
    } else {
      const newUserDoc = {
        name: data.studentName,
        email: data.studentEmail,
        phone: data.studentPhone || "",
        role: "student",
        sccgId,
        status: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ref = await db.collection("users").add(newUserDoc);
      finalStudentUserId = ref.id;
    }
  }

  if (!finalStudentUserId) throw new Error("Could not determine Student User ID");

  // 2. Check for duplicate enrollment
  const existing = await getSchoolEnrollments({
    studentUserId: finalStudentUserId,
    batchId: data.batchId,
  });
  const active = existing.filter((e) => !["dropped", "expelled"].includes(e.status));
  if (active.length > 0) {
    throw new Error("Student is already enrolled in this batch");
  }

  const discountAmount = data.discountAmount || 0;
  const netFee = data.totalFee - discountAmount;

  // 3. Create Enrollment
  const enrollment = await createSchoolEnrollment({
    studentUserId: finalStudentUserId,
    studentName: data.studentName,
    studentEmail: data.studentEmail,
    studentPhone: data.studentPhone,
    batchId: data.batchId,
    batchCode: data.batchCode,
    courseId: data.courseId,
    courseName: data.courseName,
    totalFee: data.totalFee,
    discountAmount,
    discountReason: data.discountReason,
    netFee,
    paymentStatus: "unpaid",
    enrolledAt: new Date().toISOString(),
    status: "enrolled",
    createdBy: adminUser.id,
  });

  // 4. Generate installments if fee > 10,000
  if (netFee >= 10000) {
    await generateInstallmentSchedule({
      totalAmount: netFee,
      relatedEntityType: "school-enrollment",
      relatedEntityId: enrollment.id,
      schoolEnrollmentId: enrollment.id,
      clientId: finalStudentUserId,
      clientName: data.studentName,
      orderDate: new Date(),
    });
  }

  // 5. Audit Log
  await writeAuditLog({
    action: "school.enrollment.created",
    actorId: adminUser.id,
    actorEmail: adminUser.email,
    targetId: enrollment.id,
    targetType: "school-enrollment",
    after: { studentName: data.studentName, batchCode: data.batchCode, netFee, isNewStudent: data.isNewStudent },
  });

  revalidatePath("/admin/school/enrollments");
  return enrollment;
}

export async function updateEnrollmentStatus(id: string, status: SchoolStudentStatus) {
  const user = await requirePermission("school.enrollment.manage");
  await updateSchoolEnrollment(id, { status });

  await writeAuditLog({
    action: "school.enrollment.status.changed",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-enrollment",
    after: { status },
  });
}

export async function fetchStudentsAction(search?: string) {
  await requirePermission("school.enrollment.create");
  return getSchoolStudents({ search });
}

// ── Content ──

export async function fetchContent(filters?: { courseId?: string; batchId?: string }) {
  await requirePermission("school.content.upload");
  return getSchoolContent(filters);
}

export async function uploadContent(data: {
  courseId: string;
  batchId?: string;
  title: string;
  description?: string;
  contentType: ContentType;
  fileUrl?: string;
  externalUrl?: string;
  fileSize?: number;
  sessionNumber?: number;
  sortOrder: number;
}) {
  const user = await requirePermission("school.content.upload");

  const content = await createSchoolContent({
    ...data,
    isPublished: false,
    uploadedBy: user.id,
    uploadedByName: user.name,
  });

  await writeAuditLog({
    action: "school.content.uploaded",
    actorId: user.id,
    actorEmail: user.email,
    targetId: content.id,
    targetType: "school-content",
    after: { title: data.title, contentType: data.contentType },
  });

  return content;
}

export async function publishContent(id: string) {
  const user = await requirePermission("school.content.upload");
  await updateSchoolContent(id, { isPublished: true });

  await writeAuditLog({
    action: "school.content.published",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-content",
  });
}

export async function removeContent(id: string) {
  const user = await requirePermission("school.content.upload");
  await deleteSchoolContent(id);

  await writeAuditLog({
    action: "school.content.deleted",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-content",
  });
}

// ── Attendance ──

export async function fetchAttendance(batchId: string, sessionNumber?: number) {
  await requirePermission("school.attendance.record");
  return getSchoolAttendance(batchId, sessionNumber);
}

export async function submitAttendance(
  batchId: string,
  sessionNumber: number,
  sessionDate: string,
  records: Array<{ studentUserId: string; studentName: string; status: "present" | "absent" | "late" | "excused" }>
) {
  const user = await requirePermission("school.attendance.record");

  const attendanceRecords = records.map((r) => ({
    batchId,
    sessionNumber,
    sessionDate,
    studentUserId: r.studentUserId,
    studentName: r.studentName,
    status: r.status,
    markedBy: user.id,
    markedAt: new Date().toISOString(),
  }));

  await recordAttendanceBatch(attendanceRecords);

  await writeAuditLog({
    action: "school.attendance.recorded",
    actorId: user.id,
    actorEmail: user.email,
    targetId: batchId,
    targetType: "school-batch",
    metadata: { sessionNumber, studentCount: records.length },
  });
}

// ── Exam Results ──

export async function fetchExamResults(filters?: { batchId?: string; studentUserId?: string; status?: string }) {
  // Allow teacher (own batch) or admin/school-manager
  await requirePermission("school.results.enter");
  return getSchoolExamResults(filters);
}

export async function enterExamResult(data: {
  batchId: string;
  courseId: string;
  studentUserId: string;
  studentName: string;
  enrollmentId: string;
  examType: ExamType;
  examName: string;
  examDate: string;
  maxScore: number;
  obtainedScore: number;
  remarks?: string;
}) {
  const user = await requirePermission("school.results.enter");

  const percentage = Math.round((data.obtainedScore / data.maxScore) * 100);
  const isPassed = percentage >= 40;

  // Determine grade
  let grade = "F";
  if (percentage >= 90) grade = "A+";
  else if (percentage >= 80) grade = "A";
  else if (percentage >= 70) grade = "B+";
  else if (percentage >= 60) grade = "B";
  else if (percentage >= 50) grade = "C";
  else if (percentage >= 40) grade = "D";

  const result = await createSchoolExamResult({
    ...data,
    percentage,
    grade,
    isPassed,
    status: "draft",
    enteredBy: user.id,
  });

  await writeAuditLog({
    action: "school.results.entered",
    actorId: user.id,
    actorEmail: user.email,
    targetId: result.id,
    targetType: "school-exam-result",
    after: { studentName: data.studentName, examType: data.examType, percentage, grade },
  });

  return result;
}

export async function publishResults(batchId: string, examType: string) {
  const user = await requirePermission("school.results.publish");

  const count = await publishExamResults(batchId, examType);

  // Notify students
  const enrollments = await getSchoolEnrollments({ batchId });
  const batch = await getSchoolBatchById(batchId);

  for (const enrollment of enrollments) {
    try {
      const emailData = buildResultsPublishedEmail({
        studentName: enrollment.studentName,
        courseName: enrollment.courseName,
        batchCode: enrollment.batchCode,
        examName: `${examType} Exam`,
      });
      await sendEmailViaGraph({
        to: enrollment.studentEmail,
        toName: enrollment.studentName,
        subject: emailData.subject,
        htmlBody: emailData.htmlBody,
        senderUserId: process.env.O365_SCHOOL_SENDER || undefined,
      });
    } catch (err) {
      console.error("Failed to send results email to", enrollment.studentEmail, err);
    }
  }

  await writeAuditLog({
    action: "school.results.published",
    actorId: user.id,
    actorEmail: user.email,
    targetId: batchId,
    targetType: "school-batch",
    metadata: { examType, publishedCount: count },
  });

  return count;
}

// ── Certificates ──

export async function fetchCertificates(filters?: { studentUserId?: string; batchId?: string; status?: string }) {
  await requirePermission("school.certificate.issue");
  return getSchoolCertificates(filters);
}

export async function fetchCertificateById(id: string) {
  await requirePermission("school.certificate.issue");
  return getSchoolCertificateById(id);
}

/**
 * Determine eligible students for certificate issuance
 */
export async function getCertificateEligibility(batchId: string) {
  await requirePermission("school.certificate.issue");

  const enrollments = await getSchoolEnrollments({ batchId, status: "completed" });
  const allAttendance = await getSchoolAttendance(batchId);
  const batch = await getSchoolBatchById(batchId);
  const results = await getSchoolExamResults({ batchId, status: "published" });

  if (!batch) throw new Error("Batch not found");

  const totalSessions = batch.enrolledStudents > 0
    ? [...new Set(allAttendance.map((a) => a.sessionNumber))].length
    : 0;

  return enrollments.map((enrollment) => {
    const studentAttendance = allAttendance.filter((a) => a.studentUserId === enrollment.studentUserId);
    const presentCount = studentAttendance.filter((a) => a.status === "present" || a.status === "late").length;
    const attendancePercent = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 0;

    const finalResult = results.find(
      (r) => r.studentUserId === enrollment.studentUserId && r.examType === "final"
    );

    return {
      enrollment,
      attendancePercent,
      finalGrade: finalResult?.grade || null,
      examScore: finalResult?.percentage || null,
      isPassed: finalResult?.isPassed || false,
      eligibleParticipation: attendancePercent >= 75,
      eligibleCompletion: attendancePercent >= 75 && (finalResult?.isPassed || false),
    };
  });
}

export async function issueCertificate(data: {
  certificateType: CertificateType;
  studentUserId: string;
  studentName: string;
  studentSccgId: string;
  enrollmentId: string;
  courseId: string;
  courseName: string;
  courseLevel: string;
  batchId: string;
  batchCode: string;
  attendancePercentage: number;
  finalGrade?: string;
  examScore?: number;
}) {
  const user = await requirePermission("school.certificate.issue");

  const cert = await createSchoolCertificate({
    certificateType: data.certificateType,
    studentUserId: data.studentUserId,
    studentName: data.studentName,
    studentSccgId: data.studentSccgId,
    enrollmentId: data.enrollmentId,
    courseId: data.courseId,
    courseName: data.courseName,
    courseLevel: data.courseLevel as import("@/types").CourseLevel,
    batchId: data.batchId,
    batchCode: data.batchCode,
    attendancePercentage: data.attendancePercentage,
    finalGrade: data.finalGrade,
    examScore: data.examScore,
    issuedDate: new Date().toISOString().split("T")[0],
    issuedBy: user.id,
    issuedByName: user.name,
    status: "issued",
  });

  // Update enrollment with cert ID
  const certField = data.certificateType === "participation" ? "participationCertId" : "completionCertId";
  await updateSchoolEnrollment(data.enrollmentId, { [certField]: cert.id });

  // Send certificate email
  try {
    const enrollment = await getSchoolEnrollmentById(data.enrollmentId);
    const emailData = buildCertificateEmail({
      studentName: data.studentName,
      certificateType: data.certificateType === "participation" ? "Participation Certificate" : "Course Completion Certificate",
      courseName: data.courseName,
      certificateNumber: cert.certificateNumber,
      verificationUrl: cert.verificationUrl,
    });
    await sendEmailViaGraph({
      to: enrollment?.studentEmail || "",
      toName: data.studentName,
      subject: emailData.subject,
      htmlBody: emailData.htmlBody,
      senderUserId: process.env.O365_SCHOOL_SENDER || undefined,
    });
  } catch (err) {
    console.error("Failed to send certificate email:", err);
  }

  await writeAuditLog({
    action: "certificate.issued",
    actorId: user.id,
    actorEmail: user.email,
    targetId: cert.id,
    targetType: "school-certificate",
    after: {
      certificateNumber: cert.certificateNumber,
      certificateType: data.certificateType,
      studentName: data.studentName,
      verificationCode: cert.verificationCode,
    },
  });

  revalidatePath("/admin/school/certificates");
  return cert;
}

export async function revokeCertificateAction(id: string, reason: string) {
  const user = await requirePermission("school.certificate.revoke");
  await revokeSchoolCertificate(id, reason, user.id);

  await writeAuditLog({
    action: "certificate.revoked",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-certificate",
    after: { reason },
  });
}
