import { describe, it, expect } from "vitest";
import { computeRoleFit, bestRoleFit, type RoleTemplate } from "../../src/lib/role-suitability";

const source: RoleTemplate = {
  key: "expert-2",
  name: "Key Expert 2",
  minPercent: 85,
  criteria: [
    { key: "education", category: "Education/Training", label: "Degree", maxPoints: 1 },
    { key: "gen_exp", category: "General Prof. Experience", label: "General", maxPoints: 4 },
    { key: "spec_exp", category: "Specific Prof. Experience", label: "Specific", maxPoints: 4 },
  ],
};

const targetA: RoleTemplate = {
  key: "pool-1",
  name: "International Pool",
  minPercent: 85,
  criteria: [
    { key: "education", category: "Education/Training", label: "Degree", maxPoints: 1 },
    { key: "gen_exp", category: "General Prof. Experience", label: "General", maxPoints: 3 },
    { key: "intl_exp", category: "International Experience", label: "Intl", maxPoints: 2 },
  ],
};

describe("computeRoleFit", () => {
  it("projects achieved fractions onto every target role", () => {
    const scores = [
      { key: "education", score: 1 }, // 100%
      { key: "gen_exp", score: 2 },   // 50%
      { key: "spec_exp", score: 4 },  // 100%
    ];
    const fits = computeRoleFit(scores, source, [source, targetA]);

    expect(fits).toHaveLength(2);
    const srcFit = fits.find((f) => f.roleKey === "expert-2")!;
    expect(srcFit.isSource).toBe(true);
    // source: (1 + 2 + 4) / (1+4+4) = 7/9 ≈ 77.8%
    expect(srcFit.percentage).toBeCloseTo(77.8, 1);

    const targetFit = fits.find((f) => f.roleKey === "pool-1")!;
    // education 100%*1=1, gen_exp 50%*3=1.5, intl_exp uses overall avg (1+0.5+1)/3=0.833*2=1.667
    // total ≈ 4.17 / 6 ≈ 69.4%
    expect(targetFit.percentage).toBeGreaterThan(60);
    expect(targetFit.percentage).toBeLessThan(75);
  });

  it("flags roles meeting the minimum percent", () => {
    const perfect = source.criteria.map((c) => ({ key: c.key, score: c.maxPoints }));
    const fits = computeRoleFit(perfect, source, [source, targetA]);
    expect(fits.every((f) => f.meets)).toBe(true);
  });

  it("bestRoleFit picks the highest percentage", () => {
    const scores = [
      { key: "education", score: 1 },
      { key: "gen_exp", score: 4 },
      { key: "spec_exp", score: 0 },
    ];
    const fits = computeRoleFit(scores, source, [source, targetA]);
    const best = bestRoleFit(fits)!;
    expect(best).toBeTruthy();
    expect(best.percentage).toBe(Math.max(...fits.map((f) => f.percentage)));
  });
});
