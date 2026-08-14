import { requirePermission } from "@/lib/permissions";
import { getSchoolBatches, getSchoolCourses, getSchoolTeachers } from "@/lib/firestore-services";
import BatchesClient from "./BatchesClient";

export const metadata = {
  title: "Training Batches | SCCG Language School",
  description: "Manage German Language cohorts, instructors, coordinators, and automated revenue shares.",
};

export default async function BatchesPage() {
  await requirePermission("school.batch.manage");
  const [batches, courses, teachers] = await Promise.all([
    getSchoolBatches().catch(() => []),
    getSchoolCourses().catch(() => []),
    getSchoolTeachers().catch(() => []),
  ]);

  return <BatchesClient initialBatches={batches} courses={courses} teachers={teachers} />;
}