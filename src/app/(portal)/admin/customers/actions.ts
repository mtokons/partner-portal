"use server";

import { revalidatePath } from "next/cache";
import {
  getCandidates,
  getCustomers,
  getPartners,
  getAllCandidateServices,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  deleteCandidateServices,
  createCandidateService,
} from "@/lib/sharepoint";
import type { Candidate, CandidateService, Partner, CandidatePaymentStatus, WorkflowCategory, CandidateStatus } from "@/types";

export interface CustomerUnifiedRecord {
  id: string;
  sourceType: "candidate" | "direct";
  sccgId: string;
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  nationality: string;
  country: string;
  address?: string;
  passportNumber?: string;
  nationalId?: string;
  source: "sccg" | "partner";
  partnerId?: string;
  partnerName?: string;
  workflowCategory: WorkflowCategory | string;
  currentStatus: CandidateStatus | string;
  paymentStatus: CandidatePaymentStatus;
  totalServiceFee: number;
  depositAmount: number;
  dueAmount: number;
  paymentMethod?: string;
  paymentReference?: string;
  serviceUnlocked?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  services: CandidateService[];
  runningServices: number;
  completedServices: number;
}

export interface CustomersDataResult {
  customers: CustomerUnifiedRecord[];
  partners: Partner[];
  stats: {
    totalCustomers: number;
    directSccg: number;
    partnerReferred: number;
    runningServicesCount: number;
    completedServicesCount: number;
    totalRevenue: number;
    totalDue: number;
  };
}

export async function fetchCustomersDataAction(): Promise<{ success: boolean; data?: CustomersDataResult; error?: string }> {
  try {
    const [candidates, directClients, partners, allServices] = await Promise.all([
      getCandidates().catch(() => [] as Candidate[]),
      getCustomers().catch(() => [] as any[]),
      getPartners().catch(() => [] as Partner[]),
      getAllCandidateServices().catch(() => [] as CandidateService[]),
    ]);

    const partnerMap = new Map(partners.map((p) => [p.id, p.companyName || (p as any).name || "Partner"]));
    const servicesByCandidateId = new Map<string, CandidateService[]>();

    allServices.forEach((svc) => {
      if (!svc.candidateId) return;
      const arr = servicesByCandidateId.get(svc.candidateId) || [];
      arr.push(svc);
      servicesByCandidateId.set(svc.candidateId, arr);
    });

    const unifiedList: CustomerUnifiedRecord[] = [];

    // 1. Process Candidates (the primary customer repository for SCCG & Partners)
    for (const c of candidates) {
      const svcs = servicesByCandidateId.get(c.id) || [];
      const runningCount = svcs.filter((s) => {
        const st = (s.currentStatus || "").toUpperCase();
        return st.includes("RUNNING") || st.includes("IN_PROGRESS") || st.includes("REGISTERED") || st.includes("ACTIVE") || st.includes("PENDING");
      }).length;
      const completedCount = svcs.filter((s) => {
        const st = (s.currentStatus || "").toUpperCase();
        return st.includes("COMPLETE") || st.includes("DONE") || st.includes("FINISHED") || st.includes("SUCCESSFUL");
      }).length;

      const isDirect = !c.partnerId || c.partnerId === "sccg" || c.partnerId === "direct" || (c.partnerName && c.partnerName.toLowerCase().includes("sccg"));
      const pName = c.partnerName || (c.partnerId ? partnerMap.get(c.partnerId) : undefined);

      const fee = Number(c.totalServiceFee) || 0;
      const deposit = Number(c.depositAmount) || 0;
      const due = Math.max(0, fee - deposit);

      unifiedList.push({
        id: c.id,
        sourceType: "candidate",
        sccgId: c.sccgId || `SCCG-${c.id.slice(0, 6)}`,
        fullName: c.fullName || "Unnamed Customer",
        email: c.email || "",
        phone: c.phone || "",
        dateOfBirth: c.dateOfBirth,
        nationality: c.nationality || "Unknown",
        country: c.country || "Germany",
        address: c.address,
        passportNumber: c.passportNumber,
        nationalId: c.nationalId,
        source: isDirect ? "sccg" : "partner",
        partnerId: c.partnerId || undefined,
        partnerName: isDirect ? "SCCG Direct" : pName || "Partner",
        workflowCategory: c.workflowCategory || "Others",
        currentStatus: c.currentStatus || "registered",
        paymentStatus: c.paymentStatus || "pending",
        totalServiceFee: fee,
        depositAmount: deposit,
        dueAmount: c.paymentStatus === "fully-paid" ? 0 : due,
        paymentMethod: c.paymentMethod,
        paymentReference: c.paymentReference,
        serviceUnlocked: c.serviceUnlocked,
        notes: c.notes,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt,
        services: svcs,
        runningServices: runningCount,
        completedServices: completedCount,
      });
    }

    // 2. Process any unique direct Client accounts not already mapped
    const candidateEmails = new Set(candidates.map((c) => (c.email || "").trim().toLowerCase()).filter(Boolean));
    for (const cl of directClients) {
      const email = (cl.email || "").trim().toLowerCase();
      if (email && candidateEmails.has(email)) continue; // avoid duplicate

      unifiedList.push({
        id: cl.id,
        sourceType: "direct",
        sccgId: `CUST-${cl.id.slice(0, 6)}`,
        fullName: cl.name || "Direct Client",
        email: cl.email || "",
        phone: cl.phone || "",
        nationality: "Unknown",
        country: "Germany",
        address: cl.address,
        source: cl.partnerId ? "partner" : "sccg",
        partnerId: cl.partnerId || undefined,
        partnerName: cl.partnerId ? partnerMap.get(cl.partnerId) || "Partner" : "SCCG Direct",
        workflowCategory: "Others",
        currentStatus: "active",
        paymentStatus: "fully-paid",
        totalServiceFee: 0,
        depositAmount: 0,
        dueAmount: 0,
        createdAt: cl.createdAt || new Date().toISOString(),
        updatedAt: cl.updatedAt,
        services: [],
        runningServices: 0,
        completedServices: 0,
      });
    }

    // Calculate Dashboard Stats
    let directCount = 0;
    let partnerCount = 0;
    let runningSvcsTotal = 0;
    let completedSvcsTotal = 0;
    let totalRevenue = 0;
    let totalDue = 0;

    unifiedList.forEach((item) => {
      if (item.source === "sccg") directCount++;
      else partnerCount++;
      runningSvcsTotal += item.runningServices;
      completedSvcsTotal += item.completedServices;
      totalRevenue += item.depositAmount || 0;
      totalDue += item.dueAmount || 0;
    });

    return {
      success: true,
      data: {
        customers: unifiedList,
        partners,
        stats: {
          totalCustomers: unifiedList.length,
          directSccg: directCount,
          partnerReferred: partnerCount,
          runningServicesCount: runningSvcsTotal,
          completedServicesCount: completedSvcsTotal,
          totalRevenue,
          totalDue,
        },
      },
    };
  } catch (err: any) {
    console.error("[admin/customers] fetchCustomersDataAction error:", err);
    return { success: false, error: err.message || "Failed to load customers data." };
  }
}

