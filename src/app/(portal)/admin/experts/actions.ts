"use server";

import { revalidatePath } from "next/cache";
import {
  getExperts as getServiceExperts,
  createExpert as createServiceExpert,
  updateExpert as updateServiceExpert,
  deleteExpert as deleteServiceExpert,
  getAllSessions,
  getExpertPayments,
} from "@/lib/sharepoint";
import {
  getExperts as getProjectExperts,
  findOrCreateExpert as createProjectExpert,
  updateExpert as updateProjectExpert,
  deleteExpertFromBank as deleteProjectExpert,
  type BankExpert,
} from "@/lib/expert-bank";
import type { Expert, Session, ExpertPayment } from "@/types";

export interface UnifiedExpertRecord {
  id: string;
  expertType: "service" | "project";
  name: string;
  email: string;
  phone?: string;
  specialization: string;
  nationality?: string;
  currentLocation?: string;
  status: string;
  rating: number;
  ratePerSession: number;
  totalSessions: number;
  completedSessions: number;
  upcomingSessions: number;
  totalEarningsEur: number;
  pendingEarningsEur: number;
  bio?: string;
  tags?: string;
  assignedProjectName?: string;
  sessions: Session[];
  payments: ExpertPayment[];
  createdAt: string;
}

export interface ExpertsDataResult {
  experts: UnifiedExpertRecord[];
  stats: {
    totalExperts: number;
    serviceExpertsCount: number;
    projectExpertsCount: number;
    totalSessionsCount: number;
    completedSessionsCount: number;
    totalPaidEur: number;
    totalPendingEur: number;
  };
}

export async function fetchUnifiedExpertsDataAction(): Promise<{
  success: boolean;
  data?: ExpertsDataResult;
  error?: string;
}> {
  try {
    const [serviceExperts, projectExperts, allSessions, allPayments] = await Promise.all([
      getServiceExperts().catch(() => [] as Expert[]),
      getProjectExperts().catch(() => [] as BankExpert[]),
      getAllSessions().catch(() => [] as Session[]),
      getExpertPayments().catch(() => [] as ExpertPayment[]),
    ]);

    // Group sessions by expert ID and email
    const sessionsByExpertId = new Map<string, Session[]>();
    const sessionsByExpertEmail = new Map<string, Session[]>();

    allSessions.forEach((sess) => {
      if (sess.expertId) {
        const arr = sessionsByExpertId.get(sess.expertId) || [];
        arr.push(sess);
        sessionsByExpertId.set(sess.expertId, arr);
      }
    });

    // Group payments by expert ID
    const paymentsByExpertId = new Map<string, ExpertPayment[]>();
    allPayments.forEach((pmt) => {
      if (pmt.expertId) {
        const arr = paymentsByExpertId.get(pmt.expertId) || [];
        arr.push(pmt);
        paymentsByExpertId.set(pmt.expertId, arr);
      }
    });

    const unifiedList: UnifiedExpertRecord[] = [];

    // 1. Process Service Experts (Mentors / Teachers / Career Coaches)
    for (const se of serviceExperts) {
      const expertSessions = sessionsByExpertId.get(se.id) || [];
      const expertPayments = paymentsByExpertId.get(se.id) || [];

      const completed = expertSessions.filter((s) => s.status === "completed").length;
      const upcoming = expertSessions.filter((s) => s.status === "scheduled").length;

      let totalPaid = 0;
      let totalPending = 0;

      expertPayments.forEach((p) => {
        const amt = Number(p.amountEur || p.amount) || 0;
        if (p.status === "paid") totalPaid += amt;
        else if (p.status === "approved" || p.status === "eligible") totalPending += amt;
      });

      // If no payments recorded yet, estimate from ratePerSession
      if (expertPayments.length === 0 && se.ratePerSession) {
        totalPaid = completed * Number(se.ratePerSession);
      }

      unifiedList.push({
        id: se.id,
        expertType: "service",
        name: se.name || "Service Expert",
        email: se.email || "",
        phone: se.phone,
        specialization: se.specialization || "Training & Mentorship",
        nationality: "German",
        currentLocation: "Germany",
        status: se.status || "active",
        rating: Number(se.rating) || 5.0,
        ratePerSession: Number(se.ratePerSession) || 50,
        totalSessions: expertSessions.length || Number(se.totalSessionsCompleted) || 0,
        completedSessions: completed || Number(se.totalSessionsCompleted) || 0,
        upcomingSessions: upcoming,
        totalEarningsEur: totalPaid,
        pendingEarningsEur: totalPending,
        bio: se.bio,
        sessions: expertSessions,
        payments: expertPayments,
        createdAt: se.createdAt || new Date().toISOString(),
      });
    }

    // 2. Process Project Experts (Consultants / TOR Experts)
    for (const pe of projectExperts) {
      unifiedList.push({
        id: pe.id,
        expertType: "project",
        name: pe.expertName || "Project Expert",
        email: pe.email || "",
        specialization: pe.position || "Project Consultant",
        nationality: pe.nationality || "International",
        currentLocation: pe.currentLocation || "Global",
        status: pe.status || "available",
        rating: 4.8,
        ratePerSession: 0,
        totalSessions: 0,
        completedSessions: 0,
        upcomingSessions: 0,
        totalEarningsEur: 0,
        pendingEarningsEur: 0,
        tags: pe.tags,
        assignedProjectName: pe.assignedProjectName,
        sessions: [],
        payments: [],
        createdAt: pe.createdAt || new Date().toISOString(),
      });
    }

    // Calculate Summary Stats
    let sCount = 0;
    let pCount = 0;
    let totalSessionsAll = 0;
    let completedSessionsAll = 0;
    let totalPaidAll = 0;
    let totalPendingAll = 0;

    unifiedList.forEach((e) => {
      if (e.expertType === "service") sCount++;
      else pCount++;
      totalSessionsAll += e.totalSessions;
      completedSessionsAll += e.completedSessions;
      totalPaidAll += e.totalEarningsEur;
      totalPendingAll += e.pendingEarningsEur;
    });

    return {
      success: true,
      data: {
        experts: unifiedList,
        stats: {
          totalExperts: unifiedList.length,
          serviceExpertsCount: sCount,
          projectExpertsCount: pCount,
          totalSessionsCount: totalSessionsAll,
          completedSessionsCount: completedSessionsAll,
          totalPaidEur: totalPaidAll,
          totalPendingEur: totalPendingAll,
        },
      },
    };
  } catch (err: any) {
    console.error("[admin/experts] fetchUnifiedExpertsDataAction error:", err);
    return { success: false, error: err.message || "Failed to load experts." };
  }
}

