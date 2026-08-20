"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import { isAdminEquivalent } from "@/lib/admin-guard";
import {
  getCandidates,
  getCandidateById,
  getPartnerById,
  getPartnerByEmail,
  createCandidate,
  createCandidateService,
  createCandidateTask,
  updateCandidate,
  advanceCandidateStatus,
  getCandidateServices,
  updateCandidateServiceStatus,
  deleteCandidate,
} from "@/lib/sharepoint";
import { canTransitionTo, formatStatusLabel } from "@/lib/engine/candidate-workflow";
import { calculateFinancialSplit } from "@/lib/engine/financial-split";
import { autoInsertCandidateTasks } from "@/lib/engine/candidate-tasks";
import { generatePartnerCandidateId } from "@/lib/sccg-id";
import { triggerFlow } from "@/lib/powerautomate";
import { sendEmailViaGraph } from "@/lib/email";
import type { Candidate, CandidateService, WorkflowCategory, PartnerMargin, CandidatePaymentStatus } from "@/types";
import crypto from "crypto";

export async function deleteCandidateAction(
  candidateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requirePermission("candidate.create");
    const candidate = await getCandidateById(candidateId);
    if (!candidate) return { success: false, error: "Candidate not found" };

    const roles = (user.roles || [user.role]) as string[];
    if (!isAdminEquivalent(roles)) {
      const partner = await getPartnerByEmail(user.email!);
      if (!partner || candidate.partnerId !== partner.id) {
        return { success: false, error: "Unauthorized" };
      }
    }

    await deleteCandidate(candidateId);

    revalidatePath("/partner/candidates");
    revalidatePath("/sccg/candidates");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete candidate" };
  }
}

export async function getPartnerCandidatesAction(): Promise<Candidate[]> {
  const user = await requirePermission("candidate.view.own");
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) return [];
  return getCandidates(partner.id);
}

export async function updateCandidateAction(
  candidateId: string,
  data: Partial<Candidate>
): Promise<{ success: boolean } | { error: string }> {
  try {
    const user = await requirePermission("candidate.create");
    const partner = await getPartnerByEmail(user.email!);
    if (!partner) return { error: "Partner not found" };

    const cand = await getCandidateById(candidateId);
    if (!cand || cand.partnerId !== partner.id) {
      return { error: "Candidate not found or unauthorized" };
    }

    await updateCandidate(candidateId, data);
    revalidatePath("/partner/candidates");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Update failed" };
  }
}

export async function searchCandidatesAction(
  query: string
): Promise<Candidate[]> {
  const user = await requirePermission("candidate.view.own");
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) return [];
  if (!query.trim()) return [];
  const all = await getCandidates(partner.id);
  const q = query.toLowerCase();
  return all
    .filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        (c.sccgId && c.sccgId.toLowerCase().includes(q)) ||
        c.email.toLowerCase().includes(q)
    )
    .slice(0, 10);
}

/**
 * Check for duplicate candidates across ALL partners (global check).
 * Returns matches by email, name+DOB combo, or passport/nationalId.
 * Does NOT reveal which partner owns the candidate.
 */
export async function checkDuplicateCandidateAction(data: {
  fullName: string;
  email: string;
  dateOfBirth: string;
  passportNumber?: string;
  nationalId?: string;
}): Promise<{
  hasDuplicates: boolean;
  matches: Array<{
    id: string;
    sccgId: string;
    fullName: string;
    matchReason: string;
    isOwnCandidate: boolean;
    workflowCategory: string;
  }>;
}> {
  const user = await requirePermission("candidate.view.own");
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) return { hasDuplicates: false, matches: [] };

  // Fetch ALL candidates globally (no partner filter)
  const allCandidates = await getCandidates();
  const matches: Array<{
    id: string;
    sccgId: string;
    fullName: string;
    matchReason: string;
    isOwnCandidate: boolean;
    workflowCategory: string;
  }> = [];

  const seen = new Set<string>();
  const emailLower = data.email.toLowerCase().trim();
  const nameLower = data.fullName.toLowerCase().trim();

  for (const c of allCandidates) {
    if (seen.has(c.id)) continue;
    const reasons: string[] = [];

    // Email match
    if (emailLower && c.email.toLowerCase().trim() === emailLower) {
      reasons.push("Same email address");
    }

    // Name + DOB match
    if (
      nameLower &&
      data.dateOfBirth &&
      c.fullName.toLowerCase().trim() === nameLower &&
      c.dateOfBirth === data.dateOfBirth
    ) {
      reasons.push("Same name and date of birth");
    }

    // Passport match
    if (
      data.passportNumber &&
      c.passportNumber &&
      c.passportNumber.toLowerCase() === data.passportNumber.toLowerCase()
    ) {
      reasons.push("Same passport number");
    }

    // National ID match
    if (
      data.nationalId &&
      c.nationalId &&
      c.nationalId.toLowerCase() === data.nationalId.toLowerCase()
    ) {
      reasons.push("Same national ID");
    }

    if (reasons.length > 0) {
      seen.add(c.id);
      matches.push({
        id: c.id,
        sccgId: c.sccgId,
        fullName: c.fullName,
        matchReason: reasons.join("; "),
        isOwnCandidate: c.partnerId === partner.id,
        workflowCategory: c.workflowCategory,
      });
    }
  }

  return { hasDuplicates: matches.length > 0, matches };
}

