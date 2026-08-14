import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import {
  getSchoolBatchById,
  getSchoolCourseById,
  getSchoolEnrollments,
  getSchoolTeacherById,
  getSchoolWaitingList,
} from "@/lib/firestore-services";
import BatchDetailClient from "./BatchDetailClient";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await getSchoolBatchById(id);
  return {
    title: batch ? `${batch.batchName} (${batch.batchCode}) | SCCG Language School` : "Batch Details",
  };
}

export default async function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("school.batch.manage");
  const { id } = await params;
  const batch = await getSchoolBatchById(id);
  if (!batch) notFound();

  const [course, enrollments, waitingList, teacher, coordinator] = await Promise.all([
    getSchoolCourseById(batch.courseId).catch(() => null),
    getSchoolEnrollments({ batchId: batch.id }).catch(() => []),
    getSchoolWaitingList(batch.level || course?.level).catch(() => []),
    batch.teacherId ? getSchoolTeacherById(batch.teacherId).catch(() => null) : null,
    batch.coordinatorId ? getSchoolTeacherById(batch.coordinatorId).catch(() => null) : null,
  ]);

  return (
    <BatchDetailClient
      batch={batch}
      course={course}
      enrollments={enrollments}
      waitingList={waitingList}
      teacher={teacher}
      coordinator={coordinator}
    />
  );
}
