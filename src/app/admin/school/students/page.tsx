import { fetchAllEnrollmentsAction, fetchBatches } from "../actions";
import { StudentsPageClient } from "@/components/school/StudentsPageClient";
import type { SchoolEnrollment, SchoolBatch } from "@/types";

export default async function StudentsPage() {
  let enrollments: SchoolEnrollment[] = [];
  let batches: SchoolBatch[] = [];

  try {
    [enrollments, batches] = await Promise.all([
      fetchAllEnrollmentsAction(),
      fetchBatches(),
    ]);
    // Serialize to plain objects to avoid passing non-serializable data to client
    enrollments = JSON.parse(JSON.stringify(enrollments));
    batches = JSON.parse(JSON.stringify(batches));
  } catch (err) {
    console.error("Failed to fetch students data:", err);
  }

  return <StudentsPageClient enrollments={enrollments} batches={batches} />;
}
