"use server";

import { revalidatePath } from "next/cache";
import { getPpmsContext } from "@/lib/ppms-guard";
import {
  findOrCreateExpert, findExpertByKey, normalizeExpertKey,
  softBookExpert, hardBookExpert, confirmBooking, releaseExpert,
  type BookingType,
} from "@/lib/expert-bank";

export interface ExpertBookingState {
  booked: boolean;
  bookingType: BookingType;
  byPartnerId: string;
  byPartnerName: string;
  isMine: boolean;
  canBook: boolean;
}

function resolvePartner(ctx: Awaited<ReturnType<typeof getPpmsContext>>) {
  const partnerId = ctx?.org?.id || "";
  const partnerName = ctx?.org?.name || ctx?.user.name || "Partner";
  return { partnerId, partnerName };
}

/** Current booking state for an expert (matched by name/email) for the active partner. */
export async function getExpertBookingStateAction(input: { expertName: string; email?: string }): Promise<ExpertBookingState> {
  const ctx = await getPpmsContext();
  const { partnerId } = resolvePartner(ctx);
  const key = normalizeExpertKey({ email: input.email, name: input.expertName });
  const expert = key ? await findExpertByKey(key) : null;
  if (!expert) {
    return { booked: false, bookingType: "", byPartnerId: "", byPartnerName: "", isMine: false, canBook: true };
  }
  const isMine = !!partnerId && expert.lockedByPartnerId === partnerId;
  const hardByOther = expert.bookingType === "hard" && !isMine;
  return {
    booked: expert.bookingType !== "",
    bookingType: expert.bookingType,
    byPartnerId: expert.lockedByPartnerId,
    byPartnerName: expert.lockedByPartnerName,
    isMine,
    canBook: ctx?.isSccgAdmin ? true : !hardByOther,
  };
}

/** Soft- or hard-book an expert straight from the evaluation matrix. Creates the bank record if needed. */
export async function bookExpertFromEvaluationAction(input: {
  expertName: string; email?: string; position?: string;
  projectId?: string; projectName?: string; bookingType: "soft" | "hard";
}): Promise<{ ok: true } | { error: string }> {
  const ctx = await getPpmsContext();
  if (!ctx) return { error: "Not authenticated" };
  const { partnerId, partnerName } = resolvePartner(ctx);
  if (!partnerId && !ctx.isSccgAdmin) return { error: "No partner organisation resolved for your account." };

  try {
    const { expert } = await findOrCreateExpert({
      expertName: input.expertName,
      email: input.email,
      position: input.position,
      createdBy: ctx.user.email,
    });
    const effectivePartnerId = partnerId || `admin:${ctx.user.email}`;
    if (input.bookingType === "hard") {
      await hardBookExpert(expert.id, effectivePartnerId, partnerName, input.projectId, input.projectName);
    } else {
      await softBookExpert(expert.id, effectivePartnerId, partnerName, input.projectId, input.projectName);
    }
    revalidatePath("/project-partner/evaluation");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Booking failed" };
  }
}

/** Confirm an existing soft booking into a hard (exclusive) one. */
export async function confirmBookingFromEvaluationAction(input: { expertName: string; email?: string }): Promise<{ ok: true } | { error: string }> {
  const ctx = await getPpmsContext();
  if (!ctx) return { error: "Not authenticated" };
  const { partnerId } = resolvePartner(ctx);
  const key = normalizeExpertKey({ email: input.email, name: input.expertName });
  const expert = key ? await findExpertByKey(key) : null;
  if (!expert) return { error: "Expert not found in bank" };
  try {
    await confirmBooking(expert.id, partnerId || expert.lockedByPartnerId);
    revalidatePath("/project-partner/evaluation");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Confirm failed" };
  }
}

/** Release an expert's booking back to the pool. */
export async function releaseBookingFromEvaluationAction(input: { expertName: string; email?: string }): Promise<{ ok: true } | { error: string }> {
  const ctx = await getPpmsContext();
  if (!ctx) return { error: "Not authenticated" };
  const key = normalizeExpertKey({ email: input.email, name: input.expertName });
  const expert = key ? await findExpertByKey(key) : null;
  if (!expert) return { error: "Expert not found in bank" };
  const { partnerId } = resolvePartner(ctx);
  if (!ctx.isSccgAdmin && expert.lockedByPartnerId && expert.lockedByPartnerId !== partnerId) {
    return { error: "Only the reserving partner or an admin can release this expert." };
  }
  try {
    await releaseExpert(expert.id);
    revalidatePath("/project-partner/evaluation");
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Release failed" };
  }
}