export async function createNewCustomerAction(formData: {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth?: string;
  nationality?: string;
  country?: string;
  address?: string;
  passportNumber?: string;
  nationalId?: string;
  source: "sccg" | "partner";
  partnerId?: string;
  workflowCategory?: WorkflowCategory;
  paymentStatus?: CandidatePaymentStatus;
  totalServiceFee?: number;
  depositAmount?: number;
  notes?: string;
  serviceName?: string;
}): Promise<{ success: boolean; data?: Candidate; error?: string }> {
  try {
    const sccgId = `SCCG-${Math.floor(100000 + Math.random() * 900000)}`;

    const candidateData: Omit<Candidate, "id"> = {
      sccgId,
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      dateOfBirth: formData.dateOfBirth || "2000-01-01",
      nationality: formData.nationality?.trim() || "German",
      country: formData.country?.trim() || "Germany",
      address: formData.address?.trim() || "",
      passportNumber: formData.passportNumber?.trim() || "",
      nationalId: formData.nationalId?.trim() || "",
      partnerId: formData.source === "partner" && formData.partnerId ? formData.partnerId : "",
      workflowCategory: formData.workflowCategory || "Training & Language",
      currentStatus: "registered",
      totalServiceFee: Number(formData.totalServiceFee) || 0,
      sccgShare: Number(formData.totalServiceFee) || 0,
      partnerShare: 0,
      depositAmount: Number(formData.depositAmount) || 0,
      marginPercentage: 15,
      paymentStatus: formData.paymentStatus || "pending",
      notes: formData.notes || "",
      createdBy: "admin@mysccg.de",
      createdAt: new Date().toISOString(),
    };

    const newCandidate = await createCandidate(candidateData);

    // If an initial service is selected, create candidate service entry
    if (formData.serviceName && newCandidate.id) {
      await createCandidateService({
        candidateId: newCandidate.id,
        servicePricingId: "custom",
        serviceName: formData.serviceName,
        packageType: "all-inclusive",
        basePrice: Number(formData.totalServiceFee) || 0,
        quantity: 1,
        totalPrice: Number(formData.totalServiceFee) || 0,
        workflowCategory: formData.workflowCategory || "Training & Language",
        currentStatus: "REGISTERED",
        createdAt: new Date().toISOString(),
      });
    }

    revalidatePath("/admin/customers");
    return { success: true, data: newCandidate };
  } catch (err: any) {
    console.error("[admin/customers] createNewCustomerAction error:", err);
    return { success: false, error: err.message || "Failed to create customer." };
  }
}

