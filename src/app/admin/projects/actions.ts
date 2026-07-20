"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin-guard";
import { getCvFileSizeError } from "@/lib/file-size";
import {
  getProjects, getProjectById, createProject, updateProject, deleteProject,
  getStaffingForProject, createStaffing, updateStaffing, deleteStaffing,
  listProjectDocuments, getDriveDocPath,
} from "@/lib/projects";
import type { Project, ProjectStaffingEntry, ProjectStatus, ExpertActiveStatus, EvaluationType } from "@/types";

async function audit(action: any, description: string, targetId?: string) {
  try {
    const actor = await assertAdmin();
    const { logActivity } = await import("@/lib/activity-log");
    await logActivity({ actorEmail: actor.email, actorId: actor.id, actorName: actor.name || undefined, actorRole: "admin", action, description, targetId, console: "admin" });
  } catch { /* non-fatal */ }
}

// ── Projects ──────────────────────────────────────────────────────────────
export async function fetchProjectsAction() {
  try { await assertAdmin(); return { success: true, data: await getProjects() }; }
  catch (e: any) { return { success: false, error: e.message }; }
}

export async function fetchProjectAction(id: string) {
  try {
    await assertAdmin();
    const { getEvaluationsForProject } = await import("@/lib/evaluation");
    const [project, staffing, cvs, proposals, documents, matrix, evaluations] = await Promise.all([
      getProjectById(id), getStaffingForProject(id),
      listProjectDocuments(id, "CVs"), listProjectDocuments(id, "Proposals"),
      listProjectDocuments(id, "Documents"), listProjectDocuments(id, "Matrix"),
      getEvaluationsForProject(id),
    ]);
    return { success: true, data: { project, staffing, cvs, proposals, documents, matrix, evaluations } };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// ── Evaluations ──────────────────────────────────────────────────────────────
export async function updateEvaluationAction(id: string, projectId: string, evalType: EvaluationType, scores: { key: string; score: number }[]) {
  try {
    await assertAdmin();
    const { updateEvaluationScores } = await import("@/lib/evaluation");
    const data = await updateEvaluationScores(id, evalType, scores);
    await audit("project_update", `Updated evaluation ${id}`, projectId);
    revalidatePath(`/admin/projects/${projectId}`);
    revalidatePath(`/project-partner/evaluation`);
    return { success: true, data };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function createProjectAction(input: Omit<Project, "id" | "createdAt"> & { useTemplate?: boolean }) {
  try {
    await assertAdmin();
    if (!input.name || !input.partnerEmail) return { success: false, error: "Name and partner email are required" };
    
    let cvFormTemplateId = input.cvFormTemplateId || "";
    let evaluationTemplateId = input.evaluationTemplateId || "";
    let client = input.client || "";
    let description = input.description || "";
    let templateStaffing: any[] = [];

    // If useTemplate is checked, clone template from GIZ project (ID: 1)
    if (input.useTemplate) {
      const templateProj = await getProjectById("1");
      if (templateProj) {
        cvFormTemplateId = templateProj.cvFormTemplateId || "";
        evaluationTemplateId = templateProj.evaluationTemplateId || "";
        if (!client) client = templateProj.client || "";
        if (!description) description = templateProj.description || "";
        templateStaffing = await getStaffingForProject("1");
      }
    }

    const p = await createProject({
      ...input,
      client,
      description,
      cvFormTemplateId,
      evaluationTemplateId,
      status: (input.status as ProjectStatus) || "active"
    });

    // Clone staffing matrix entries from standard template
    if (templateStaffing.length > 0) {
      for (const entry of templateStaffing) {
        await createStaffing({
          projectId: p.id,
          workPackage: entry.workPackage || "",
          focusObjective: entry.focusObjective || "",
          position: entry.position || "",
          expertName: entry.expertName || "",
          expertId: entry.expertId || "",
          education: entry.education || "",
          profExperience: entry.profExperience || "",
          specificExperience: entry.specificExperience || "",
          devCooperation: entry.devCooperation || "",
          expertise: entry.expertise || "",
          cvFileName: entry.cvFileName || "",
          activeStatus: entry.activeStatus || "active",
          notes: entry.notes || "",
          order: entry.order || 0
        });
      }
    }

    await audit("project_create", `Created project ${p.name}`, p.id);
    revalidatePath("/admin/projects");
    return { success: true, data: p };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateProjectAction(id: string, input: Partial<Project>) {
  try {
    await assertAdmin();
    await updateProject(id, input);
    await audit("project_update", `Updated project ${input.name || id}`, id);
    revalidatePath("/admin/projects");
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteProjectAction(id: string) {
  try {
    await assertAdmin();
    await deleteProject(id);
    await audit("project_delete", `Deleted project ${id}`, id);
    revalidatePath("/admin/projects");
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// ── Partner Organisations CRUD ──────────────────────────────────────────────
export async function createPartnerOrgAction(data: { name: string; adminEmails: string[]; status: string; notes?: string }) {
  try {
    await assertAdmin();
    const { createProjectOrg } = await import("@/lib/project-orgs");
    const org = await createProjectOrg({
      name: data.name,
      adminEmails: data.adminEmails,
      status: data.status as any,
      notes: data.notes || ""
    });
    await audit("partner_org_create", `Created partner organisation ${org.name}`, org.id);
    revalidatePath("/admin/projects");
    return { success: true, data: org };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updatePartnerOrgAction(id: string, data: { name: string; adminEmails: string[]; status: string; notes?: string }) {
  try {
    await assertAdmin();
    const { updateProjectOrg } = await import("@/lib/project-orgs");
    await updateProjectOrg(id, {
      name: data.name,
      adminEmails: data.adminEmails,
      status: data.status as any,
      notes: data.notes || ""
    });
    await audit("partner_org_update", `Updated partner organisation ${data.name}`, id);
    revalidatePath("/admin/projects");
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function createPartnerUserAction(data: {
  email: string;
  fullName: string;
  role: "project-partner" | "project-partner-admin";
  orgId: string;
  orgName: string;
}) {
  try {
    await assertAdmin();
    const { createPpmsUser } = await import("@/lib/ppms-users");
    const res = await createPpmsUser(data);
    if (res.error) return { success: false, error: res.error };
    await audit("partner_user_create", `Created partner user account ${data.email} for org ${data.orgName}`, res.userId);
    return { success: true, data: res };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function assignProjectsToPartnerAction(partnerId: string, projectIds: string[]) {
  try {
    await assertAdmin();
    const all = await getProjects();
    
    // For each project, update its orgId list
    for (const project of all) {
      const currentIds = (project.orgId || "").split(",").map(x => x.trim()).filter(Boolean);
      const shouldHave = projectIds.includes(project.id);
      
      let nextIds;
      if (shouldHave) {
        // ensure partnerId is present
        nextIds = Array.from(new Set([...currentIds, partnerId]));
      } else {
        // ensure partnerId is absent
        nextIds = currentIds.filter(id => id !== partnerId);
      }
      
      const nextOrgIdStr = nextIds.join(",");
      if (nextOrgIdStr !== (project.orgId || "")) {
        await updateProject(project.id, { orgId: nextOrgIdStr });
      }
    }
    
    await audit("partner_project_assign", `Assigned projects for partner ${partnerId}`, partnerId);
    revalidatePath("/admin/projects");
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// ── Staffing ────────────────────────────────────────────────────────────────
export async function createStaffingAction(input: Omit<ProjectStaffingEntry, "id" | "createdAt">) {
  try {
    await assertAdmin();
    const e = await createStaffing({ ...input, activeStatus: (input.activeStatus as ExpertActiveStatus) || "active" });
    await audit("project_update", `Added staffing ${e.expertName} to ${input.projectId}`, input.projectId);
    revalidatePath(`/admin/projects/${input.projectId}`);
    return { success: true, data: e };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function updateStaffingAction(id: string, projectId: string, input: Partial<ProjectStaffingEntry>) {
  try {
    await assertAdmin();
    await updateStaffing(id, input);
    await audit("project_update", `Updated staffing ${id}`, projectId);
    revalidatePath(`/admin/projects/${projectId}`);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteStaffingAction(id: string, projectId: string) {
  try {
    await assertAdmin();
    await deleteStaffing(id);
    await audit("project_update", `Removed staffing ${id}`, projectId);
    revalidatePath(`/admin/projects/${projectId}`);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

// ── Document upload / delete ──────────────────────────────────────────────────
export async function uploadProjectFileAction(projectId: string, folder: string, fileName: string, contentBase64: string, contentType: string) {
  try {
    await assertAdmin();
    if (!["CVs", "Proposals", "Documents", "Matrix"].includes(folder)) return { success: false, error: "Invalid folder" };
    const sizeError = getCvFileSizeError(Buffer.from(contentBase64, "base64").length);
    if (sizeError) return { success: false, error: sizeError };
    const { uploadDriveFile } = await import("@/lib/graph");
    await uploadDriveFile(getDriveDocPath(projectId, folder, fileName), Buffer.from(contentBase64, "base64"), contentType);
    await audit("project_cv_upload", `Uploaded ${folder}/${fileName} to ${projectId}`, projectId);
    revalidatePath(`/admin/projects/${projectId}`);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

/**
 * Replace an existing project file IN PLACE by its drive item ID. Addressing by
 * ID (not by path/filename) reliably overwrites the exact file regardless of
 * spaces/special characters in the name — fixes "only the first row replaces".
 */
export async function replaceProjectFileByIdAction(projectId: string, folder: string, itemId: string, fileName: string, contentBase64: string, contentType: string) {
  try {
    await assertAdmin();
    if (!["CVs", "Proposals", "Documents", "Matrix"].includes(folder)) return { success: false, error: "Invalid folder" };
    if (!itemId) return { success: false, error: "Missing file id" };
    const sizeError = getCvFileSizeError(Buffer.from(contentBase64, "base64").length);
    if (sizeError) return { success: false, error: sizeError };
    const { uploadDriveFileById } = await import("@/lib/graph");
    await uploadDriveFileById(itemId, Buffer.from(contentBase64, "base64"), contentType);
    await audit("project_cv_upload", `Replaced ${folder}/${fileName} (id ${itemId}) in ${projectId}`, projectId);
    revalidatePath(`/admin/projects/${projectId}`);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function deleteProjectFileAction(projectId: string, folder: string, fileName: string) {
  try {
    await assertAdmin();
    if (!["CVs", "Proposals", "Documents", "Matrix"].includes(folder)) return { success: false, error: "Invalid folder" };
    const { deleteDriveItem } = await import("@/lib/graph");
    await deleteDriveItem(getDriveDocPath(projectId, folder, fileName));
    await audit("project_cv_delete", `Deleted ${folder}/${fileName} from ${projectId}`, projectId);
    revalidatePath(`/admin/projects/${projectId}`);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function getExpertCvsAndEvaluationsAction(expertId: string, expertName: string) {
  try {
    await assertAdmin();
    const { getCvsForExpert } = await import("@/lib/expert-bank");
    const { getEvaluationsForExpertName } = await import("@/lib/evaluation");
    const [cvs, evaluations] = await Promise.all([
      getCvsForExpert(expertId),
      getEvaluationsForExpertName(expertName),
    ]);
    return { success: true, cvs, evaluations };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createEvaluationAction(params: {
  projectId: string;
  expertId: string;
  expertName: string;
  position: string;
  evalKey: string;
  cvFileName?: string;
}) {
  try {
    await assertAdmin();
    const { createEvaluationRecord, EVALUATION_TEMPLATES } = await import("@/lib/evaluation");
    const tpl = EVALUATION_TEMPLATES[params.evalKey as any];
    if (!tpl) throw new Error(`Invalid evaluation key: ${params.evalKey}`);

    const ev = await createEvaluationRecord({
      projectId: params.projectId,
      expertId: params.expertId,
      expertName: params.expertName,
      position: params.position,
      evalKey: params.evalKey,
      minPercent: tpl.minPercent,
      criteria: tpl.criteria,
      scores: [],
      cvFileName: params.cvFileName,
    });

    return { success: true, data: ev };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
