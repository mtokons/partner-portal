"use server";

import { revalidatePath } from "next/cache";
import { requirePpmsManager, canManageOrg } from "@/lib/ppms-guard";
import { getProjectById, updateProject } from "@/lib/projects";
import { createCvFormTemplate, createEvaluationTemplate } from "@/lib/templates";
import { extractTor } from "@/lib/agents/tor-agent";
import { createTorDoc, getTorDocById, updateTorDoc, deleteTorDoc } from "@/lib/agents/tor-docs";
import type { EvaluationCriterion, CvFormField } from "@/types";
import type { TorStructure } from "@/lib/agents/contracts";

function revalidateTor() {
  revalidatePath("/project-partner/manage/tor");
  revalidatePath("/project-partner/manage/evaluation");
  revalidatePath("/project-partner/manage/intake");
}

async function guardProject(projectId: string) {
  const ctx = await requirePpmsManager();
  const project = await getProjectById(projectId);
  if (!project) throw new Error("Project not found");
  if (!canManageOrg(ctx, project.orgId)) throw new Error("Forbidden");
  return project;
}

/** Upload a ToR (file or pasted text), extract its text, run Persona 1, store a draft. */
export async function uploadTorAction(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const project = await guardProject(projectId);
  let rawText = String(formData.get("rawText") || "");
  let fileName = "pasted-tor.txt";
  const file = formData.get("tor");
  if (file && typeof file !== "string" && file.size > 0) {
    const { extractCvText } = await import("@/lib/cv-extract");
    const buf = Buffer.from(await file.arrayBuffer());
    fileName = file.name;
    const extracted = await extractCvText(buf, file.name);
    if (extracted) rawText = extracted;
  }
  if (!rawText.trim()) throw new Error("No ToR text could be read; paste the ToR text instead.");

  const { tor, provider, runId } = await extractTor(rawText, `tor-upload:${projectId}`);
  const doc = await createTorDoc({
    projectId: project.id, fileName, rawText, structure: tor,
    status: "draft", provider, runId,
  });
  revalidateTor();
  return {
    id: doc.id,
    error: tor.error || null,
    detectedContent: tor.detectedContent || null,
    roleCount: tor.expertRoles?.length || 0,
    provider,
  };
}

export async function deleteTorAction(id: string) {
  const doc = await getTorDocById(id);
  if (!doc) return;
  await guardProject(doc.projectId);
  await deleteTorDoc(id);
  revalidateTor();
}

/** Map a qualification's points: binary = 1, else scale by stated years. */
function pointsFor(q: { binary?: boolean; durationYears?: number | null }): number {
  if (q.binary) return 1;
  const y = q.durationYears || 0;
  if (y >= 10) return 4;
  if (y >= 5) return 3;
  return 2;
}

function slug(s: string, i: number): string {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24);
  return `${base || "crit"}_${i}`;
}

function buildCriteria(tor: TorStructure): EvaluationCriterion[] {
  const out: EvaluationCriterion[] = [];
  let i = 0;
  for (const role of tor.expertRoles || []) {
    for (const q of [...(role.mandatory || []), ...(role.preferred || [])]) {
      out.push({
        key: slug(q.text, i++),
        category: q.category || role.roleName || "Other",
        label: q.text,
        maxPoints: pointsFor(q),
      });
    }
  }
  return out;
}

/**
 * Approve a ToR draft: turn its roles + qualifications into a live CV form template
 * and evaluation matrix for the project, then link them. Human-approved, versionable.
 */
export async function approveTorAction(torId: string) {
  const doc = await getTorDocById(torId);
  if (!doc) throw new Error("ToR not found");
  const project = await guardProject(doc.projectId);
  if (!doc.structure || doc.structure.error) throw new Error("This document was not recognised as a ToR.");
  const tor = doc.structure;

  const criteria = buildCriteria(tor);
  if (criteria.length === 0) throw new Error("No qualifications found to build a matrix.");

  // Distinct categories become CV form fields the extractor targets.
  const categories = [...new Set(criteria.map((c) => c.category))];
  const fields: CvFormField[] = [
    { key: "fullName", label: "Full name", type: "text" },
    ...categories.map((cat, i) => ({
      key: `cat_${i}`,
      label: cat,
      type: "textarea" as const,
      hint: `Evidence relevant to: ${cat}`,
    })),
  ];

  const title = tor.projectTitle || project.name;
  const form = await createCvFormTemplate({ projectId: project.id, name: `${title} — CV form (from ToR)`, fields });
  const evalTpl = await createEvaluationTemplate({
    projectId: project.id,
    name: `${title} — Evaluation matrix (from ToR)`,
    evalKey: `tor-${torId}`,
    minPercent: 70,
    criteria,
  });

  await updateProject(project.id, { cvFormTemplateId: form.id, evaluationTemplateId: evalTpl.id });
  await updateTorDoc(torId, { status: "approved" });

  revalidateTor();
  return { criteria: criteria.length, roles: tor.expertRoles.length, formId: form.id, evalId: evalTpl.id };
}
