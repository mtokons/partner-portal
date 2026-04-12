"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import {
  getSchoolBatches,
  getSchoolBatchById,
  getSchoolEnrollments,
  getSchoolContent,
  createSchoolContent,
  updateSchoolContent,
  deleteSchoolContent,
  getSchoolAttendance,
  recordAttendanceBatch,
  getSchoolExamResults,
  createSchoolExamResult,
} from "@/lib/firestore-services";
import { writeAuditLog } from "@/lib/audit-log";
import type { ContentType, ExamType } from "@/types";

async function getTeacher() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const user = session.user as SessionUser;
  const roles = user.roles || [user.role];
  if (!roles.includes("teacher") && !roles.includes("admin")) throw new Error("Not a teacher");
  return user;
}

export async function fetchTeacherBatches() {
  const user = await getTeacher();
  return getSchoolBatches({ teacherId: user.id });
}

export async function fetchTeacherBatch(id: string) {
  const user = await getTeacher();
  const batch = await getSchoolBatchById(id);
  if (!batch) throw new Error("Batch not found");
  // Teachers can only access their own batches (admins can access all)
  const roles = user.roles || [user.role];
  if (!roles.includes("admin") && batch.teacherId !== user.id) {
    throw new Error("Access denied — not your batch");
  }
  return batch;
}

export async function fetchBatchStudents(batchId: string) {
  await getTeacher();
  return getSchoolEnrollments({ batchId });
}

export async function fetchBatchContent(batchId: string) {
  await getTeacher();
  return getSchoolContent({ batchId });
}

export async function fetchBatchAttendance(batchId: string, sessionNumber?: number) {
  await getTeacher();
  return getSchoolAttendance(batchId, sessionNumber);
}

export async function fetchBatchResults(batchId: string) {
  await getTeacher();
  return getSchoolExamResults({ batchId });
}

export async function teacherUploadContent(data: {
  courseId: string;
  batchId: string;
  title: string;
  description?: string;
  contentType: ContentType;
  fileUrl?: string;
  externalUrl?: string;
  sessionNumber?: number;
  sortOrder: number;
}) {
  const user = await getTeacher();
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

export async function teacherPublishContent(id: string) {
  const user = await getTeacher();
  await updateSchoolContent(id, { isPublished: true });

  await writeAuditLog({
    action: "school.content.published",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-content",
  });
}

export async function teacherDeleteContent(id: string) {
  const user = await getTeacher();
  await deleteSchoolContent(id);

  await writeAuditLog({
    action: "school.content.deleted",
    actorId: user.id,
    actorEmail: user.email,
    targetId: id,
    targetType: "school-content",
  });
}

export async function teacherRecordAttendance(
  batchId: string,
  sessionNumber: number,
  sessionDate: string,
  records: Array<{ studentUserId: string; studentName: string; status: "present" | "absent" | "late" | "excused" }>
) {
  const user = await getTeacher();

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

export async function teacherEnterResult(data: {
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
  const user = await getTeacher();

  const percentage = Math.round((data.obtainedScore / data.maxScore) * 100);
  const isPassed = percentage >= 40;

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
    after: { studentName: data.studentName, percentage, grade },
  });

  return result;
}
