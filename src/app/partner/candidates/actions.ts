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
} from "@/lib/sharepoint";
import { canTransitionTo } from "@/lib/engine/candidate-workflow";
import { calculateFinancialSplit } from "@/lib/engine/financial-split";
import { autoInsertCandidateTasks } from "@/lib/engine/candidate-tasks";
import { generatePartnerCandidateId } from "@/lib/sccg-id";
import { triggerFlow } from "@/lib/powerautomate";
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
  }[];
  partnerMarginPercentage: PartnerMargin;
  paymentOption: "pay-now" | "pay-later";
  paymentMethod?: string;
  paymentReference?: string;
}

export async function finalizeRegistrationAction(
  state: WizardCandidateInput,
  partnerId: string
): Promise<{ candidateId: string } | { error: string }> {
  try {
    const user = await requirePermission("candidate.create");
    const partner = await getPartnerByEmail(user.email!);
    const partnerCode = partner?.partnerCode || "PART";

    const split = calculateFinancialSplit({
      services: state.selectedServices.map((s) => ({
        servicePricingId: s.servicePricingId,
        serviceName: s.serviceName,
        basePrice: s.basePrice,
        quantity: s.quantity,
      })),
      partnerMarginPercentage: state.partnerMarginPercentage,
    });

    const sccgId = await generatePartnerCandidateId(partnerCode, state.workflowCategory);

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
      fullName: state.fullName,
      partnerId,
      workflowCategory: state.workflowCategory,
    });

    revalidatePath("/partner/candidates");

    return { candidateId: candidate.id };
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
