"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import {
  getCandidates,
  getCandidateById,
  createCandidate,
  createCandidateService,
  createCandidateTask,
  updateCandidate,
  advanceCandidateStatus,
} from "@/lib/sharepoint";
import { canTransitionTo } from "@/lib/engine/candidate-workflow";
import { calculateFinancialSplit } from "@/lib/engine/financial-split";
import { autoInsertCandidateTasks } from "@/lib/engine/candidate-tasks";
import { generateSccgId } from "@/lib/sccg-id";
import { triggerFlow } from "@/lib/powerautomate";
import type { Candidate, CandidateService, WorkflowCategory, PartnerMargin, CandidatePaymentStatus } from "@/types";
import crypto from "crypto";

export async function searchCandidatesAction(
  query: string
): Promise<Candidate[]> {
  await requirePermission("candidate.view.own");
  if (!query.trim()) return [];
  const all = await getCandidates();
  const q = query.toLowerCase();
  return all
    .filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.sccgId.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    )
    .slice(0, 10);
}

export interface WizardCandidateInput {
  partnerId: string;
  workflowCategory: WorkflowCategory;
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  address?: string;
  passportNumber?: string;
  nationalId?: string;
  nationality: string;
  country: string;
  selectedServices: {
    servicePricingId: string;
    serviceName: string;
    packageType: "all-inclusive" | "premium-bundle" | "add-on";
    basePrice: number;
    quantity: number;
  }[];
  partnerMarginPercentage: PartnerMargin;
  paymentOption: "pay-now" | "pay-later";
  paymentMethod?: string;
  paymentReference?: string;
}

export async function finalizeRegistrationAction(
  state: WizardCandidateInput,
  partnerId: string
): Promise<{ submissionId: string; candidateId: string } | { error: string }> {
  try {
    const user = await requirePermission("candidate.create");

    const split = calculateFinancialSplit({
      services: state.selectedServices.map((s) => ({
        servicePricingId: s.servicePricingId,
        serviceName: s.serviceName,
        basePrice: s.basePrice,
        quantity: s.quantity,
      })),
      partnerMarginPercentage: state.partnerMarginPercentage,
    });

    const sccgId = await generateSccgId("CND");
    const submissionId = crypto.randomUUID();

    const paymentStatus: CandidatePaymentStatus =
      state.paymentOption === "pay-now" ? "deposit-paid" : "pending";

    const candidate = await createCandidate({
      sccgId,
      submissionId,
      partnerId,
      workflowCategory: state.workflowCategory,
      currentStatus: "REGISTERED",
      fullName: state.fullName,
      dateOfBirth: state.dateOfBirth,
      email: state.email,
      phone: state.phone,
      address: state.address,
      passportNumber: state.passportNumber,
      nationalId: state.nationalId,
      nationality: state.nationality,
      country: state.country,
      totalServiceFee: split.totalServiceFee,
      sccgShare: split.sccgShare,
      partnerShare: split.partnerShare,
      depositAmount: split.depositAmount,
      marginPercentage: state.partnerMarginPercentage,
      paymentStatus,
      paymentMethod: state.paymentMethod,
      paymentReference: state.paymentReference,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toISOString(),
    });

    // Create services
    for (const svc of state.selectedServices) {
      await createCandidateService({
        candidateId: candidate.id,
        servicePricingId: svc.servicePricingId,
        serviceName: svc.serviceName,
        packageType: svc.packageType,
        basePrice: svc.basePrice,
        quantity: svc.quantity,
        totalPrice: svc.basePrice * svc.quantity,
        createdAt: new Date().toISOString(),
      });
    }

    // Auto-insert tasks for REGISTERED status
    await autoInsertCandidateTasks(candidate, user.id, createCandidateTask);

    // Fire webhook
    await triggerFlow("candidate-registered", {
      candidateId: candidate.id,
      sccgId,
      submissionId,
      fullName: state.fullName,
      partnerId,
      workflowCategory: state.workflowCategory,
    });

    revalidatePath("/partner/candidates");

    return { submissionId, candidateId: candidate.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Registration failed" };
  }
}

export async function advanceCandidateStatusAction(
  candidateId: string,
  nextStatus: string
): Promise<{ error: string } | undefined> {
  try {
    const user = await requirePermission("candidate.status.advance");
    const candidate = await getCandidateById(candidateId);
    if (!candidate) return { error: "Candidate not found" };

    if (
      !canTransitionTo(
        candidate.workflowCategory,
        candidate.currentStatus as string,
        nextStatus
      )
    ) {
      return {
        error: `Cannot transition from ${candidate.currentStatus} to ${nextStatus}`,
      };
    }

    await advanceCandidateStatus(candidateId, nextStatus as Candidate["currentStatus"]);

    const updated = { ...candidate, currentStatus: nextStatus as Candidate["currentStatus"] };
    await autoInsertCandidateTasks(updated, user.id, createCandidateTask);

    await triggerFlow("candidate-status-changed", {
      candidateId,
      from: candidate.currentStatus,
      to: nextStatus,
      workflowCategory: candidate.workflowCategory,
    });

    revalidatePath(`/partner/candidates/${candidateId}`);
    revalidatePath("/partner/candidates");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Status advance failed" };
  }
}

export async function rerunFinancialSplitAction(
  candidateId: string,
  newServices: {
    servicePricingId: string;
    serviceName: string;
    packageType: "all-inclusive" | "premium-bundle" | "add-on";
    basePrice: number;
    quantity: number;
  }[],
  partnerMarginPercentage: PartnerMargin
): Promise<{ error: string } | undefined> {
  try {
    await requirePermission("candidate.create");
    const { deleteCandidateServices } = await import("@/lib/sharepoint");

    const split = calculateFinancialSplit({
      services: newServices.map((s) => ({
        servicePricingId: s.servicePricingId,
        serviceName: s.serviceName,
        basePrice: s.basePrice,
        quantity: s.quantity,
      })),
      partnerMarginPercentage,
    });

    await deleteCandidateServices(candidateId);
    for (const svc of newServices) {
      await createCandidateService({
        candidateId,
        servicePricingId: svc.servicePricingId,
        serviceName: svc.serviceName,
        packageType: svc.packageType,
        basePrice: svc.basePrice,
        quantity: svc.quantity,
        totalPrice: svc.basePrice * svc.quantity,
        createdAt: new Date().toISOString(),
      });
    }

    await updateCandidate(candidateId, {
      totalServiceFee: split.totalServiceFee,
      sccgShare: split.sccgShare,
      partnerShare: split.partnerShare,
      depositAmount: split.depositAmount,
      marginPercentage: partnerMarginPercentage,
    });

    revalidatePath(`/partner/candidates/${candidateId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Recalculation failed" };
  }
}
