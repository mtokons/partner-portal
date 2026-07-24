"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import {
  getExpertById, getCvsForExpert, getAllEvaluationsForExpert,
  bookExpert, releaseExpert, updateExpert, offerExpertToPartner, deleteBankCv, createBankCv,
  importExpertsFromProjects, deleteExpertFromBank, setExpertInactiveState,
  type BankCv, type BankEvaluation, type ImportSummary,
} from "@/lib/expert-bank";
import { getProjectOrgs } from "@/lib/project-orgs";
import { uploadDriveFile } from "@/lib/graph";

async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const roles = user?.roles || (user?.role ? [user.role] : []);
  if (!user || !roles.includes("admin")) throw new Error("Not authorised");
  return user;
}

export async function getExpertDetailAction(expertId: string): Promise<{
  cvs: BankCv[]; evaluations: BankEvaluation[];
}> {
  await requireAdmin();
  const expert = await getExpertById(expertId);
  const [cvs, evaluations] = await Promise.all([
    getCvsForExpert(expertId),
    expert ? getAllEvaluationsForExpert(expert) : Promise.resolve([]),
  ]);
  return { cvs, evaluations };
}

export async function releaseExpertAction(expertId: string) {
  await requireAdmin();
  await releaseExpert(expertId);
  revalidatePath("/admin/expert-bank");
  return { ok: true };
}

export async function bookExpertForPartnerAction(input: { expertId: string; partnerId: string; partnerName: string }) {
  await requireAdmin();
  await bookExpert(input.expertId, input.partnerId, input.partnerName);
  revalidatePath("/admin/expert-bank");
  return { ok: true };
}

export async function offerExpertAction(input: { expertId: string; partnerId: string }) {
  await requireAdmin();
  await offerExpertToPartner(input.expertId, input.partnerId);
  revalidatePath("/admin/expert-bank");
  return { ok: true };
}

export async function updateExpertMetaAction(input: {
  expertId: string; level?: string; nationality?: string; email?: string;
}) {
  await requireAdmin();
  await updateExpert(input.expertId, {
    level: input.level, nationality: input.nationality, email: input.email,
  });
  revalidatePath("/admin/expert-bank");
  return { ok: true };
}

/** Migrate/sync every existing project-staffing expert into the Master Expert Bank. */
export async function importExpertsFromProjectsAction(): Promise<{ ok: true; summary: ImportSummary }> {
  const user = await requireAdmin();
  const summary = await importExpertsFromProjects(user.email);
  revalidatePath("/admin/expert-bank");
  revalidatePath("/admin/projects");
  return { ok: true, summary };
}

export async function setExpertInactiveAction(expertId: string, inactive: boolean) {
  await requireAdmin();
  await setExpertInactiveState(expertId, inactive);
  revalidatePath(`/admin/experts/${expertId}`);
  revalidatePath("/admin/expert-bank");
  revalidatePath("/admin/projects");
  return { ok: true };
}

export async function deleteExpertAction(expertId: string) {
  await requireAdmin();
  await deleteExpertFromBank(expertId);
  revalidatePath("/admin/expert-bank");
  revalidatePath("/admin/projects");
  return { ok: true };
}

export async function deleteExpertCvAction(expertId: string, cvId: string) {
  await requireAdmin();
  await deleteBankCv(cvId);
  revalidatePath(`/admin/experts/${expertId}`);
  revalidatePath("/admin/expert-bank");
  return { ok: true };
}

export async function replaceExpertCvAction(formData: FormData) {
  const user = await requireAdmin();
  const expertId = String(formData.get("expertId") || "");
  const currentCvId = String(formData.get("currentCvId") || "");
  const file = formData.get("file");
  if (!expertId || !file || typeof file === "string") throw new Error("Missing file upload");
  const buffer = Buffer.from(await (file as File).arrayBuffer());
  const safeName = (file as File).name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "") || "cv";
  const stamp = new Date().toISOString().slice(0, 10);
  const drivePath = `ProjectPartner/ExpertBank/${expertId}/${stamp}_${safeName}`;
  await uploadDriveFile(drivePath, buffer, (file as File).type || "application/octet-stream");
  const created = await createBankCv({
    expertId,
    fileName: safeName,
    drivePath,
    format: "original",
    tailored: false,
    torExcerptId: "",
    projectId: "",
    createdBy: user.email,
  });
  if (currentCvId) {
    await deleteBankCv(currentCvId);
  }
  revalidatePath(`/admin/experts/${expertId}`);
  revalidatePath("/admin/expert-bank");
  return { ok: true, cvId: created.id, fileName: created.fileName };
}

export async function getPartnersAction(): Promise<{ id: string; name: string }[]> {
  await requireAdmin();
  const orgs = await getProjectOrgs();
  return orgs.map((o) => ({ id: o.id, name: o.name }));
}

export async function onboardExpertAction(formData: FormData) {
  const user = await requireAdmin();
  const expertName = String(formData.get("expertName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const nationality = String(formData.get("nationality") || "").trim();
  const currentLocation = String(formData.get("currentLocation") || "").trim();
  const level = String(formData.get("level") || "").trim();
  const tags = String(formData.get("tags") || "").trim();

  if (!expertName) throw new Error("Expert name is required");

  const { findOrCreateExpert, updateExpert } = await import("@/lib/expert-bank");
  const { expert } = await findOrCreateExpert({
    expertName,
    email: email || undefined,
    nationality: nationality || undefined,
    currentLocation: currentLocation || undefined,
    level: level || undefined,
    createdBy: user.email,
  });

  if (tags) {
    await updateExpert(expert.id, { tags });
  }

  const file = formData.get("file");
  if (file && typeof file !== "string" && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "") || "cv";
    const stamp = new Date().toISOString().slice(0, 10);
    const drivePath = `ProjectPartner/ExpertBank/${expert.id}/${stamp}_${safeName}`;
    await uploadDriveFile(drivePath, buffer, file.type || "application/octet-stream");
    await createBankCv({
      expertId: expert.id,
      fileName: safeName,
      drivePath,
      format: "original",
      tailored: false,
      torExcerptId: "",
      projectId: "",
      createdBy: user.email,
    });
  }

  revalidatePath("/admin/expert-bank");
  return { ok: true, expertId: expert.id };
}
