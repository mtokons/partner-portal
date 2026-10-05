import { requirePermission } from "@/lib/permissions";
import { getSchoolTeachers, getSchoolBatches } from "@/lib/firestore-services";
import { getExperts as getServiceExperts } from "@/lib/sharepoint";
import { getExperts as getProjectExperts } from "@/lib/expert-bank";
import TeachersClient, { AvailableExpert } from "./TeachersClient";

export const metadata = {
  title: "Teachers & Instructors | SCCG Language School",
  description: "Manage language instructors, onboard from Expert Bank, and track batch assignments.",
};

export default async function TeachersPage() {
  await requirePermission("school.teacher.manage");

  const [teachers, batches, serviceExperts, projectExperts] = await Promise.all([
    getSchoolTeachers().catch(() => []),
    getSchoolBatches().catch(() => []),
    getServiceExperts().catch(() => []),
    getProjectExperts().catch(() => []),
  ]);

  // Unify and deduplicate experts from SharePoint and Expert Bank
  const expertMap = new Map<string, AvailableExpert>();

  for (const exp of serviceExperts) {
    if (exp && (exp.email || exp.name)) {
      const key = (exp.email || exp.name).trim().toLowerCase();
      expertMap.set(key, {
        id: exp.id,
        name: exp.name,
        email: exp.email || "",
        phone: exp.phone || "",
        specialization: exp.specialization || "Deutsch als Fremdsprache (DaF)",
        status: exp.status || "active",
      });
    }
  }

  for (const exp of projectExperts) {
    if (exp && (exp.email || exp.expertName)) {
      const key = (exp.email || exp.expertName).trim().toLowerCase();
      if (!expertMap.has(key)) {
        expertMap.set(key, {
          id: exp.id,
          name: exp.expertName,
          email: exp.email || "",
          specialization: exp.position || "Language Expert",
          status: exp.activeStatus || "active",
        });
      }
    }
  }

  const unifiedExperts = Array.from(expertMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <TeachersClient
      initialTeachers={teachers}
      batches={batches}
      availableExperts={unifiedExperts}
    />
  );
}