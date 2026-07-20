/**
 * Pure client-safe utility: build a rich text profile from stored expert bank
 * data for the CV Creation Wizard. No server imports.
 */
import type { BankExpert, BankEvaluation } from "@/lib/expert-bank";

export function buildExpertProfile(expert: BankExpert, evals: BankEvaluation[]) {
  const allStrengths = [...new Set(
    evals.flatMap((e) => (e.strengths || "").split("\n").map((l) => l.trim())).filter(Boolean)
  )].join("\n");
  const allMatches = evals.flatMap((e) => e.result ? (e.result as any).matrix_matches || [] : []);
  const allSections = evals.flatMap((e) => e.result ? (e.result as any).sections || [] : []);
  const experienceParts: string[] = allSections
    .filter((s: any) => s.tailored)
    .map((s: any) => `${s.section}:\n${s.tailored}`);
  return {
    experience_summary: experienceParts.join("\n\n").slice(0, 8000),
    education_summary: allSections.find((s: any) => /education|training/i.test(s.section))?.tailored || "",
    languages_summary: allSections.find((s: any) => /language/i.test(s.section))?.tailored || "",
    strengths: allStrengths.slice(0, 4000),
    previous_matrix_matches: allMatches.slice(0, 40),
  };
}