/**
 * Check for institutional duplicate — checks if an institution name
 * already exists as a candidate across all partners globally.
 * Returns sanitized result (no partner info revealed).
 */
export async function checkInstitutionalDuplicateAction(
  institutionName: string
): Promise<{
  isDuplicate: boolean;
  message?: string;
}> {
  const user = await requirePermission("candidate.view.own");
  if (!institutionName.trim()) return { isDuplicate: false };

  const allCandidates = await getCandidates();
  const nameLower = institutionName.toLowerCase().trim();

  const match = allCandidates.find(
    (c) => c.fullName.toLowerCase().trim() === nameLower
  );

  if (match) {
    const partner = await getPartnerByEmail(user.email!);
    if (match.partnerId === partner?.id) {
      return {
        isDuplicate: true,
        message: `"${match.fullName}" is already registered under your account (${match.sccgId}).`,
      };
    }
    return {
      isDuplicate: true,
      message: `"${match.fullName}" is already a valued member of Global SCCG. Please contact support if you need assistance.`,
    };
  }

  return { isDuplicate: false };
}

/**
 * Get candidate services with transaction/payment details for a candidate.
 */
export async function getCandidateOrdersAction(candidateId: string): Promise<{
  services: CandidateService[];
  candidate: Candidate | null;
}> {
  const user = await requirePermission("candidate.view.own");
  const partner = await getPartnerByEmail(user.email!);
  if (!partner) return { services: [], candidate: null };

  const candidate = await getCandidateById(candidateId);
  if (!candidate) return { services: [], candidate: null };

  // Partner isolation
  const roles = (user.roles || [user.role]) as string[];
  if (!isAdminEquivalent(roles) && candidate.partnerId !== partner.id) {
    return { services: [], candidate: null };
  }

  const services = await getCandidateServices(candidateId);
  return { services, candidate };
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
    initialPaymentAmount?: number;
  }[];
  partnerMarginPercentage: PartnerMargin;
  paymentOption: "pay-now" | "pay-later";
  paymentMethod?: string;
  paymentReference?: string;
}

export async function finalizeRegistrationAction(
  state: WizardCandidateInput
): Promise<{ candidateId: string; submissionId: string } | { error: string }> {
  try {
    const user = await requirePermission("candidate.create");
    const roles = (user.roles || [user.role]) as string[];
    const isPrivileged = isAdminEquivalent(roles);
    let partner = null;
    let partnerId: string;

    if (isPrivileged) {
      partnerId = state.partnerId;
      if (partnerId !== "SCCG-DIRECT") {
        partner = await getPartnerById(partnerId);
        if (!partner || partner.status !== "active") {
          return { error: "Selected partner is not active or does not exist" };
        }
      }
    } else {
      partner = await getPartnerByEmail(user.email!);
      if (!partner || partner.status !== "active") {
        return { error: "Active partner account not found" };
      }
      partnerId = partner.id;
    }

    const isDirectSale = partnerId === "SCCG-DIRECT";
    const partnerCode = isDirectSale ? "SCCG" : (partner?.partnerCode || "PART");
    const marginPercentage = isPrivileged
      ? state.partnerMarginPercentage
      : (partner?.marginPercentage || state.partnerMarginPercentage);

    const split = calculateFinancialSplit({
      services: state.selectedServices.map((s) => ({
        servicePricingId: s.servicePricingId,
        serviceName: s.serviceName,
        basePrice: s.basePrice,
        quantity: s.quantity,
        initialPaymentAmount: s.initialPaymentAmount,
      })),
      partnerMarginPercentage: marginPercentage,
    });

    const sccgId = await generatePartnerCandidateId(partnerCode, state.workflowCategory);
    const submissionId = crypto.randomUUID();

    const paymentStatus: CandidatePaymentStatus =
      state.paymentOption === "pay-now" ? "deposit-paid" : "pending";

    const candidate = await createCandidate({
      sccgId,
      submissionId,
      partnerId,
      partnerName: isDirectSale ? "SCCG Direct" : (partner?.company || partner?.name),
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
      marginPercentage,
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
        workflowCategory: (svc as { workflowCategory?: string }).workflowCategory as WorkflowCategory || state.workflowCategory,
        basePrice: svc.basePrice,
        quantity: svc.quantity,
        totalPrice: svc.basePrice * svc.quantity,
        createdAt: new Date().toISOString(),
      });
    }

    // Auto-insert tasks for REGISTERED status
    await autoInsertCandidateTasks(candidate, user.id, createCandidateTask);

    // Auto-create user account for candidate (deduplication by email)
    let tempPassword: string | undefined;
    try {
      if (state.email) {
        const { ensureCandidateUserAccount } = await import("@/lib/candidate-user");
        const partnerDisplayName = isDirectSale ? "SCCG Career Lab Germany" : (partner?.company || partner?.name || "SCCG Partner");
        const accountResult = await ensureCandidateUserAccount({
          email: state.email,
          fullName: state.fullName,
          phone: state.phone,
          partnerId,
          partnerName: partnerDisplayName,
          sccgId,
        });
        if (accountResult.tempPassword) {
          tempPassword = accountResult.tempPassword;
        }
      }
    } catch {
      // User account creation is non-blocking
    }

    // Send welcome email with portal login credentials to candidate
    try {
      if (state.email) {
        const { sendEmailViaGraph, buildCandidateLoginEmail } = await import("@/lib/email");
        const partnerDisplayName = isDirectSale ? "SCCG Career Lab Germany" : (partner?.company || partner?.name || "SCCG Partner");
        const rawPortalUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
        const portalUrl =
          rawPortalUrl && !rawPortalUrl.includes("localhost") && !rawPortalUrl.includes("127.0.0.1")
            ? rawPortalUrl.replace(/\/$/, "")
            : "https://portal.mysccg.de";
        const emailData = buildCandidateLoginEmail({
          candidateName: state.fullName,
          sccgId,
          email: state.email,
          tempPassword,
          partnerName: partnerDisplayName,
          workflowCategory: state.workflowCategory,
          loginUrl: `${portalUrl}/login`,
          totalServiceFee: split.totalServiceFee,
        });
        await sendEmailViaGraph({
          to: state.email,
          toName: state.fullName,
          subject: emailData.subject,
          htmlBody: emailData.htmlBody,
          cc: [{ email: "info@mysccg.de", name: "SCCG" }],
          bcc: [{ email: "admin@mysccg.de" }, { email: "portal@mysccg.de" }],
        });
      }
    } catch {
      // Email sending is non-blocking — don't fail registration
    }

    // Fire webhook
    await triggerFlow("candidate-registered", {
      candidateId: candidate.id,
      sccgId,
      fullName: state.fullName,
      partnerId,
      workflowCategory: state.workflowCategory,
    });

    revalidatePath("/partner/candidates");
    revalidatePath("/admin/candidates");

    return { candidateId: candidate.id, submissionId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Registration failed" };
  }
}

