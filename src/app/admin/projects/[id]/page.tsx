import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-guard";
import { getProjectById, getStaffingForProject, listProjectDocuments } from "@/lib/projects";
import { getEvaluationsForProject, EVALUATION_TEMPLATES } from "@/lib/evaluation";
import { getExperts } from "@/lib/expert-bank";
import ProjectDetailAdminClient from "./ProjectDetailAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const [staffing, cvs, proposals, documents, matrix, evaluations, allExperts] = await Promise.all([
    getStaffingForProject(id),
    listProjectDocuments(id, "CVs"),
    listProjectDocuments(id, "Proposals"),
    listProjectDocuments(id, "Documents"),
    listProjectDocuments(id, "Matrix"),
    getEvaluationsForProject(id),
    getExperts(),
  ]);
  return <ProjectDetailAdminClient project={project} staffing={staffing} cvs={cvs} proposals={proposals} documents={documents} matrix={matrix} evaluations={evaluations} templates={EVALUATION_TEMPLATES} allExperts={allExperts} />;
}
