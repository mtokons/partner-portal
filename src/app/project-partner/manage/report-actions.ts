"use server";

import { revalidatePath } from "next/cache";
import { requirePpmsManager, canManageOrg } from "@/lib/ppms-guard";
import { getProjectById } from "@/lib/projects";
import { draftSection } from "@/lib/agents/report-agent";
import { createDeliverable, getDeliverableById, updateDeliverable, deleteDeliverable } from "@/lib/agents/deliverables";

function revalidateReports() {
  revalidatePath("/project-partner/manage/reports");
}

async function guardProject(projectId: string) {
  const ctx = await requirePpmsManager();
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");
  if (!canManageOrg(ctx, project.orgId)) throw new Error("Forbidden");
  return project;
}

/** Persona 4: draft a deliverable section from source material, saved as a draft for human editing. */
export async function draftDeliverableAction(input: { projectId: string; section: string; sources: string }) {
  const project = await guardProject(input.projectId);
  if (!input.section.trim()) throw new Error("Enter the deliverable section to draft.");
  if (!input.sources.trim()) throw new Error("Provide the source material to draft from.");

  const { draft, provider, runId } = await draftSection(input.section.trim(), input.sources, `report:${project.id}`);
  const d = await createDeliverable({
    projectId: project.id, section: draft.section || input.section.trim(), draftText: draft.markdown,
    editorNotes: draft.editorNotes || [], sourceRefs: draft.sourceRefs || [], status: "draft", provider, runId,
  });
  revalidateReports();
  return { id: d.id, provider, editorNotes: d.editorNotes.length };
}

export async function saveDeliverableAction(id: string, input: { draftText?: string; status?: "draft" | "final" }) {
  const d = await getDeliverableById(id);
  if (!d) throw new Error("Deliverable not found");
  await guardProject(d.projectId);
  await updateDeliverable(id, input);
  revalidateReports();
}

export async function deleteDeliverableAction(id: string) {
  const d = await getDeliverableById(id);
  if (!d) return;
  await guardProject(d.projectId);
  await deleteDeliverable(id);
  revalidateReports();
}
