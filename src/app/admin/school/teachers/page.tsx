import { fetchTeachers } from "../actions";
import { TeachersPageClient } from "@/components/school/TeachersPageClient";
import type { SchoolTeacher } from "@/types";

export default async function TeachersPage() {
  let teachers: SchoolTeacher[] = [];

  try {
    const rawTeachers = await fetchTeachers();
    teachers = rawTeachers ? JSON.parse(JSON.stringify(rawTeachers)) : [];
  } catch (err) {
    console.error("Failed to fetch teachers:", err);
    teachers = [];
  }

  return <TeachersPageClient teachers={teachers} />;
}
