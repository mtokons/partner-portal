"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import {
  updateExpert, updateBankEvaluation, bookExpert, releaseExpert, offerExpertToPartner, deleteBankCv, createBankCv,
  propagateExpertIdentityToProjects, deleteExpertFromBank, setExpertInactiveState,
} from "@/lib/expert-bank";
import { uploadDriveFile } from "@/lib/graph";
import type { ExpertStatus } from "@/lib/expert-bank";

async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const roles = user?.roles || (user?.role ? [user.role] : []);
  if (!user || !roles.includes("admin")) throw new Error("Not authorised");
  return user;
}

export async function updateExpertMetaAction(id: string, patch: {
  expertName?: string; email?: string; nationality?: string; currentLocation?: string; level?: string; tags?: string;
}) {
  await requireAdmin();
  await updateExpert(id, patch);
  // Central management: a name change flows out to every linked project staffing row.
  if (patch.expertName) await propagateExpertIdentityToProjects(id, { expertName: patch.expertName });
  revalidatePath(`/admin/experts/${id}`);
  revalidatePath("/admin/expert-bank");
  revalidatePath("/admin/projects");
  return { ok: true };
}

export async function adjustEvaluationAction(evalId: string, expertId: string, patch: {
  strengths?: string; gaps?: string; torAnalysis?: string; torMatchPct?: number;
}) {
  await requireAdmin();
  await updateBankEvaluation(evalId, { ...patch, adjusted: true });
  revalidatePath(`/admin/experts/${expertId}`);
  return { ok: true };
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

export async function setExpertStatusAction(expertId: string, action: "release" | "offer" | "soft-book" | "hard-book", partnerId?: string, partnerName?: string) {
  await requireAdmin();
  if (action === "release") await releaseExpert(expertId);
  else if (action === "offer" && partnerId) await offerExpertToPartner(expertId, partnerId);
  else if (action === "soft-book" && partnerId && partnerName) {
    const { softBookExpert } = await import("@/lib/expert-bank");
    await softBookExpert(expertId, partnerId, partnerName);
  }
  else if (action === "hard-book" && partnerId && partnerName) {
    const { hardBookExpert } = await import("@/lib/expert-bank");
    await hardBookExpert(expertId, partnerId, partnerName);
  }
  revalidatePath(`/admin/experts/${expertId}`);
  revalidatePath("/admin/expert-bank");
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
  if (currentCvId) await deleteBankCv(currentCvId);
  revalidatePath(`/admin/experts/${expertId}`);
  revalidatePath("/admin/expert-bank");
  return { ok: true, cvId: created.id, fileName: created.fileName };
}
