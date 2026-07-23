"use server";

import { requirePermission } from "@/lib/permissions";
import {
  getCandidates,
  getCandidateById,
  getCandidateServices,
  getCandidateTasks,
  updateCandidate,
} from "@/lib/sharepoint";
import type { Candidate, CandidateService, CandidateTask } from "@/types";

// ── Dashboard Statistics ──────────────────────────────────────
export interface CvSuiteStats {
  totalCandidates: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  byPayment: Record<string, number>;
  onHold: number;
  totalRevenue: number;
  avgServiceFee: number;
  recentCandidates: Candidate[];
}

export async function getCvSuiteStats(): Promise<CvSuiteStats> {
  try {
    await requirePermission("admin.view");
    const all = await getCandidates();

    const byCategory: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byPayment: Record<string, number> = {};
    let onHold = 0;
    let totalRevenue = 0;

    for (const c of all) {
      byCategory[c.workflowCategory] = (byCategory[c.workflowCategory] || 0) + 1;
      byStatus[c.currentStatus as string] = (byStatus[c.currentStatus as string] || 0) + 1;
      byPayment[c.paymentStatus] = (byPayment[c.paymentStatus] || 0) + 1;
      if (c.isOnHold) onHold++;
      totalRevenue += c.totalServiceFee || 0;
    }

    const sorted = [...all].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );

    return {
      totalCandidates: all.length,
      byCategory,
      byStatus,
      byPayment,
      onHold,
      totalRevenue,
      avgServiceFee: all.length ? Math.round(totalRevenue / all.length) : 0,
      recentCandidates: sorted.slice(0, 10),
    };
  } catch (err) {
    console.error("getCvSuiteStats Error:", err);
    return {
      totalCandidates: 0,
      byCategory: {},
      byStatus: {},
      byPayment: {},
      onHold: 0,
      totalRevenue: 0,
      avgServiceFee: 0,
      recentCandidates: [],
    };
  }
}

// ── Get All Candidates (for table) ────────────────────────────
export async function getAllCandidatesAction(): Promise<Candidate[]> {
  try {
    await requirePermission("admin.view");
    return await getCandidates();
  } catch (err) {
    console.error("getAllCandidatesAction Error:", err);
    return [];
  }
}

// ── Candidate Detail with Services & Tasks ────────────────────
export interface CandidateDetail {
  candidate: Candidate;
  services: CandidateService[];
  tasks: CandidateTask[];
}

export async function getCandidateDetailAction(
  candidateId: string
): Promise<CandidateDetail | null> {
  try {
    await requirePermission("admin.view");
    const [candidate, services, tasks] = await Promise.all([
      getCandidateById(candidateId),
      getCandidateServices(candidateId),
      getCandidateTasks(candidateId),
    ]);
    if (!candidate) return null;
    return { candidate, services, tasks };
  } catch (err) {
    console.error("getCandidateDetailAction Error:", err);
    return null;
  }
}

// ── Bulk Toggle On Hold ───────────────────────────────────────
export async function bulkToggleOnHoldAction(
  candidateIds: string[],
  isOnHold: boolean
): Promise<{ success: number; failed: number }> {
  try {
    await requirePermission("candidate.status.advance");
    let success = 0;
    let failed = 0;

    for (const id of candidateIds) {
      try {
        await updateCandidate(id, { isOnHold });
        success++;
      } catch {
        failed++;
      }
    }

    return { success, failed };
  } catch (err) {
    console.error("bulkToggleOnHoldAction Error:", err);
    return { success: 0, failed: candidateIds.length };
  }
}

// ── CSV Export Data ───────────────────────────────────────────
export async function exportCandidatesCsvAction(
  candidateIds?: string[]
): Promise<string> {
  try {
    await requirePermission("admin.view");
    let all = await getCandidates();

    if (candidateIds && candidateIds.length > 0) {
      const idSet = new Set(candidateIds);
      all = all.filter((c) => idSet.has(c.id));
    }

    const headers = [
      "SCCG ID",
      "Full Name",
      "Email",
      "Phone",
      "Nationality",
      "Country",
      "Category",
      "Status",
      "Payment Status",
      "Total Fee (EUR)",
      "Partner Share (EUR)",
      "SCCG Share (EUR)",
      "Deposit (EUR)",
      "Partner",
      "On Hold",
      "Created At",
    ];

    const rows = all.map((c) => [
      c.sccgId || "",
      c.fullName || "",
      c.email || "",
      c.phone || "",
      c.nationality || "",
      c.country || "",
      c.workflowCategory || "",
      (c.currentStatus as string) || "",
      c.paymentStatus || "",
      (c.totalServiceFee || 0).toFixed(2),
      (c.partnerShare || 0).toFixed(2),
      (c.sccgShare || 0).toFixed(2),
      (c.depositAmount || 0).toFixed(2),
      c.partnerName ?? c.partnerId ?? "",
      c.isOnHold ? "Yes" : "No",
      c.createdAt ?? "",
    ]);

    const escape = (v: string) => {
      if (v.includes(",") || v.includes('"') || v.includes("\n")) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    };

    return [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  } catch (err) {
    console.error("exportCandidatesCsvAction Error:", err);
    return "Error exporting CSV";
  }
}

// ── Document Completeness ─────────────────────────────────────
const REQUIRED_DOCS_BY_CATEGORY: Record<string, string[]> = {
  Training: ["Passport Copy", "CV/Resume", "Educational Certificates"],
  Ausbildung: [
    "Passport Copy",
    "CV/Resume",
    "Educational Certificates",
    "German Course Certificate",
    "Academic Transcripts",
  ],
  "Student Visa": [
    "Passport Copy",
    "CV/Resume",
    "Educational Certificates",
    "Language Proficiency",
    "University Application",
  ],
  "Opportunity Card": [
    "Passport Copy",
    "CV/Resume",
    "Educational Certificates",
    "Work Experience Letters",
    "ZAB Documents",
  ],
};

export interface DocumentCompletenessRow {
  candidateId: string;
  candidateName: string;
  sccgId: string;
  workflowCategory: string;
  requiredDocs: string[];
  uploadedCount: number;
  completionPercent: number;
}

export async function getDocumentCompletenessAction(): Promise<
  DocumentCompletenessRow[]
> {
  try {
    await requirePermission("admin.view");
    const all = await getCandidates();

    return all.map((c) => {
      const required = REQUIRED_DOCS_BY_CATEGORY[c.workflowCategory] ?? [];
      return {
        candidateId: c.id,
        candidateName: c.fullName,
        sccgId: c.sccgId,
        workflowCategory: c.workflowCategory,
        requiredDocs: required,
        uploadedCount: 0,
        completionPercent: 0,
      };
    });
  } catch (err) {
    console.error("getDocumentCompletenessAction Error:", err);
    return [];
  }
}
