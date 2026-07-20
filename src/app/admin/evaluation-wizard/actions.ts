"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import {
  findOrCreateExpert, createBankEvaluation, getExpertById, getCvsForExpert, getBankCvById,
} from "@/lib/expert-bank";
import { getDriveFile } from "@/lib/graph";

async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const roles = user?.roles || (user?.role ? [user.role] : []);
  if (!user || !roles.includes("admin")) throw new Error("Not authorised");
  return user;
}

interface MatrixMatch { requirement: string; evidence: string; score: number; max_score: number }
interface WizardResult {
  expert_name?: string;
  tor_match_pct?: number;
  sections?: { section: string; tailored: string }[];
  matrix_matches?: MatrixMatch[];
}

/**
 * Save an evaluation produced by the wizard under a (deduplicated) expert.
 * The matrix scores + strengths/gaps/analysis may have been manually adjusted.
 */
export async function getExpertCvOptionsAction(expertId: string) {
  await requireAdmin();
  if (!expertId) return [];
  return getCvsForExpert(expertId);
}

export async function analyzeBankCvAction(input: {
  cvId: string;
  torText: string;
  criteriaJson: string;
  projectName: string;
  bangladeshProject: boolean;
  sectorGroupsJson: string;
  deepAnalysis: boolean;
}) {
  await requireAdmin();
  const cv = await getBankCvById(input.cvId);
  if (!cv) throw new Error("Selected CV not found");
  const file = await getDriveFile(cv.drivePath);
  if (!file) throw new Error("Selected CV file is missing in storage");

  const formData = new FormData();
  const blob = new Blob([file.buffer], { type: file.contentType || "application/octet-stream" });
  formData.append("cv_file", blob, cv.fileName);
  formData.append("tor_text", input.torText || "");
  formData.append("criteria_json", input.criteriaJson || "[]");
  formData.append("project_name", input.projectName || "Project");
  formData.append("bangladesh_project", String(input.bangladeshProject));
  formData.append("sector_groups_json", input.sectorGroupsJson || "[]");
  formData.append("deep_analysis", String(input.deepAnalysis));

  const base = process.env.CV_TAILOR_API_URL || "http://cv-tailor:8001";
  const r = await fetch(`${base}/tailor`, { method: "POST", body: formData });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || j.detail || `HTTP ${r.status}`);
  }
  return r.json();
}

export async function saveWizardEvaluationAction(input: {
  // identity
  expertId?: string;          // if an existing expert was picked
  expertName: string;
  email?: string;
  nationality?: string;
  currentLocation?: string;
  level?: string;
  // context
  projectId: string;
  projectName: string;
  proposedPosition: string;
  matrixId?: string;
  torExcerptId?: string;
  // result (possibly adjusted)
  result: WizardResult;
  matrixMatches: MatrixMatch[];
  strengths: string;
  gaps: string;
  torAnalysis: string;
  torMatchPct: number;
  adjusted: boolean;
  cvId?: string;
  cvFileName?: string;
  cvFormat?: string;
}) {
  const user = await requireAdmin();

  // 1. Resolve expert (existing or dedup-create)
  let expert = input.expertId ? await getExpertById(input.expertId) : null;
  if (!expert) {
    const res = await findOrCreateExpert({
      expertName: input.expertName,
      email: input.email,
      position: input.proposedPosition,
      nationality: input.nationality,
      currentLocation: input.currentLocation,
      level: input.level,
      createdBy: user.email,
    });
    expert = res.expert;
  }

  // 2. Compute totals from (possibly adjusted) matrix
  const total = input.matrixMatches.reduce((s, m) => s + (Number(m.score) || 0), 0);
  const max = input.matrixMatches.reduce((s, m) => s + (Number(m.max_score) || 0), 0);
  const pct = max > 0 ? Math.round((total / max) * 100) : Math.round(input.torMatchPct || 0);

  const fullResult = { ...input.result, matrix_matches: input.matrixMatches, tor_match_pct: input.torMatchPct };

  // 3. Persist the evaluation under the expert
  const evaluation = await createBankEvaluation({
    expertId: expert.id,
    expertName: expert.expertName,
    projectId: input.projectId,
    projectName: input.projectName,
    matrixId: input.matrixId || "",
    torExcerptId: input.torExcerptId || "",
    proposedPosition: input.proposedPosition,
    cvId: input.cvId || "",
    cvFileName: input.cvFileName || "",
    format: input.cvFormat || "",
    result: fullResult,
    torMatchPct: Math.round(input.torMatchPct),
    totalScore: total,
    maxScore: max,
    percentage: pct,
    strengths: input.strengths,
    gaps: input.gaps,
    torAnalysis: input.torAnalysis,
    adjusted: input.adjusted,
    createdBy: user.email,
  });

  return { ok: true, expertId: expert.id, evaluationId: evaluation.id };
}
