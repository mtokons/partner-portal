import { requirePermission } from "@/lib/permissions";
import {
  getSchoolBatches,
  getSchoolCertificates,
  getSchoolEnrollments,
} from "@/lib/firestore-services";
import CertificatesClient from "./CertificatesClient";

export const metadata = {
  title: "Certificates & Evaluation Sheets | SCCG Language School",
  description: "Generate and verify QR-authenticated CEFR German language completion certificates.",
};

export default async function CertificatesPage() {
  await requirePermission("school.certificate.issue");
  const [certificates, enrollments, batches] = await Promise.all([
    getSchoolCertificates().catch(() => []),
    getSchoolEnrollments().catch(() => []),
    getSchoolBatches().catch(() => []),
  ]);

  return (
    <CertificatesClient
      initialCertificates={certificates}
      enrollments={enrollments}
      batches={batches}
    />
  );
}