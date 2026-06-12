"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import {
  getCandidates,
  getCandidateById,
  getPartnerByEmail,
  createCandidate,
  createCandidateService,
  createCandidateTask,
  updateCandidate,
  advanceCandidateStatus,
  getCandidateServices,
  updateCandidateServiceStatus,
} from "@/lib/sharepoint";
import { canTransitionTo, formatStatusLabel } from "@/lib/engine/candidate-workflow";
import { calculateFinancialSplit } from "@/lib/engine/financial-split";
import { autoInsertCandidateTasks } from "@/lib/engine/candidate-tasks";
import { generatePartnerCandidateId } from "@/lib/sccg-id";
import { triggerFlow } from "@/lib/powerautomate";
import { sendEmailViaGraph } from "@/lib/email";
import type { Candidate, CandidateService, WorkflowCategory, PartnerMargin, CandidatePaymentStatus } from "@/types";
import crypto from "crypto";

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
  if (!roles.includes("admin") && candidate.partnerId !== partner.id) {
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
  state: WizardCandidateInput,
  partnerId: string
): Promise<{ candidateId: string; submissionId: string } | { error: string }> {
  try {
    const user = await requirePermission("candidate.create");
    const isDirectSale = partnerId === "SCCG-DIRECT";
    const partner = isDirectSale ? null : await getPartnerByEmail(user.email!);
    const partnerCode = isDirectSale ? "SCCG" : (partner?.partnerCode || "PART");

    const split = calculateFinancialSplit({
      services: state.selectedServices.map((s) => ({
        servicePricingId: s.servicePricingId,
        serviceName: s.serviceName,
        basePrice: s.basePrice,
        quantity: s.quantity,
        initialPaymentAmount: s.initialPaymentAmount,
      })),
      partnerMarginPercentage: state.partnerMarginPercentage,
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
        const portalUrl = process.env.NEXTAUTH_URL || "https://portal.mysccg.de";
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
    if (!roles.includes("admin")) {
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
    if (completionStatuses.includes(nextStatus)) {
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
      }).catch(() => {/* best-effort */});
    }

    // Email to partner
    if (user.email) {
      sendEmailViaGraph({
        to: user.email,
        toName: user.name || user.email,
        subject: `SCCG — Candidate ${candidate.fullName} moved to: ${toLabel}`,
        htmlBody: statusEmailHtml,
      }).catch(() => {/* best-effort */});
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
    if (!roles.includes("admin")) {
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
      }).catch(() => {/* best-effort */});
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
    const partner = await getPartnerByEmail(user.email!);
    if (!partner) return { success: false, error: "Partner not found" };

    const candidate = await getCandidateById(candidateId);
    if (!candidate || candidate.partnerId !== partner.id) {
      return { success: false, error: "Candidate not found or unauthorized" };
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
    const split = calculateFinancialSplit({
      services: services.map((s) => ({
        servicePricingId: s.servicePricingId,
        serviceName: s.serviceName,
        basePrice: s.basePrice,
        quantity: s.quantity,
      })),
      partnerMarginPercentage: partner.marginPercentage as any || 15,
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
      partnerId: partner.id,
      partnerName: partner.name,
      clientId: candidate.sccgId || candidate.id,
      clientName: candidate.fullName,
      clientEmail: candidate.email,
      status: "completed",
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

    revalidatePath(`/partner/candidates/${candidateId}`);
    revalidatePath("/partner/finance");

    return { success: true };
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
    const { getGraphClient, resolveSiteId } = await import("@/lib/graph");
    const client = await getGraphClient();
    const siteId = await resolveSiteId();

    const sanitizedName = candidateName ? candidateName.replace(/[^a-zA-Z0-9_-]/g, " ").trim() : "Unknown_Candidate";
    const folderName = `${sanitizedName} - ${candidateId}`;
    const folderPath = `CandidateDocs/${folderName}`;

    const url = `/sites/${siteId}/drive/root:/${folderPath}:/children`;
    
    let res;
    try {
      res = await client.api(url).get();
    } catch (err: any) {
      // Folder might not exist yet, which is fine
      if (err.statusCode === 404) {
        return { success: true, data: [] };
      }
      throw err;
    }

    const items = (res.value || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      webUrl: item.webUrl,
      downloadUrl: item["@microsoft.graph.downloadUrl"] || item.webUrl,
      createdAt: item.createdDateTime,
    }));

    return { success: true, data: items };
  } catch (err: any) {
    console.error("getCandidateDocumentsAction error:", err);
    return { success: false, error: err.message || "Failed to load documents" };
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
    if (!roles.includes("admin") && candidate.partnerId !== partner.id) {
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
        <p>If you have any questions, please contact your partner or reach us at <a href="mailto:info@mysccg.de">info@mysccg.de</a>.</p>
        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">— SCCG Portal Team</p>
      </div>
    </div>
  `;
}
