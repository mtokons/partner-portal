"use server";

import { revalidatePath } from "next/cache";
import { requirePpmsManager, canManageOrg } from "@/lib/ppms-guard";
import { getProjectById } from "@/lib/projects";
import { getEvaluationTemplateById } from "@/lib/templates";
import { getIntakeById, updateIntake } from "@/lib/cv-intake";
import { createEvaluationRecord, updateEvaluationFromScores } from "@/lib/evaluation";
import { scoreAllCriteria, type JudgeContextRules } from "@/lib/agents/judge-agent";
import { profileToExcerpts } from "@/lib/agents/cv-agent";
import { getTorDocsForProject } from "@/lib/agents/tor-docs";
import {
  createScoreDetail, getScoreDetailById, getScoreDetailsForEvaluation, updateScoreDetail,
} from "@/lib/agents/score-details";

function revalidate() {
  revalidatePath("/project-partner/manage/intake");
  revalidatePath("/project-partner/manage/review");
  revalidatePath("/project-partner/evaluation");
}

/** Build the text the judge assesses: the structured Persona-2 profile if present, else the form + raw CV text.
 *  Pass bangladeshProject=true to annotate each experience with country tags. */
function buildExcerpts(
  intake: { form: Record<string, string>; rawText?: string; profile?: import("@/lib/agents/contracts").CvProfile },
  bangladeshProject?: boolean,
): string {
  if (intake.profile && intake.profile.professionalExperience?.length) {
    return profileToExcerpts(intake.profile, bangladeshProject);
  }
  const formLines = Object.entries(intake.form || {})
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
  return [formLines, intake.rawText || ""].filter(Boolean).join("\n\n").trim();
}

/**
 * Persona 3 pipeline: score every criterion of the project's matrix one call each,
 * persist an aggregate evaluation + per-criterion evidence, and route low-confidence
 * or unverified results to the human review queue.
 */
export async function runJudgeScoringAction(intakeId: string) {
  await requirePpmsManager();
  const intake = await getIntakeById(intakeId);
  if (!intake) throw new Error("Intake not found");
  const project = await getProjectById(intake.projectId);
  const ctx = await requirePpmsManager();
  if (!canManageOrg(ctx, project?.orgId)) throw new Error("Forbidden");
  if (!project?.evaluationTemplateId) throw new Error("This project has no evaluation matrix configured.");
  const tpl = await getEvaluationTemplateById(project.evaluationTemplateId);
  if (!tpl || tpl.criteria.length === 0) throw new Error("Evaluation matrix has no criteria.");

  const excerpts = buildExcerpts(intake);
  if (!excerpts) throw new Error("No CV text to score — extract the CV first.");

  // Derive context rules from the project's most-recent approved ToR (if any)
  const contextRules: JudgeContextRules = {};
  const torDocs = await getTorDocsForProject(project.id).catch(() => []);
  const approvedTor = torDocs.find((t) => t.status === "approved");
  if (approvedTor?.structure) {
    const s = approvedTor.structure;
    if (s.bangladeshProject) contextRules.bangladeshProject = true;
    if (s.sectorGroups?.length) {
      // Build a map from criterion key → sector mode + peer labels
      const sectorMap: Record<string, { mode: "cumulative" | "individual"; peers: string[] }> = {};
      for (const group of s.sectorGroups) {
        for (const sectorLabel of group.sectors) {
          // Match against criteria labels by substring
          const matched = tpl.criteria.filter((c) =>
            c.label.toLowerCase().includes(sectorLabel.toLowerCase()) ||
            sectorLabel.toLowerCase().includes(c.label.toLowerCase())
          );
          for (const c of matched) {
            sectorMap[c.key] = { mode: group.mode, peers: group.sectors.filter((s) => s !== sectorLabel) };
          }
        }
      }
      if (Object.keys(sectorMap).length) contextRules.criterionSectorMode = sectorMap;
    }
  }
  const excerptsBD = buildExcerpts(intake, contextRules.bangladeshProject);

  // 1. Run the judge per-criterion
  const results = await scoreAllCriteria({
    criteria: tpl.criteria,
    cvExcerpts: excerptsBD,
    contextRefBase: `intake:${intakeId}`,
    contextRules,
  });

  // 2. Aggregate evaluation record
  const evaluation = await createEvaluationRecord({
    projectId: project.id,
    expertId: `INTAKE-${intakeId}`,
    expertName: intake.expertName,
    position: intake.position || tpl.name,
    evalKey: tpl.evalKey,
    minPercent: tpl.minPercent,
    criteria: tpl.criteria,
    scores: results.map((r) => ({ key: r.criterionKey, score: r.score })),
    cvFileName: intake.cvFileName,
    notes: `AI-scored per-criterion (${results[0]?.provider || "mock"})`,
  });

  // 3. Persist per-criterion evidence for the review queue
  for (const r of results) {
    const c = tpl.criteria.find((x) => x.key === r.criterionKey);
    await createScoreDetail({
      evaluationId: evaluation.id, intakeId, projectId: project.id,
      criterionKey: r.criterionKey, criterionLabel: c?.label || r.criterionKey, category: c?.category || "",
      aiScore: r.score, score: r.score, maxPoints: r.maxPoints,
      evidence: r.evidence, evidenceVerified: r.evidenceVerified, confidence: r.confidence,
      reasoning: r.reasoning, threshold: r.threshold, needsReview: r.needsReview, reviewed: false,
      provider: r.provider, runId: r.runId,
    });
  }

  const needsReview = results.filter((r) => r.needsReview).length;
  // 4. Confidence gate: never auto-publish if anything needs a human
  await updateIntake(intakeId, {
    status: needsReview > 0 ? "review" : "published",
    evalKey: tpl.evalKey,
    evaluationId: evaluation.id,
    aiProvider: results[0]?.provider,
  });

  revalidate();
  return {
    evaluationId: evaluation.id,
    total: results.length,
    needsReview,
    percentage: evaluation.percentage,
    passed: evaluation.passed,
    provider: results[0]?.provider || "mock",
  };
}