export async function createNewExpertAction(formData: {
  expertType: "service" | "project";
  name: string;
  email: string;
  phone?: string;
  specialization: string;
  nationality?: string;
  currentLocation?: string;
  ratePerSession?: number;
  bio?: string;
  tags?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (formData.expertType === "service") {
      const newId = `exp_${Date.now()}`;
      await createServiceExpert({
        id: newId,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone?.trim() || "",
        specialization: formData.specialization?.trim() || "Career & Language Coach",
        bio: formData.bio?.trim() || "",
        status: "active",
        rating: 5.0,
        totalSessionsCompleted: 0,
        ratePerSession: Number(formData.ratePerSession) || 50,
        createdAt: new Date().toISOString(),
      });
    } else {
      await createProjectExpert({
        expertName: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        position: formData.specialization?.trim() || "International Consultant",
        nationality: formData.nationality?.trim() || "International",
        currentLocation: formData.currentLocation?.trim() || "Germany",
        level: "Senior",
        createdBy: "admin@mysccg.de",
      });
    }

    revalidatePath("/admin/experts");
    return { success: true };
  } catch (err: any) {
    console.error("[admin/experts] createNewExpertAction error:", err);
    return { success: false, error: err.message || "Failed to create expert." };
  }
}

export async function updateExpertAction(
  id: string,
  expertType: "service" | "project",
  updates: {
    name?: string;
    email?: string;
    phone?: string;
    specialization?: string;
    status?: string;
    ratePerSession?: number;
    bio?: string;
    nationality?: string;
    currentLocation?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (expertType === "service") {
      await updateServiceExpert(id, {
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        specialization: updates.specialization,
        status: updates.status as any,
        ratePerSession: updates.ratePerSession,
        bio: updates.bio,
      });
    } else {
      await updateProjectExpert(id, {
        expertName: updates.name,
        email: updates.email,
        position: updates.specialization,
        status: updates.status as any,
        nationality: updates.nationality,
        currentLocation: updates.currentLocation,
      });
    }

    revalidatePath("/admin/experts");
    return { success: true };
  } catch (err: any) {
    console.error("[admin/experts] updateExpertAction error:", err);
    return { success: false, error: err.message || "Failed to update expert." };
  }
}

export async function deleteExpertAction(
  id: string,
  expertType: "service" | "project"
): Promise<{ success: boolean; error?: string }> {
  try {
    if (expertType === "service") {
      await deleteServiceExpert(id);
    } else {
      await deleteProjectExpert(id);
    }
    revalidatePath("/admin/experts");
    return { success: true };
  } catch (err: any) {
    console.error("[admin/experts] deleteExpertAction error:", err);
    return { success: false, error: err.message || "Failed to delete expert." };
  }
}

export interface CsvExpertImportRow {
  name: string;
  email: string;
  phone?: string;
  specialization?: string;
  expertType?: string;
  nationality?: string;
  currentLocation?: string;
  ratePerSession?: number;
  status?: string;
  bio?: string;
}

export async function importExpertsCsvAction(
  rows: CsvExpertImportRow[]
): Promise<{ success: boolean; importedCount?: number; errors?: string[] }> {
  try {
    if (!rows || !rows.length) {
      return { success: false, errors: ["No rows found to import."] };
    }

    let successCount = 0;
    const errorLogs: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const name = (r.name || "").trim();
      const email = (r.email || "").trim().toLowerCase();

      if (!name || !email) {
        errorLogs.push(`Row ${i + 1}: Missing Name or Email.`);
        continue;
      }

      try {
        const isProject = (r.expertType || "").toLowerCase().includes("project");

        if (isProject) {
          await createProjectExpert({
            expertName: name,
            email,
            position: r.specialization || "Consultant",
            nationality: r.nationality || "International",
            currentLocation: r.currentLocation || "Germany",
            level: "Senior",
            createdBy: "admin@mysccg.de",
          });
        } else {
          const newId = `exp_${Date.now()}_${i}`;
          await createServiceExpert({
            id: newId,
            name,
            email,
            phone: r.phone || "",
            specialization: r.specialization || "Career & Language Coach",
            bio: r.bio || "",
            status: "active",
            rating: 5.0,
            totalSessionsCompleted: 0,
            ratePerSession: Number(r.ratePerSession) || 50,
            createdAt: new Date().toISOString(),
          });
        }

        successCount++;
      } catch (err: any) {
        errorLogs.push(`Row ${i + 1} (${name}): ${err.message || "Failed to create"}`);
      }
    }

    revalidatePath("/admin/experts");
    return {
      success: successCount > 0,
      importedCount: successCount,
      errors: errorLogs.length > 0 ? errorLogs : undefined,
    };
  } catch (err: any) {
    console.error("[admin/experts] importExpertsCsvAction error:", err);
    return { success: false, errors: [err.message || "Batch import failed."] };
  }
}
