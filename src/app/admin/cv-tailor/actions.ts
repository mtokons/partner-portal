"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { uploadDriveFile } from "@/lib/graph";
import {
  findOrCreateExpert, createBankCv, createBankEvaluation, updateBankEvaluation,
  offerExpertToPartner, getExpertById,
} from "@/lib/expert-bank";
import { getProjectOrgs } from "@/lib/project-orgs";

async function requireAdmin(): Promise<SessionUser> {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const roles = user?.roles || (user?.role ? [user.role] : []);
  if (!user || !roles.includes("admin")) throw new Error("Not authorised");
  return user;
}

/**
 * Generate the tailored DOCX via the Python service, then persist it to the
 * SharePoint document library under the project's Tailored CVs folder.
 */
export async function saveTailoredCvAction(input: {
  result: unknown;
  templateId: string;
  projectId: string;
  projectName: string;
  expertName: string;
  personData?: unknown;
}) {
  await requireAdmin();
  const base = process.env.CV_TAILOR_API_URL || "http://cv-tailor:8001";

  const body: Record<string, unknown> = { result: input.result, template_id: input.templateId };
  if (input.templateId === "custom1" && input.personData) body.person_data = input.personData;

  const r = await fetch(`${base}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`CV generation failed (HTTP ${r.status})`);
  const arrayBuf = await r.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  const safeExpert = (input.expertName || "Expert").replace(/[^a-zA-Z0-9 _-]/g, "").replace(/\s+/g, "_") || "Expert";
  const stamp = new Date().toISOString().slice(0, 10);
  const folder = input.projectId ? `ProjectPartner/${input.projectId}/Tailored CVs` : "ProjectPartner/Tailored CVs";
  const isPdf = input.templateId === "latex_modern";
  const ext = isPdf ? "pdf" : "docx";
  const mime = isPdf ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const fileName = `${safeExpert}_${input.templateId}_${stamp}.${ext}`;
  const path = `${folder}/${fileName}`;

  const item = await uploadDriveFile(
    path,
    buffer,
    mime
  );

  return { ok: true, fileName, webUrl: (item as { webUrl?: string }).webUrl || "" };
}

// ── Master Expert Bank ───────────────────────────────────────────────────────

interface TailorResultLike {
  expert_name?: string;
  tor_match_pct?: number;
  sections?: { section: string; tailored: string }[];
  matrix_matches?: { requirement: string; evidence: string; score: number; max_score: number }[];
}

/** Derive strengths, gaps, and a short TOR analysis from a TailorResult. */
function deriveInsights(result: TailorResultLike) {
  const matches = result.matrix_matches || [];
  const total = matches.reduce((s, m) => s + (Number(m.score) || 0), 0);
  const max = matches.reduce((s, m) => s + (Number(m.max_score) || 0), 0);
  const pct = max > 0 ? Math.round((total / max) * 100) : Math.round(result.tor_match_pct || 0);
  const strengths = matches
    .filter((m) => m.max_score && m.score / m.max_score >= 0.7)
    .map((m) => `• ${m.requirement}: ${m.evidence}`)
    .join("\n");
  const gaps = matches
    .filter((m) => !m.max_score || m.score / m.max_score < 0.5)
    .map((m) => `• ${m.requirement} (scored ${m.score}/${m.max_score})`)
    .join("\n");
  const torAnalysis = `TOR match ${Math.round(result.tor_match_pct || pct)}% · Matrix ${total}/${max} (${pct}%). `
    + `${matches.filter((m) => m.max_score && m.score / m.max_score >= 0.7).length} strong criteria, `
    + `${matches.filter((m) => !m.max_score || m.score / m.max_score < 0.5).length} gaps.`;
  return { total, max, pct, strengths, gaps, torAnalysis };
}

/**
 * Save a tailored CV + its evaluation into the Master Expert Bank.
 * Dedups the expert (find-or-create), stores the CV tagged with its format +
 * tailored flag, and stores an editable evaluation report linked to project/matrix/TOR.
 */
export async function saveToExpertBankAction(input: {
  result: TailorResultLike;
  templateId: string;
  projectId: string;
  projectName: string;
  matrixId?: string;
  torExcerptId?: string;
  email?: string;
  nationality?: string;
  level?: string;
  personData?: unknown;
}) {
  const user = await requireAdmin();
  const expertName = input.result.expert_name || "Expert";

  // 1. Generate + upload the DOCX first (so the CV file exists)
  const saved = await saveTailoredCvAction({
    result: input.result, templateId: input.templateId, projectId: input.projectId,
    projectName: input.projectName, expertName, personData: input.personData,
  });

  // 2. Find or create the master expert (dedup by email/name)
  const { expert, created } = await findOrCreateExpert({
    expertName, email: input.email, position: input.projectName,
    nationality: input.nationality, level: input.level, createdBy: user.email,
  });

  // 3. Store the CV tagged with format + tailored flag
  const folder = input.projectId ? `ProjectPartner/${input.projectId}/Tailored CVs` : "ProjectPartner/Tailored CVs";
  const cv = await createBankCv({
    expertId: expert.id, fileName: saved.fileName, drivePath: `${folder}/${saved.fileName}`,
    format: input.templateId, tailored: true, torExcerptId: input.torExcerptId || "",
    projectId: input.projectId, createdBy: user.email,
  });

  // 4. Store the evaluation report (editable later)
  const ins = deriveInsights(input.result);
  const evaluation = await createBankEvaluation({
    expertId: expert.id, expertName, projectId: input.projectId, projectName: input.projectName,
    matrixId: input.matrixId || "", torExcerptId: input.torExcerptId || "", cvId: cv.id,
    cvFileName: saved.fileName, format: input.templateId, result: input.result,
    torMatchPct: Math.round(input.result.tor_match_pct || ins.pct),
    totalScore: ins.total, maxScore: ins.max, percentage: ins.pct,
    strengths: ins.strengths, gaps: ins.gaps, torAnalysis: ins.torAnalysis, adjusted: false,
    createdBy: user.email,
  });

  return { ok: true, expertId: expert.id, created, cvId: cv.id, evaluationId: evaluation.id, fileName: saved.fileName };
}

/** Adjust an evaluation report (preview-mode human edits). */
export async function adjustBankEvaluationAction(input: {
  evaluationId: string; strengths?: string; gaps?: string; torAnalysis?: string; torMatchPct?: number;
}) {
  await requireAdmin();
  await updateBankEvaluation(input.evaluationId, {
    strengths: input.strengths, gaps: input.gaps, torAnalysis: input.torAnalysis,
    torMatchPct: input.torMatchPct, adjusted: true,
  });
  return { ok: true };
}

/**
 * "Implement for partners": offer this expert to every project partner (org) so
 * they see it on their board. Skips partners once the expert is locked. No duplicates.
 */
export async function implementForPartnersAction(expertId: string) {
  await requireAdmin();
  const expert = await getExpertById(expertId);
  if (!expert) throw new Error("Expert not found");
  if (expert.status === "locked") return { ok: false, reason: "Expert is already booked by a partner." };
  const orgs = await getProjectOrgs();
  let offered = 0;
  for (const org of orgs) {
    await offerExpertToPartner(expertId, org.id);
    offered++;
  }
  return { ok: true, offered };
}
