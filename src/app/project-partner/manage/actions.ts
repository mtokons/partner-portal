"use server";

import { revalidatePath } from "next/cache";
import { requirePpmsManager, canManageOrg } from "@/lib/ppms-guard";
import {
  getProjectById, createProject, updateProject, deleteProject,
} from "@/lib/projects";
import {
  createCvFormTemplate, updateCvFormTemplate, deleteCvFormTemplate, getCvFormTemplateById,
  createEvaluationTemplate, updateEvaluationTemplate, deleteEvaluationTemplate, getEvaluationTemplateById,
} from "@/lib/templates";
import {
  createIntake, updateIntake, deleteIntake, getIntakeById, runExtraction, runScoring,
} from "@/lib/cv-intake";
import { createEvaluationRecord } from "@/lib/evaluation";
import { createProjectOrg, updateProjectOrg, getProjectOrgById } from "@/lib/project-orgs";
import { createPpmsUser } from "@/lib/ppms-users";
import type {
  Project, CvFormField, EvaluationCriterion, ProjectOrg,
} from "@/types";

function revalidateManage() {
  revalidatePath("/project-partner/manage/projects");
  revalidatePath("/project-partner/manage/intake");
  revalidatePath("/project-partner/manage/evaluation");
  revalidatePath("/project-partner/manage/users");
  revalidatePath("/project-partner/manage/org");
  revalidatePath("/project-partner/dashboard");
  revalidatePath("/project-partner/projects");
  revalidatePath("/project-partner/evaluation");
}

async function assertOrg(orgId: string | undefined) {
  const ctx = await requirePpmsManager();
  if (orgId && !canManageOrg(ctx, orgId)) throw new Error("Forbidden: cannot manage another org");
  return ctx;
}

// ── Organisation ────────────────────────────────────────────────────────────

export async function createOrgAction(data: Omit<ProjectOrg, "id" | "createdAt">) {
  const ctx = await requirePpmsManager();
  if (!ctx.isSccgAdmin) throw new Error("Forbidden: only SCCG admins may create organisations");
  const org = await createProjectOrg(data);
  revalidateManage();
  return org;
}