/** Human resolves one flagged criterion: optionally override the score, then mark reviewed. */
export async function resolveScoreDetailAction(detailId: string, input: { score?: number; approve: boolean }) {
  const ctx = await requirePpmsManager();
  const detail = await getScoreDetailById(detailId);
  if (!detail) throw new Error("Score detail not found");
  const project = await getProjectById(detail.projectId);
  if (!canManageOrg(ctx, project?.orgId)) throw new Error("Forbidden");

  const newScore = input.score !== undefined
    ? Math.max(0, Math.min(detail.maxPoints, Math.round(input.score * 100) / 100))
    : detail.score;

  await updateScoreDetail(detailId, {
    score: newScore,
    reviewed: input.approve,
    needsReview: input.approve ? false : detail.needsReview,
    reviewedBy: ctx.user.email,
  });

  // Recompute the parent evaluation aggregate from all its details
  const tpl = project?.evaluationTemplateId ? await getEvaluationTemplateById(project.evaluationTemplateId) : null;
  if (tpl) {
    const details = await getScoreDetailsForEvaluation(detail.evaluationId);
    const scores = details.map((d) => ({ key: d.criterionKey, score: d.id === detailId ? newScore : d.score }));
    await updateEvaluationFromScores(detail.evaluationId, tpl.criteria, tpl.minPercent, scores);
  }

  revalidate();
  return { score: newScore };
}

/** Mark all remaining flags on one candidate's evaluation as reviewed and publish it. */
export async function publishReviewedEvaluationAction(evaluationId: string, intakeId: string) {
  const ctx = await requirePpmsManager();
  const details = await getScoreDetailsForEvaluation(evaluationId);
  if (details.length === 0) throw new Error("No scored criteria found.");
  const project = await getProjectById(details[0].projectId);
  if (!canManageOrg(ctx, project?.orgId)) throw new Error("Forbidden");

  for (const d of details) {
    if (d.needsReview) await updateScoreDetail(d.id, { reviewed: true, needsReview: false, reviewedBy: ctx.user.email });
  }
  await updateIntake(intakeId, { status: "published" });
  revalidate();
}
