// Lightweight rule-based career suggestion engine.
// Pure TypeScript — no external API call required for v1.
// Hooks exist to swap in a hosted LLM later by overriding `generateSuggestions`.

import type { Product } from "@/types";

export interface CareerSurveyInput {
  currentRole: string;
  yearsExperience: number;
  education: string[];
  skills: string[];
  goals: string[];
  industry: string;
}

export interface CareerSuggestion {
  productId?: string;
  productName: string;
  category: string;
  reason: string;
  score: number; // 0..1
}

export interface CareerProfileResult {
  profileSummary: string;
  suggestions: CareerSuggestion[];
  modelVersion: string;
  generatedAt: string;
}

const MODEL_VERSION = "rule-engine-v1";

function tokenize(values: string[]): Set<string> {
  return new Set(
    values
      .flatMap((v) => v.toLowerCase().split(/[\s,;/]+/))
      .map((v) => v.trim())
      .filter((v) => v.length > 1)
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function buildProductTokens(p: Product): Set<string> {
  return tokenize([
    p.name || "",
    p.category || "",
    (p as unknown as { description?: string }).description || "",
    (p as unknown as { tags?: string[] }).tags?.join(" ") || "",
  ]);
}

export function buildProfileSummary(input: CareerSurveyInput): string {
  const exp =
    input.yearsExperience >= 10
      ? "senior"
      : input.yearsExperience >= 5
      ? "mid-level"
      : input.yearsExperience >= 1
      ? "early-career"
      : "entry-level";
  const skills = input.skills.slice(0, 5).join(", ") || "general";
  const goals = input.goals.slice(0, 3).join("; ") || "career growth";
  return `${exp} ${input.currentRole || "professional"} in ${input.industry || "general"} with strengths in ${skills}. Goals: ${goals}.`;
}

/**
 * Score every catalog product against the survey input and return top N.
 * Pure function — easy to unit-test.
 */
export function scoreProducts(
  input: CareerSurveyInput,
  products: Product[],
  topN: number = 5
): CareerSuggestion[] {
  const userTokens = tokenize([
    ...input.skills,
    ...input.goals,
    input.industry,
    input.currentRole,
    ...input.education,
  ]);

  const scored: CareerSuggestion[] = products
    .filter((p) => (p as unknown as { status?: string }).status !== "archived")
    .map((p) => {
      const pt = buildProductTokens(p);
      const sim = jaccard(userTokens, pt);
      // Boost: if product category matches a stated goal token.
      const catBoost = userTokens.has((p.category || "").toLowerCase()) ? 0.15 : 0;
      const score = Math.min(1, sim + catBoost);
      const reason =
        score > 0
          ? `Matches ${Math.round(score * 100)}% of your stated skills, goals, and industry.`
          : "General recommendation based on your profile.";
      return {
        productId: p.id,
        productName: p.name,
        category: p.category || "",
        reason,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);

  return scored;
}

export async function generateSuggestions(
  input: CareerSurveyInput,
  products: Product[]
): Promise<CareerProfileResult> {
  const suggestions = scoreProducts(input, products, 5);
  return {
    profileSummary: buildProfileSummary(input),
    suggestions,
    modelVersion: MODEL_VERSION,
    generatedAt: new Date().toISOString(),
  };
}
