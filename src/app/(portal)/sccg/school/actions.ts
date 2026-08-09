"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import {
  createSchoolBatch, createSchoolCertificate, createSchoolCourse, createSchoolEnrollment, createSchoolTeacher,
  getSchoolAttendance, getSchoolBatchById, getSchoolCertificates, getSchoolCourseById, getSchoolEnrollmentById,
  getSchoolStudents, getSchoolTeacherById, revokeSchoolCertificate, updateSchoolEnrollment,
} from "@/lib/firestore-services";
import type { CertificateType, CourseLanguage, CourseLevel } from "@/types";

function value(formData: FormData, key: string) {
  const result = String(formData.get(key) || "").trim();
  if (!result) throw new Error(`${key} is required`);
  return result;
}

export async function createCourseAction(formData: FormData) {
  const user = await requirePermission("school.course.create");
  await createSchoolCourse({
    courseName: value(formData, "courseName"), courseCode: value(formData, "courseCode").toUpperCase(),
    language: value(formData, "language") as CourseLanguage, level: value(formData, "level") as CourseLevel,
    description: String(formData.get("description") || ""), totalSessions: Number(formData.get("totalSessions") || 1),
    sessionDurationMinutes: Number(formData.get("sessionDurationMinutes") || 60), totalDurationWeeks: Number(formData.get("totalDurationWeeks") || 1),
    courseFee: Number(formData.get("courseFee") || 0), courseFeeCurrency: value(formData, "courseFeeCurrency") as "BDT" | "EUR",
    maxStudentsPerBatch: Number(formData.get("maxStudentsPerBatch") || 20), status: "draft", createdBy: user.email || user.id,
  });
  revalidatePath("/sccg/school/courses"); revalidatePath("/sccg/school");
}

export async function createTeacherAction(formData: FormData) {
  await requirePermission("school.teacher.manage");
  await createSchoolTeacher({ userId: String(formData.get("userId") || ""), name: value(formData, "name"), email: value(formData, "email").toLowerCase(), phone: String(formData.get("phone") || ""), specialization: String(formData.get("specialization") || ""), language: String(formData.get("language") || ""), revenueSharePercent: Number(formData.get("revenueSharePercent") || 0), status: "active" });
  revalidatePath("/sccg/school/teachers");
}

export async function createBatchAction(formData: FormData) {
  const user = await requirePermission("school.batch.create");
  const course = await getSchoolCourseById(value(formData, "courseId"));
  const teacher = await getSchoolTeacherById(value(formData, "teacherId"));
  if (!course || !teacher || teacher.status !== "active") throw new Error("Valid course and active teacher are required");
  await createSchoolBatch({ courseId: course.id, courseName: course.courseName, batchCode: value(formData, "batchCode").toUpperCase(), batchName: value(formData, "batchName"), teacherId: teacher.id, teacherName: teacher.name, startDate: value(formData, "startDate"), endDate: value(formData, "endDate"), schedule: value(formData, "schedule"), maxStudents: Number(formData.get("maxStudents") || course.maxStudentsPerBatch), status: "planned", classroomOrLink: String(formData.get("classroomOrLink") || ""), createdBy: user.email || user.id });
  revalidatePath("/sccg/school/batches"); revalidatePath("/sccg/school");
}