export async function updateCustomerAction(
  id: string,
  updates: Partial<Candidate>
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateCandidate(id, updates);
    revalidatePath("/admin/customers");
    return { success: true };
  } catch (err: any) {
    console.error("[admin/customers] updateCustomerAction error:", err);
    return { success: false, error: err.message || "Failed to update customer." };
  }
}

export async function deleteCustomerAction(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteCandidateServices(id).catch(() => {});
    await deleteCandidate(id);
    revalidatePath("/admin/customers");
    return { success: true };
  } catch (err: any) {
    console.error("[admin/customers] deleteCustomerAction error:", err);
    return { success: false, error: err.message || "Failed to delete customer." };
  }
}

export interface CsvImportRow {
  fullName: string;
  email: string;
  phone?: string;
  nationality?: string;
  country?: string;
  passportNumber?: string;
  source?: string;
  partnerName?: string;
  workflowCategory?: string;
  paymentStatus?: string;
  totalServiceFee?: number;
  depositAmount?: number;
  serviceName?: string;
  serviceStatus?: string;
  notes?: string;
}

export async function importCustomersCsvAction(
  rows: CsvImportRow[]
): Promise<{ success: boolean; importedCount?: number; errors?: string[] }> {
  try {
    if (!rows || !rows.length) {
      return { success: false, errors: ["No rows found to import."] };
    }

    const partners = await getPartners().catch(() => [] as Partner[]);
    const partnerNameToId = new Map(
      partners.map((p) => [((p.companyName || (p as any).name || "").toLowerCase().trim()), p.id])
    );

    let successCount = 0;
    const errorLogs: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = (r.fullName || "").trim();
      const email = (r.email || "").trim().toLowerCase();

      if (!name || !email) {
        errorLogs.push(`Row ${i + 1}: Missing Full Name or Email.`);
        continue;
      }

      try {
        let partnerId = "";
        if (r.partnerName) {
          const pKey = r.partnerName.toLowerCase().trim();
          partnerId = partnerNameToId.get(pKey) || "";
        }

        const sccgId = `SCCG-${Math.floor(100000 + Math.random() * 900000)}`;
        const totalFee = Number(r.totalServiceFee) || 0;
        const deposit = Number(r.depositAmount) || 0;

        let payStatus: CandidatePaymentStatus = "pending";
        const rawStatus = (r.paymentStatus || "").toLowerCase();
        if (rawStatus.includes("fully") || rawStatus.includes("complete") || rawStatus.includes("paid")) {
          payStatus = "fully-paid";
        } else if (rawStatus.includes("deposit") || rawStatus.includes("part")) {
          payStatus = "deposit-paid";
        } else if (rawStatus.includes("refund")) {
          payStatus = "refunded";
        }

        const newCand = await createCandidate({
          sccgId,
          fullName: name,
          email,
          phone: r.phone || "",
          dateOfBirth: "2000-01-01",
          nationality: r.nationality || "Unknown",
          country: r.country || "Germany",
          passportNumber: r.passportNumber || "",
          partnerId: partnerId || "",
          partnerName: r.partnerName || "",
          workflowCategory: (r.workflowCategory as WorkflowCategory) || "Training & Language",
          currentStatus: "registered",
          totalServiceFee: totalFee,
          sccgShare: totalFee,
          partnerShare: 0,
          depositAmount: deposit,
          marginPercentage: 15,
          paymentStatus: payStatus,
          notes: r.notes || "Imported via CSV",
          createdBy: "admin@mysccg.de",
          createdAt: new Date().toISOString(),
        });

        if (r.serviceName && newCand?.id) {
          await createCandidateService({
            candidateId: newCand.id,
            servicePricingId: "imported",
            serviceName: r.serviceName,
            packageType: "all-inclusive",
            basePrice: totalFee,
            quantity: 1,
            totalPrice: totalFee,
            workflowCategory: (r.workflowCategory as WorkflowCategory) || "Training & Language",
            currentStatus: (r.serviceStatus || "REGISTERED").toUpperCase(),
            createdAt: new Date().toISOString(),
          }).catch(() => {});
        }

        successCount++;
      } catch (err: any) {
        errorLogs.push(`Row ${i + 1} (${name}): ${err.message || "Failed to create"}`);
      }
    }

    revalidatePath("/admin/customers");
    return {
      success: successCount > 0,
      importedCount: successCount,
      errors: errorLogs.length > 0 ? errorLogs : undefined,
    };
  } catch (err: any) {
    console.error("[admin/customers] importCustomersCsvAction error:", err);
    return { success: false, errors: [err.message || "Batch import failed."] };
  }
}
