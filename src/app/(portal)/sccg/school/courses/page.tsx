import { requirePermission } from "@/lib/permissions";
import { getSchoolCourses } from "@/lib/firestore-services";
import { getProducts } from "@/lib/sharepoint";
import CoursesClient from "./CoursesClient";

export const metadata = {
  title: "German Courses | SCCG Language School",
  description: "Manage CEFR German Language courses A1 to C1.",
};

export default async function CoursesPage() {
  await requirePermission("school.course.create");
  const [courses, products] = await Promise.all([
    getSchoolCourses().catch(() => []),
    getProducts().catch(() => []),
  ]);

  return <CoursesClient initialCourses={courses} products={products} />;
}