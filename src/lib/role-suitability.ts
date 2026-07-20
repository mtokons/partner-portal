import type { EvaluationCriterion } from "@/types";

export interface RoleTemplate {
  key: string;
  name: string;
  minPercent: number;
  criteria: EvaluationCriterion[];
}

export interface RoleFit {
  roleKey: string;
  roleName: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  meets: boolean;
  /** true when this is the role the expert originally applied/was evaluated for. */
  isSource: boolean;
}

/**
 * Estimate how well an expert fits every candidate role.
 *
 * The expert already has a real per-criterion evaluation for ONE role (the source
 * template). We project the achieved fraction per criterion key onto each target
 * role's criteria so partners can see, at a glance, which of the 3 roles suits the
 * expert best. Missing keys fall back to the expert's overall achieved fraction.
 */
export function computeRoleFit(
  achievedScores: { key: string; score: number }[],
  sourceTemplate: RoleTemplate,
  targetTemplates: RoleTemplate[],
): RoleFit[] {
  // Build achieved fraction per criterion key from the source template.
  const fractionByKey = new Map<string, number>();
  let sumFrac = 0;
  let counted = 0;
  for (const c of sourceTemplate.criteria) {
    if (c.maxPoints <= 0) continue;
    const got = achievedScores.find((s) => s.key === c.key)?.score ?? 0;
    const frac = Math.max(0, Math.min(1, got / c.maxPoints));
    fractionByKey.set(c.key, frac);
    sumFrac += frac;
    counted += 1;
  }
  const overallFraction = counted ? sumFrac / counted : 0;

  return targetTemplates.map((tpl) => {
    let total = 0;
    let max = 0;
    for (const c of tpl.criteria) {
      const frac = fractionByKey.has(c.key) ? fractionByKey.get(c.key)! : overallFraction;
      total += frac * c.maxPoints;
      max += c.maxPoints;
    }
    total = Math.round(total * 100) / 100;
    const percentage = max ? Math.round((total / max) * 1000) / 10 : 0;
    return {
      roleKey: tpl.key,
      roleName: tpl.name,
      totalScore: total,
      maxScore: max,
      percentage,
      meets: percentage >= tpl.minPercent,
      isSource: tpl.key === sourceTemplate.key,
    };
  });
}

/** The single best-fitting role (highest percentage; source role wins ties). */
export function bestRoleFit(fits: RoleFit[]): RoleFit | null {
  if (fits.length === 0) return null;
  return [...fits].sort((a, b) => b.percentage - a.percentage || Number(b.isSource) - Number(a.isSource))[0];
}