export async function updateOrgAction(id: string, data: Partial<ProjectOrg>) {
  await assertOrg(id);
  await updateProjectOrg(id, data);
  revalidateManage();
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function createProjectAction(data: Omit<Project, "id" | "createdAt">) {
  await assertOrg(data.orgId);
  const project = await createProject(data);
  revalidateManage();
  return project;
}

export async function updateProjectAction(id: string, data: Partial<Project>) {
  const existing = await getProjectById(id);
  if (!existing) throw new Error("Project not found");
  await assertOrg(existing.orgId);
  if (data.orgId) await assertOrg(data.orgId);
  await updateProject(id, data);
  revalidateManage();
}

export async function deleteProjectAction(id: string) {
  const existing = await getProjectById(id);
  if (!existing) throw new Error("Project not found");
  await assertOrg(existing.orgId);
  await deleteProject(id);
  revalidateManage();
}

// ── CV form templates ─────────────────────────────────────────────────────────

export async function saveCvFormTemplateAction(input: {
  id?: string;
  projectId: string;
  name: string;
  fields: CvFormField[];
}) {
  const project = await getProjectById(input.projectId);
  await assertOrg(project?.orgId);
  if (input.id) {
    await updateCvFormTemplate(input.id, { name: input.name, fields: input.fields });
    revalidateManage();
    return input.id;
  }
  const tpl = await createCvFormTemplate({ projectId: input.projectId, name: input.name, fields: input.fields });
  // link the form to the project if none set yet
  if (!project?.cvFormTemplateId) await updateProject(input.projectId, { cvFormTemplateId: tpl.id });
  revalidateManage();
  return tpl.id;
}

export async function deleteCvFormTemplateAction(id: string, projectId: string) {
  const project = await getProjectById(projectId);
  await assertOrg(project?.orgId);
  const tpl = await getCvFormTemplateById(id);
  if (!tpl) return;
  await deleteCvFormTemplate(id);
  if (project?.cvFormTemplateId === id) await updateProject(projectId, { cvFormTemplateId: "" });
  revalidateManage();
}

// ── Evaluation templates ──────────────────────────────────────────────────────

export async function saveEvalTemplateAction(input: {
  id?: string;
  projectId: string;
  name: string;
  evalKey: string;
  minPercent: number;
  criteria: EvaluationCriterion[];
}) {
  const project = await getProjectById(input.projectId);
  await assertOrg(project?.orgId);
  if (input.id) {
    await updateEvaluationTemplate(input.id, {
      name: input.name, evalKey: input.evalKey, minPercent: input.minPercent, criteria: input.criteria,
    });
    revalidateManage();
    return input.id;
  }
  const tpl = await createEvaluationTemplate({
    projectId: input.projectId, name: input.name, evalKey: input.evalKey,
    minPercent: input.minPercent, criteria: input.criteria,
  });
  if (!project?.evaluationTemplateId) await updateProject(input.projectId, { evaluationTemplateId: tpl.id });
  revalidateManage();
  return tpl.id;
}

export async function deleteEvalTemplateAction(id: string, projectId: string) {
  const project = await getProjectById(projectId);
  await assertOrg(project?.orgId);
  await deleteEvaluationTemplate(id);
  if (project?.evaluationTemplateId === id) await updateProject(projectId, { evaluationTemplateId: "" });
  revalidateManage();
}

// ── CV intake pipeline ────────────────────────────────────────────────────────

/** Upload a CV file (or paste raw text), extract its text, then run the AI form extraction. */
export async function uploadAndExtractAction(formData: FormData) {
  const projectId = String(formData.get("projectId") || "");
  const expertName = String(formData.get("expertName") || "");
  const position = String(formData.get("position") || "");
  const pastedText = String(formData.get("rawText") || "");
  const project = await getProjectById(projectId);
  await assertOrg(project?.orgId);
  if (!project) throw new Error("Project not found");

  let rawText = pastedText;
  let cvFileName: string | undefined;
  const file = formData.get("cv");
  if (file && typeof file !== "string" && file.size > 0) {
    const { extractCvText } = await import("@/lib/cv-extract");
    const buf = Buffer.from(await file.arrayBuffer());
    cvFileName = file.name;
    const extracted = await extractCvText(buf, file.name);
    if (extracted) rawText = extracted;
  }
  if (!rawText.trim()) throw new Error("No CV text could be extracted; paste the CV text instead.");

  // resolve the project's CV form template
  const tpl = project.cvFormTemplateId ? await getCvFormTemplateById(project.cvFormTemplateId) : null;
  const fields = tpl?.fields || [];
  const { form, provider } = fields.length ? await runExtraction(rawText, fields) : { form: {}, provider: "none" };

  // Persona 2: structured profile extraction (education/experience/languages, durations, conflicts)
  const { extractCvProfile } = await import("@/lib/agents/cv-agent");
  const { profile } = await extractCvProfile(rawText, { contextRef: `intake-upload:${projectId}` });

  const intake = await createIntake({
    projectId, orgId: project.orgId, expertName: expertName || (form.name || form.fullName || profile.fullName || "Unnamed expert"),
    position, cvFileName, rawText, form, profile, status: "draft", aiProvider: provider, notes: "",
  });
  revalidateManage();
  return { id: intake.id, provider, form };
}

export async function updateIntakeAction(id: string, data: { expertName?: string; position?: string; form?: Record<string, string>; evalKey?: string; notes?: string; status?: "draft" | "review" | "published" }) {
  const intake = await getIntakeById(id);
  if (!intake) throw new Error("Intake not found");
  const project = await getProjectById(intake.projectId);
  await assertOrg(project?.orgId);
  await updateIntake(id, data);
  revalidateManage();
}

export async function deleteIntakeAction(id: string) {
  const intake = await getIntakeById(id);
  if (!intake) throw new Error("Intake not found");
  const project = await getProjectById(intake.projectId);
  await assertOrg(project?.orgId);
  await deleteIntake(id);
  revalidateManage();
}

/**
 * Replace an existing expert's CV with a new file (or pasted text) and re-run the AI
 * extraction + mapping for that same entry. Resets the record to "draft" so it is re-scored.
 */
export async function replaceCvAction(formData: FormData) {
  const intakeId = String(formData.get("intakeId") || "");
  const intake = await getIntakeById(intakeId);
  if (!intake) throw new Error("Intake not found");
  const project = await getProjectById(intake.projectId);
  await assertOrg(project?.orgId);
  if (!project) throw new Error("Project not found");

  const pastedText = String(formData.get("rawText") || "");
  let rawText = pastedText;
  let cvFileName = intake.cvFileName;
  const file = formData.get("cv");
  if (file && typeof file !== "string" && file.size > 0) {
    const { extractCvText } = await import("@/lib/cv-extract");
    const buf = Buffer.from(await file.arrayBuffer());
    cvFileName = file.name;
    const extracted = await extractCvText(buf, file.name);
    if (extracted) rawText = extracted;
  }
  if (!rawText.trim()) throw new Error("No CV text could be extracted; upload a PDF/DOCX or paste the CV text.");

  const tpl = project.cvFormTemplateId ? await getCvFormTemplateById(project.cvFormTemplateId) : null;
  const fields = tpl?.fields || [];
  const { form, provider } = fields.length ? await runExtraction(rawText, fields) : { form: {}, provider: "none" };
  const { extractCvProfile } = await import("@/lib/agents/cv-agent");
  const { profile } = await extractCvProfile(rawText, { contextRef: `intake-replace:${intakeId}` });

  await updateIntake(intakeId, { cvFileName, rawText, form, profile, aiProvider: provider, status: "draft" });
  revalidateManage();
  return { id: intakeId, provider, fields: Object.keys(form).length };
}

/** Run AI scoring for an intake against the project's evaluation template, then publish an evaluation record. */
export async function scoreAndPublishAction(id: string) {
  const intake = await getIntakeById(id);
  if (!intake) throw new Error("Intake not found");
  const project = await getProjectById(intake.projectId);
  await assertOrg(project?.orgId);
  if (!project?.evaluationTemplateId) throw new Error("This project has no evaluation template configured.");
  const tpl = await getEvaluationTemplateById(project.evaluationTemplateId);
  if (!tpl) throw new Error("Evaluation template not found.");

  // build a profile text from extracted form + raw text
  const profileParts = Object.entries(intake.form).map(([k, v]) => `${k}: ${v}`).join("\n");
  const profileText = `${profileParts}\n\n${intake.rawText || ""}`.trim();
  const { scores, provider } = await runScoring(profileText, tpl.criteria);

  const evaluation = await createEvaluationRecord({
    projectId: project.id,
    expertId: `INTAKE-${id}`,
    expertName: intake.expertName,
    position: intake.position || tpl.name,
    evalKey: tpl.evalKey,
    minPercent: tpl.minPercent,
    criteria: tpl.criteria,
    scores,
    cvFileName: intake.cvFileName,
    notes: `AI-scored via ${provider}`,
  });

  await updateIntake(id, { status: "published", evalKey: tpl.evalKey, evaluationId: evaluation.id, aiProvider: provider });
  revalidateManage();
  return { evaluationId: evaluation.id, percentage: evaluation.percentage, passed: evaluation.passed, provider };
}

// ── Users ───────────────────────────────────────────────────────────────────

export async function createPpmsUserAction(input: {
  email: string;
  fullName: string;
  role: "project-partner" | "project-partner-admin";
  orgId: string;
}) {
  const ctx = await assertOrg(input.orgId);
  // only SCCG admins may mint other org-admins
  if (input.role === "project-partner-admin" && !ctx.isSccgAdmin) {
    throw new Error("Forbidden: only SCCG admins may create org-admin users");
  }
  const org = await getProjectOrgById(input.orgId);
  const result = await createPpmsUser({ ...input, orgName: org?.name });
  revalidateManage();
  return result;
}
