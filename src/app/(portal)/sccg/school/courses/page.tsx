import { requirePermission } from "@/lib/permissions";
import { getSchoolCourses } from "@/lib/firestore-services";
import CoursesClient from "./CoursesClient";

export const metadata = {
  title: "German Courses | SCCG Language School",
  description: "Manage CEFR German Language courses A1 to C1.",
};

export default async function CoursesPage() {
  await requirePermission("school.course.create");
  const courses = await getSchoolCourses().catch(() => []);

  return <CoursesClient initialCourses={courses} />;
}