export async function createEnrollmentAction(formData: FormData) {
  const user = await requirePermission("school.enrollment.create");
  const batch = await getSchoolBatchById(value(formData, "batchId"));
  if (!batch || ["completed", "cancelled", "archived"].includes(batch.status)) throw new Error("Batch is not open for enrollment");
  if (batch.enrolledStudents >= batch.maxStudents) throw new Error("Batch is full");
  const course = await getSchoolCourseById(batch.courseId);
  if (!course) throw new Error("Course not found");
  const studentEmail = value(formData, "studentEmail").toLowerCase();
  const student = (await getSchoolStudents({ search: studentEmail })).find((record) => record.email?.toLowerCase() === studentEmail);
  if (!student) throw new Error("Student portal profile not found");
  const discountAmount = Number(formData.get("discountAmount") || 0);
  const netFee = Math.max(0, course.courseFee - discountAmount);
  await createSchoolEnrollment({ studentUserId: student.id, studentName: student.fullName || student.name || studentEmail, studentEmail, studentPhone: student.phone, batchId: batch.id, batchCode: batch.batchCode, courseId: course.id, courseName: course.courseName, totalFee: course.courseFee, discountAmount, netFee, paymentStatus: "unpaid", enrolledAt: new Date().toISOString(), status: "enrolled", enrollmentSource: "direct", batchConfirmed: true, createdBy: user.email || user.id });
  revalidatePath("/sccg/school/enrollments"); revalidatePath("/sccg/school/batches");
}

export async function markEnrollmentCompletedAction(enrollmentId: string, formData: FormData) {
  await requirePermission("school.enrollment.manage");
  if (!await getSchoolEnrollmentById(enrollmentId)) throw new Error("Enrollment not found");
  await updateSchoolEnrollment(enrollmentId, { status: "completed", completedAt: new Date().toISOString(), finalGrade: String(formData.get("finalGrade") || ""), examScore: Number(formData.get("examScore") || 0) });
  revalidatePath("/sccg/school/enrollments");
}

export async function issueCertificateAction(enrollmentId: string, certificateType: CertificateType) {
  const user = await requirePermission("school.certificate.issue");
  const enrollment = await getSchoolEnrollmentById(enrollmentId);
  if (!enrollment || enrollment.status !== "completed") throw new Error("Only completed enrollments are eligible");
  const [batch, course, existing, attendance] = await Promise.all([getSchoolBatchById(enrollment.batchId), getSchoolCourseById(enrollment.courseId), getSchoolCertificates({ studentUserId: enrollment.studentUserId }), getSchoolAttendance(enrollment.batchId)]);
  if (!batch || !course) throw new Error("Course or batch not found");
  const duplicate = existing.find((certificate) => certificate.enrollmentId === enrollment.id && certificate.certificateType === certificateType && certificate.status === "issued");
  if (duplicate) return { certificateId: duplicate.id };
  if (certificateType === "completion" && (!enrollment.finalGrade || enrollment.examScore === undefined)) throw new Error("Completion certificate requires final results");
  const studentAttendance = attendance.filter((record) => record.studentUserId === enrollment.studentUserId);
  const attended = studentAttendance.filter((record) => ["present", "late", "excused"].includes(record.status)).length;
  const attendancePercentage = studentAttendance.length ? Math.round(attended / studentAttendance.length * 100) : 0;
  const certificate = await createSchoolCertificate({ certificateType, studentUserId: enrollment.studentUserId, studentName: enrollment.studentName, studentSccgId: enrollment.sccgId, enrollmentId: enrollment.id, courseId: course.id, courseName: course.courseName, courseLevel: course.level, batchId: batch.id, batchCode: batch.batchCode, attendancePercentage, finalGrade: enrollment.finalGrade, examScore: enrollment.examScore, issuedDate: new Date().toISOString(), issuedBy: user.id, issuedByName: user.name || user.email || "SCCG", status: "issued", qrCodeData: "" });
  await updateSchoolEnrollment(enrollment.id, certificateType === "completion" ? { completionCertId: certificate.id } : { participationCertId: certificate.id });
  revalidatePath("/sccg/school/certificates");
  return { certificateId: certificate.id };
}

export async function revokeCertificateAction(certificateId: string, formData: FormData) {
  const user = await requirePermission("school.certificate.revoke");
  const reason = value(formData, "reason");
  const certificate = (await getSchoolCertificates()).find((record) => record.id === certificateId);
  if (!certificate || certificate.status !== "issued") throw new Error("Active certificate not found");
  await revokeSchoolCertificate(certificateId, reason, user.email || user.id);
  revalidatePath("/sccg/school/certificates"); revalidatePath(`/verify/${certificate.verificationCode}`);
}