export async function advanceCandidateStatusAction(
  candidateId: string,
  nextStatus: string,
  comment?: string
): Promise<{ error: string } | undefined> {
  try {
    const user = await requirePermission("candidate.status.advance");
    const candidate = await getCandidateById(candidateId);
    if (!candidate) return { error: "Candidate not found" };

    // Partner ownership check (admins bypass)
    const roles = (user.roles || [user.role]) as string[];
    if (!isAdminEquivalent(roles)) {
      const partner = await getPartnerByEmail(user.email!);
      if (!partner || candidate.partnerId !== partner.id) {
        return { error: "Unauthorized: candidate belongs to another partner" };
      }
    }

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

    // Payment gate: cannot complete final steps without full payment
    const completionStatuses = ["COMPLETED", "TRAINING_FINISHED", "VISA_GRANTED", "CARD_ISSUED"];
    if (completionStatuses.includes(nextStatus) && !candidate.serviceUnlocked) {
      if (candidate.paymentStatus !== "fully-paid") {
        return {
          error: "Cannot complete this step: full payment is required. Current payment status: " +
            (candidate.paymentStatus || "pending"),
        };
      }
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

    // Send email notifications to candidate and partner
    const fromLabel = formatStatusLabel(candidate.currentStatus as string);
    const toLabel = formatStatusLabel(nextStatus);
    const statusEmailHtml = buildStatusChangeEmailHtml({
      candidateName: candidate.fullName,
      sccgId: candidate.sccgId,
      workflowCategory: candidate.workflowCategory,
      fromStatus: fromLabel,
      toStatus: toLabel,
      comment,
    });

    // Email to candidate
    if (candidate.email) {
      sendEmailViaGraph({
        to: candidate.email,
        toName: candidate.fullName,
        subject: `SCCG — Status Update: ${toLabel}`,
        htmlBody: statusEmailHtml,
        cc: [{ email: "info@mysccg.de", name: "SCCG" }],
        bcc: [{ email: "admin@mysccg.de" }, { email: "portal@mysccg.de" }],
      }).catch(() => {/* best-effort */});
    }

    // Email to the acting user (partner/admin/staff)
    if (user.email) {
      sendEmailViaGraph({
        to: user.email,
        toName: user.name || user.email,
        subject: `SCCG — Candidate ${candidate.fullName} moved to: ${toLabel}`,
        htmlBody: statusEmailHtml,
      }).catch(() => {/* best-effort */});
    }

    // Always notify the candidate's owning partner (e.g. when admin/staff advances the status)
    if (candidate.partnerId) {
      try {
        const owningPartner = await getPartnerById(candidate.partnerId);
        if (owningPartner?.email && owningPartner.email !== user.email) {
          sendEmailViaGraph({
            to: owningPartner.email,
            toName: owningPartner.name || owningPartner.email,
            subject: `SCCG — Candidate ${candidate.fullName} moved to: ${toLabel}`,
            htmlBody: statusEmailHtml,
          }).catch(() => {/* best-effort */});
        }
      } catch {/* best-effort */}
    }

    revalidatePath(`/partner/candidates/${candidateId}`);
    revalidatePath("/partner/candidates");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Status advance failed" };
  }
}

/**
 * Advance the status of an individual candidate service (per-service workflow).
 */
export async function advanceServiceStatusAction(
  serviceId: string,
  candidateId: string,
  workflowCategory: string,
  currentStatus: string,
  nextStatus: string,
  comment?: string
): Promise<{ error: string } | undefined> {
  try {
    const user = await requirePermission("candidate.status.advance");
    const candidate = await getCandidateById(candidateId);
    if (!candidate) return { error: "Candidate not found" };

    // Partner ownership check (admins bypass)
    const roles = (user.roles || [user.role]) as string[];
    if (!isAdminEquivalent(roles)) {
      const partner = await getPartnerByEmail(user.email!);
      if (!partner || candidate.partnerId !== partner.id) {
        return { error: "Unauthorized: candidate belongs to another partner" };
      }
    }

    if (!canTransitionTo(workflowCategory as WorkflowCategory, currentStatus, nextStatus)) {
      return { error: `Cannot transition from ${currentStatus} to ${nextStatus}` };
    }

    await updateCandidateServiceStatus(serviceId, nextStatus);

    // Send email notifications
    const fromLabel = formatStatusLabel(currentStatus);
    const toLabel = formatStatusLabel(nextStatus);
    const statusEmailHtml = buildStatusChangeEmailHtml({
      candidateName: candidate.fullName,
      sccgId: candidate.sccgId,
      workflowCategory: workflowCategory as WorkflowCategory,
      fromStatus: fromLabel,
      toStatus: toLabel,
      comment,
    });

    if (candidate.email) {
      sendEmailViaGraph({
        to: candidate.email,
        toName: candidate.fullName,
        subject: `SCCG — Service Status Update: ${toLabel}`,
        htmlBody: statusEmailHtml,
        cc: [{ email: "info@mysccg.de", name: "SCCG" }],
        bcc: [{ email: "admin@mysccg.de" }, { email: "faria@mysccg.de" }, { email: "portal@mysccg.de" }],
      }).catch(() => {/* best-effort */});
    }

    // Email to the acting user (partner/admin/staff)
    if (user.email) {
      sendEmailViaGraph({
        to: user.email,
        toName: user.name || user.email,
        subject: `SCCG — Candidate ${candidate.fullName} service moved to: ${toLabel}`,
        htmlBody: statusEmailHtml,
      }).catch(() => {/* best-effort */});
    }

    // Always notify the candidate's owning partner
    if (candidate.partnerId) {
      try {
        const owningPartner = await getPartnerById(candidate.partnerId);
        if (owningPartner?.email && owningPartner.email !== user.email) {
          sendEmailViaGraph({
            to: owningPartner.email,
            toName: owningPartner.name || owningPartner.email,
            subject: `SCCG — Candidate ${candidate.fullName} service moved to: ${toLabel}`,
            htmlBody: statusEmailHtml,
          }).catch(() => {/* best-effort */});
        }
      } catch {/* best-effort */}
    }

    revalidatePath(`/partner/candidates/${candidateId}`);
    revalidatePath("/partner/candidates");
    revalidatePath(`/admin/candidates/${candidateId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Service status advance failed" };
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
    const user = await requirePermission("candidate.create");
    const candidate = await getCandidateById(candidateId);
    if (!candidate) return { error: "Candidate not found" };

    const roles = (user.roles || [user.role]) as string[];
    let effectiveMargin = partnerMarginPercentage;
    if (!isAdminEquivalent(roles)) {
      const partner = await getPartnerByEmail(user.email!);
      if (!partner || partner.status !== "active" || candidate.partnerId !== partner.id) {
        return { error: "Unauthorized: candidate belongs to another partner" };
      }
      effectiveMargin = partner.marginPercentage || partnerMarginPercentage;
    }

    const { deleteCandidateServices } = await import("@/lib/sharepoint");

    const split = calculateFinancialSplit({
      services: newServices.map((s) => ({
        servicePricingId: s.servicePricingId,
        serviceName: s.serviceName,
        basePrice: s.basePrice,
        quantity: s.quantity,
      })),
      partnerMarginPercentage: effectiveMargin,
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
      marginPercentage: effectiveMargin,
    });

    revalidatePath(`/partner/candidates/${candidateId}`);
    revalidatePath(`/sccg/candidates/${candidateId}`);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Recalculation failed" };
  }
}

export async function buyAdditionalServicesAction(
  candidateId: string,
  services: {
    servicePricingId: string;
    serviceName: string;
    packageType: "all-inclusive" | "premium-bundle" | "add-on";
    basePrice: number;
    quantity: number;
  }[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requirePermission("candidate.create");
    const roles = (user.roles || [user.role]) as string[];
    
    const candidate = await getCandidateById(candidateId);
    if (!candidate) {
      return { success: false, error: "Candidate not found" };
    }

    let partner = null;
    const partnerId = candidate.partnerId;
    const isDirectSale = partnerId === "SCCG-DIRECT";

    if (!isAdminEquivalent(roles)) {
      const currentPartner = await getPartnerByEmail(user.email!);
      if (!currentPartner || candidate.partnerId !== currentPartner.id) {
        return { success: false, error: "Candidate not found or unauthorized" };
      }
      partner = currentPartner;
    } else {
      if (!isDirectSale) {
        partner = await getPartnerById(partnerId);
        if (!partner) return { success: false, error: "Candidate's partner not found" };
      }
    }

    // Get existing services
    const existingServices = await getCandidateServices(candidateId);

    // Create the new candidate service records
    for (const svc of services) {
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

    // Calculate financial split strictly for the NEW services using the PARTNER's current margin
    const margin = isDirectSale ? 0 : (partner?.marginPercentage || 15);
    const split = calculateFinancialSplit({
      services: services.map((s) => ({
        servicePricingId: s.servicePricingId,
        serviceName: s.serviceName,
        basePrice: s.basePrice,
        quantity: s.quantity,
      })),
      partnerMarginPercentage: margin as any,
    });

    // Update candidate details by adding the new splits to the existing totals
    await updateCandidate(candidateId, {
      totalServiceFee: (candidate.totalServiceFee || 0) + split.totalServiceFee,
      sccgShare: (candidate.sccgShare || 0) + split.sccgShare,
      partnerShare: (candidate.partnerShare || 0) + split.partnerShare,
      depositAmount: (candidate.depositAmount || 0) + split.depositAmount,
    });

    // Create a new Sales Order
    const { createSalesOrder, createSalesOrderItem } = await import("@/lib/sharepoint");
    const timestamp = Date.now().toString().slice(-6);
    const orderNumber = `SO-${candidate.sccgId || candidate.id}-${timestamp}`;

    // Total sales amount for the newly bought services (basePrice * quantity)
    // The price is inclusive of partner commission, so we do NOT add the margin on top.
    const newlyBoughtTotal = services.reduce((acc, s) => {
      return acc + (s.basePrice * s.quantity);
    }, 0);

    const salesOrder = await createSalesOrder({
      orderNumber,
      salesOfferId: "direct",
      offerNumber: "direct",
      partnerId: isDirectSale ? "SCCG-DIRECT" : partner!.id,
      partnerName: isDirectSale ? "SCCG Direct" : partner!.name,
      clientId: candidate.sccgId || candidate.id,
      clientName: candidate.fullName,
      clientEmail: candidate.email,
      status: "pending",
      totalAmount: newlyBoughtTotal,
      notes: `Additional services purchased for candidate ${candidate.fullName} (${candidate.sccgId})`,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create Sales Order Items
    for (const svc of services) {
      await createSalesOrderItem({
        salesOrderId: salesOrder.id,
        productId: svc.servicePricingId,
        productName: svc.serviceName,
        quantity: svc.quantity,
        unitPrice: svc.basePrice,
        totalPrice: svc.basePrice * svc.quantity,
      });
    }

    // Send confirmation email to client if they are buying directly from SCCG
    if (isDirectSale && candidate.email) {
      const { sendEmailViaGraph } = await import("@/lib/email");
      const serviceListHtml = services.map(s => `<li>${s.quantity}x <strong>${s.serviceName}</strong> — €${(s.basePrice * s.quantity).toFixed(2)}</li>`).join("");
      const htmlBody = `
        <div style="font-family: sans-serif; color: #333;">
          <h2 style="color: #0F4C81;">Order Confirmation</h2>
          <p>Dear ${candidate.fullName},</p>
          <p>Thank you for your purchase. We have successfully processed your order for the following services:</p>
          <ul>${serviceListHtml}</ul>
          <p><strong>Total Amount:</strong> €${newlyBoughtTotal.toFixed(2)}</p>
          <p>Your order number is <strong>${orderNumber}</strong>.</p>
          <p>If you have any questions, please contact our support team.</p>
          <br/>
          <p>Best regards,<br/>SCCG Team</p>
        </div>
      `;

      await sendEmailViaGraph({
        to: candidate.email,
        toName: candidate.fullName,
        subject: `SCCG — Order Confirmation ${orderNumber}`,
        htmlBody,
        cc: [{ email: "info@mysccg.de", name: "SCCG" }]
      }).catch(console.error); // Best effort email sending
    }

    revalidatePath(`/partner/candidates/${candidateId}`);
    revalidatePath("/partner/finance");

    return { success: true, orderId: salesOrder.id };
  } catch (err: any) {
    console.error("buyAdditionalServicesAction error:", err);
    return { success: false, error: err.message || "Failed to buy services" };
  }
}

export async function getCandidateDocumentsAction(
  candidateId: string,
  candidateName: string
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  try {
    await requirePermission("candidate.view.own");
    const { listCandidateDocuments } = await import("@/lib/candidate-documents");
    const items = await listCandidateDocuments(candidateId, candidateName);
    return { success: true, data: items };
  } catch (err: any) {
    console.error("getCandidateDocumentsAction error:", err);
    return { success: false, error: err.message || "Failed to load documents" };
  }
}

export async function setCandidateSpecialApprovalAction(
  candidateId: string,
  unlocked: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requirePermission("candidate.create");
    const roles = (user.roles || [user.role]) as string[];
    if (!isAdminEquivalent(roles)) {
      return { success: false, error: "Only admin/staff can grant Special Approval" };
    }
    const candidate = await getCandidateById(candidateId);
    if (!candidate) return { success: false, error: "Candidate not found" };

    await updateCandidate(candidateId, { serviceUnlocked: unlocked });

    try {
      const { writeAuditLog } = await import("@/lib/audit-log");
      await writeAuditLog({
        action: unlocked ? "candidate.special_approval.grant" : "candidate.special_approval.revoke",
        actorId: user.id,
        actorEmail: user.email || "",
        targetId: candidateId,
        targetType: "candidate",
        after: { serviceUnlocked: unlocked, sccgId: candidate.sccgId },
      });
    } catch {/* audit is best-effort */}

    revalidatePath(`/partner/candidates/${candidateId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update approval" };
  }
}

export async function deleteCandidateDocumentAction(
  candidateId: string,
  candidateName: string,
  driveItemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requirePermission("candidate.create");
    const { getGraphClient, resolveSiteId } = await import("@/lib/graph");
    const client = await getGraphClient();
    const siteId = await resolveSiteId();

    const url = `/sites/${siteId}/drive/items/${driveItemId}`;
    await client.api(url).delete();

    revalidatePath(`/partner/candidates/${candidateId}`);

    return { success: true };
  } catch (err: any) {
    console.error("deleteCandidateDocumentAction error:", err);
    return { success: false, error: err.message || "Failed to delete document" };
  }
}

export async function updateCandidateFinanceAction(
  candidateId: string,
  financialData: {
    totalServiceFee?: number;
    depositAmount?: number;
    partnerShare?: number;
    sccgShare?: number;
    dueDate?: string;
    payoutStatus?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requirePermission("candidate.create");
    const partner = await getPartnerByEmail(user.email!);
    if (!partner) return { success: false, error: "Partner not found" };

    const candidate = await getCandidateById(candidateId);
    if (!candidate || candidate.partnerId !== partner.id) {
      return { success: false, error: "Candidate not found or unauthorized" };
    }

    const updates: Partial<Candidate> = {};
    if (financialData.totalServiceFee !== undefined) {
      updates.totalServiceFee = financialData.totalServiceFee;
    }
    if (financialData.depositAmount !== undefined) {
      updates.depositAmount = financialData.depositAmount;
    }
    if (financialData.partnerShare !== undefined) {
      updates.partnerShare = financialData.partnerShare;
    }
    if (financialData.sccgShare !== undefined) {
      updates.sccgShare = financialData.sccgShare;
    }

    const total = financialData.totalServiceFee !== undefined ? financialData.totalServiceFee : candidate.totalServiceFee;
    const deposit = financialData.depositAmount !== undefined ? financialData.depositAmount : candidate.depositAmount;

    if (deposit >= total && total > 0) {
      updates.paymentStatus = "fully-paid";
    } else if (deposit > 0) {
      updates.paymentStatus = "deposit-paid";
    } else {
      updates.paymentStatus = "pending";
    }

    // Load existing notes to safely append/update due date & payout status
    let notesObj: Record<string, any> = {};
    try {
      if (candidate.notes && candidate.notes.trim().startsWith("{")) {
        notesObj = JSON.parse(candidate.notes);
      } else {
        notesObj = { customNotes: candidate.notes || "" };
      }
    } catch {
      notesObj = { customNotes: candidate.notes || "" };
    }

    if (financialData.dueDate !== undefined) {
      notesObj.dueDate = financialData.dueDate;
    }
    if (financialData.payoutStatus !== undefined) {
      notesObj.payoutStatus = financialData.payoutStatus;
    }

    updates.notes = JSON.stringify(notesObj);

    await updateCandidate(candidateId, updates);

    revalidatePath(`/partner/candidates/${candidateId}`);
    revalidatePath("/partner/finance");

    return { success: true };
  } catch (err: any) {
    console.error("updateCandidateFinanceAction error:", err);
    return { success: false, error: err.message || "Failed to update financial ledger" };
  }
}

/**
 * Add a new service order to an EXISTING candidate (no duplicate candidate creation).
 * This is the "Register a Service" flow for existing candidates.
 */
export async function addServiceOrderAction(
  candidateId: string,
  input: {
    workflowCategory: WorkflowCategory;
    selectedServices: {
      servicePricingId: string;
      serviceName: string;
      packageType: "all-inclusive" | "premium-bundle" | "add-on";
      basePrice: number;
      quantity: number;
      initialPaymentAmount?: number;
      workflowCategory?: string;
    }[];
    partnerMarginPercentage: PartnerMargin;
    paymentOption: "pay-now" | "pay-later";
    paymentMethod?: string;
    paymentReference?: string;
    personalInfoUpdates?: Partial<{
      fullName: string;
      email: string;
      phone: string;
      address: string;
      nationality: string;
      country: string;
      passportNumber: string;
      nationalId: string;
    }>;
  }
): Promise<{ candidateId: string; submissionId: string } | { error: string }> {
  try {
    const user = await requirePermission("candidate.create");
    const partner = await getPartnerByEmail(user.email!);
    if (!partner) return { error: "Partner not found" };

    const candidate = await getCandidateById(candidateId);
    if (!candidate) return { error: "Candidate not found" };

    const roles = (user.roles || [user.role]) as string[];
    if (!isAdminEquivalent(roles) && candidate.partnerId !== partner.id) {
      return { error: "Unauthorized" };
    }

    // Optionally update personal info if changed
    if (input.personalInfoUpdates && Object.keys(input.personalInfoUpdates).length > 0) {
      await updateCandidate(candidateId, input.personalInfoUpdates);
    }

    const split = calculateFinancialSplit({
      services: input.selectedServices.map((s) => ({
        servicePricingId: s.servicePricingId,
        serviceName: s.serviceName,
        basePrice: s.basePrice,
        quantity: s.quantity,
        initialPaymentAmount: s.initialPaymentAmount,
      })),
      partnerMarginPercentage: input.partnerMarginPercentage,
    });

    const submissionId = crypto.randomUUID();

    // Create new service records with workflowCategory
    for (const svc of input.selectedServices) {
      await createCandidateService({
        candidateId,
        servicePricingId: svc.servicePricingId,
        serviceName: svc.serviceName,
        packageType: svc.packageType,
        workflowCategory: (svc.workflowCategory as WorkflowCategory) || input.workflowCategory,
        basePrice: svc.basePrice,
        quantity: svc.quantity,
        totalPrice: svc.basePrice * svc.quantity,
        createdAt: new Date().toISOString(),
      });
    }

    // Update candidate totals (add new amounts to existing)
    await updateCandidate(candidateId, {
      totalServiceFee: (candidate.totalServiceFee || 0) + split.totalServiceFee,
      sccgShare: (candidate.sccgShare || 0) + split.sccgShare,
      partnerShare: (candidate.partnerShare || 0) + split.partnerShare,
      depositAmount: (candidate.depositAmount || 0) + split.depositAmount,
    });

    // Fire webhook
    await triggerFlow("candidate-service-added", {
      candidateId,
      sccgId: candidate.sccgId,
      fullName: candidate.fullName,
      partnerId: partner.id,
      workflowCategory: input.workflowCategory,
      newServicesCount: input.selectedServices.length,
    });

    // Notify the candidate by email that new service(s) were added
    try {
      const candidateEmail = input.personalInfoUpdates?.email || candidate.email;
      if (candidateEmail) {
        const { sendEmailViaGraph, buildServiceAddedEmail } = await import("@/lib/email");
        const rawPortalUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
        const portalUrl =
          rawPortalUrl && !rawPortalUrl.includes("localhost") && !rawPortalUrl.includes("127.0.0.1")
            ? rawPortalUrl.replace(/\/$/, "")
            : "https://portal.mysccg.de";
        const partnerDisplayName = partner.company || partner.name || "SCCG Partner";
        const emailData = buildServiceAddedEmail({
          candidateName: input.personalInfoUpdates?.fullName || candidate.fullName,
          sccgId: candidate.sccgId,
          partnerName: partnerDisplayName,
          services: input.selectedServices.map((s) => ({
            serviceName: s.serviceName,
            quantity: s.quantity,
            totalPrice: s.basePrice * s.quantity,
          })),
          addedAmount: split.totalServiceFee,
          newTotal: (candidate.totalServiceFee || 0) + split.totalServiceFee,
          loginUrl: `${portalUrl}/login`,
        });
        await sendEmailViaGraph({
          to: candidateEmail,
          toName: input.personalInfoUpdates?.fullName || candidate.fullName,
          subject: emailData.subject,
          htmlBody: emailData.htmlBody,
        });
      }
    } catch {
      // Email sending is non-blocking — don't fail the service order
    }

    revalidatePath(`/partner/candidates/${candidateId}`);
    revalidatePath("/partner/candidates");

    return { candidateId, submissionId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to add service order" };
  }
}

// ── Email Template for Status Change ──

function buildStatusChangeEmailHtml(data: {
  candidateName: string;
  sccgId: string;
  workflowCategory: string;
  fromStatus: string;
  toStatus: string;
  comment?: string;
}): string {
  const commentBlock = data.comment
    ? `<div style="margin: 20px 0; padding: 16px; background: #f8fafc; border-left: 4px solid #2563eb; border-radius: 0 8px 8px 0;">
        <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #2563eb; text-transform: uppercase; letter-spacing: 0.05em;">Notes from your advisor</p>
        <p style="margin: 0; color: #334155; font-style: italic;">&ldquo;${data.comment}&rdquo;</p>
      </div>`
    : "";
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #0a1628, #1a2a4a); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Workflow Status Update</h1>
        <p style="color: #94a3b8; margin: 8px 0 0;">SCCG Partner Portal</p>
      </div>
      <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p>Dear <strong>${data.candidateName}</strong>,</p>
        <p>Your application status has been updated:</p>
        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #64748b;">Candidate ID</td><td style="padding: 8px 0; font-weight: bold;">${data.sccgId}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Workflow</td><td style="padding: 8px 0;">${data.workflowCategory}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">Previous Status</td><td style="padding: 8px 0;">${data.fromStatus}</td></tr>
          <tr><td style="padding: 8px 0; color: #64748b;">New Status</td><td style="padding: 8px 0; font-weight: bold; color: #2563eb;">${data.toStatus}</td></tr>
        </table>
        ${commentBlock}
        <div style="text-align: center; margin: 24px 0;">
          <a href="https://portal.mysccg.de/login" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">Open SCCG Portal →</a>
          <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Direct link: <a href="https://portal.mysccg.de/login" style="color: #2563eb;">https://portal.mysccg.de/login</a></p>
        </div>
        <p>If you have any questions, please contact your partner or reach us at <a href="mailto:info@mysccg.de">info@mysccg.de</a>.</p>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— SCCG Portal Team</p>
      </div>
    </div>
  `;
}

/**
 * Record a payment received for a candidate.
 * Stores payment history in the candidate's notes JSON and updates paymentStatus.
 * The depositAmount field on the candidate remains as the REQUIRED deposit (unchanged).
 * The "paid so far" amount is stored in notes.paidAmountEur.
 */
export async function recordPaymentAction(data: {
  candidateId: string;
  serviceId?: string;
  amountEur: number;
  isInitialPayment: boolean;
  paymentMethod?: string;
  paymentNote?: string;
}): Promise<
  | { newPaidAmount: number; newPaymentStatus: CandidatePaymentStatus }
  | { error: string }
> {
  try {
    const user = await requirePermission("candidate.create");
    const candidate = await getCandidateById(data.candidateId);
    if (!candidate) return { error: "Candidate not found" };

    const roles = (user.roles || [user.role]) as string[];
    if (!isAdminEquivalent(roles)) {
      const partner = await getPartnerByEmail(user.email!);
      if (!partner || candidate.partnerId !== partner.id) {
        return { error: "Unauthorized" };
      }
    }

    if (data.amountEur <= 0) return { error: "Amount must be greater than 0" };

    // Parse existing notes to get payment history
    let notesObj: Record<string, unknown> = {};
    try {
      if (candidate.notes?.trim().startsWith("{")) {
        notesObj = JSON.parse(candidate.notes);
      } else {
        notesObj = { customNotes: candidate.notes || "" };
      }
    } catch {
      notesObj = { customNotes: candidate.notes || "" };
    }

    const existingPaid = (notesObj.paidAmountEur as number) || 0;
    const newPaidAmount = Math.round((existingPaid + data.amountEur) * 100) / 100;

    const payments = (notesObj.payments as Array<unknown>) || [];
    payments.push({
      amount: data.amountEur,
      date: new Date().toISOString(),
      method: data.paymentMethod || "Bank Transfer",
      note: data.paymentNote || (data.isInitialPayment ? "Initial payment" : "Payment"),
      recordedBy: user.email || user.id,
      serviceId: data.serviceId,
    });

    notesObj.paidAmountEur = newPaidAmount;
    notesObj.payments = payments;

    // Determine payment status based on cumulative paid vs thresholds
    let newPaymentStatus: CandidatePaymentStatus;
    if (newPaidAmount >= candidate.totalServiceFee) {
      newPaymentStatus = "fully-paid";
    } else if (newPaidAmount >= candidate.depositAmount) {
      newPaymentStatus = "deposit-paid";
    } else if (newPaidAmount > 0) {
      // Any payment recorded unlocks the workflow (deposit-paid semantics)
      newPaymentStatus = "deposit-paid";
    } else {
      newPaymentStatus = "pending";
    }

    await updateCandidate(data.candidateId, {
      paymentStatus: newPaymentStatus,
      notes: JSON.stringify(notesObj),
    });

    revalidatePath(`/partner/candidates/${data.candidateId}`);
    revalidatePath("/partner/candidates");

    return { newPaidAmount, newPaymentStatus };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Payment recording failed" };
  }
}
