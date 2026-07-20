"use server";

import { revalidatePath } from "next/cache";
import { getPpmsContext } from "@/lib/ppms-guard";
import {
  getExpertsForPartner, getExpertById, getCvsForExpert, getEvaluationsForExpert, bookExpert,
  type BankCv, type BankEvaluation,
} from "@/lib/expert-bank";

/** Load the CVs + evaluations for one expert, enforcing the partner lock rule. */
export async function getPartnerExpertDetailAction(expertId: string): Promise<{
  cvs: BankCv[]; evaluations: BankEvaluation[];
} | { error: string }> {
  const ctx = await getPpmsContext();
  if (!ctx) return { error: "Not authenticated" };
  const partnerId = ctx.org?.id || "";
  const expert = await getExpertById(expertId);
  if (!expert) return { error: "Expert not found" };
  // Locked by another partner → invisible
  if (!ctx.isSccgAdmin && expert.status === "locked" && expert.lockedByPartnerId && expert.lockedByPartnerId !== partnerId) {
    return { error: "This expert has been booked by another partner." };
  }
  const [cvs, evaluations] = await Promise.all([
    getCvsForExpert(expertId),
    getEvaluationsForExpert(expertId),
  ]);
  return { cvs, evaluations };
}

/** Book (lock) an expert for the current partner's org. */
export async function partnerBookExpertAction(input: { expertId: string; projectId?: string; projectName?: string }) {
  const ctx = await getPpmsContext();
  if (!ctx) throw new Error("Not authenticated");
  const partnerId = ctx.org?.id;
  const partnerName = ctx.org?.name || ctx.user.name || "Partner";
  if (!partnerId) throw new Error("No partner organisation resolved for your account.");
  await bookExpert(input.expertId, partnerId, partnerName, input.projectId, input.projectName);
  revalidatePath("/project-partner/experts");
  return { ok: true };
}

// Re-export for the page to know current partner
export async function getCurrentPartnerAction() {
  const ctx = await getPpmsContext();
  return { partnerId: ctx?.org?.id || "", partnerName: ctx?.org?.name || "", isSccgAdmin: ctx?.isSccgAdmin || false };
}

// Convenience: fetch experts visible to the partner (server-side)
export async function getVisibleExpertsAction() {
  const ctx = await getPpmsContext();
  if (!ctx) return [];
  if (ctx.isSccgAdmin) {
    const { getExperts } = await import("@/lib/expert-bank");
    return getExperts();
  }
  return getExpertsForPartner(ctx.org?.id || "");
}
