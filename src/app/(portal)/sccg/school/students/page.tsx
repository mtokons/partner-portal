import { requirePermission } from "@/lib/permissions";
import {
  getSchoolBatches,
  getSchoolCertificates,
  getSchoolCourses,
  getSchoolEnrollments,
} from "@/lib/firestore-services";
import StudentsClient from "./StudentsClient";

export const metadata = {
  title: "Student Management | SCCG Language School",
  description: "Central German language student directory, registrations, and student profiles.",
};

export default async function StudentsPage() {
  await requirePermission("school.enrollment.manage");
  const [enrollments, batches, courses, certificates] = await Promise.all([
    getSchoolEnrollments().catch(() => []),
    getSchoolBatches().catch(() => []),
    getSchoolCourses().catch(() => []),
    getSchoolCertificates().catch(() => []),
  ]);

  return (
    <StudentsClient
      initialEnrollments={enrollments}
      batches={batches}
      courses={courses}
      certificates={certificates}
    />
  );
}
