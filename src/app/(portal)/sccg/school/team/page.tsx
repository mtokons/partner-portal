import { requirePermission } from "@/lib/permissions";
import {
  getSchoolBatches,
  getSchoolTeachers,
  getTeacherEarnings,
} from "@/lib/firestore-services";
import TeamClient from "./TeamClient";

export const metadata = {
  title: "Language Team & Wallets | SCCG Language School",
  description: "Manage instructors, coordinators, staff, and internal batch earnings wallets.",
};

export default async function TeamPage() {
  await requirePermission("school.teacher.manage");
  const [teachers, batches, earnings] = await Promise.all([
    getSchoolTeachers().catch(() => []),
    getSchoolBatches().catch(() => []),
    getTeacherEarnings().catch(() => []),
  ]);

  return <TeamClient initialTeachers={teachers} batches={batches} earnings={earnings} />;
}
