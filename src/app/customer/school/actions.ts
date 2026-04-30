"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import {
  getSchoolEnrollments,
  getSchoolEnrollmentById,
  getSchoolContent,
  getSchoolAttendance,
  getSchoolExamResults,
  getSchoolCertificates,
  getSchoolBatchById,
} from "@/lib/firestore-services";

async function getStudent() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session.user as SessionUser;
}

export async function fetchMyEnrollments() {
  const user = await getStudent();
  return getSchoolEnrollments({ studentUserId: user.id });
}

export async function fetchMyEnrollment(id: string) {
  const user = await getStudent();
  const enrollment = await getSchoolEnrollmentById(id);
  if (!enrollment || enrollment.studentUserId !== user.id) throw new Error("Enrollment not found");
  return enrollment;
}

export async function fetchMyBatchInfo(batchId: string) {
  await getStudent();
  return getSchoolBatchById(batchId);
}

export async function fetchMyCourseContent(courseId: string, batchId?: string) {
  await getStudent();
  const content = await getSchoolContent({ courseId, batchId });
  return content.filter((c) => c.isPublished);
}

export async function fetchMyAttendance(batchId: string) {
  const user = await getStudent();
  // Server-side derives studentUserId from session — never trust caller.
  const all = await getSchoolAttendance(batchId);
  return all.filter((a) => a.studentUserId === user.id);
}

export async function fetchMyResults(batchId?: string) {
  const user = await getStudent();
  return getSchoolExamResults({ studentUserId: user.id, batchId, status: "published" });
}

export async function fetchMyCertificates() {
  const user = await getStudent();
  return getSchoolCertificates({ studentUserId: user.id });
}
