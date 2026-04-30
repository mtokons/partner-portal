import { describe, it, expect } from "vitest";
import { scoreProducts, buildProfileSummary } from "../../src/lib/ai-career";
import type { Product } from "../../src/types";

const products: Product[] = [
  { id: "p1", name: "German A1 Course", category: "Language", description: "German for beginners" } as unknown as Product,
  { id: "p2", name: "JavaScript Bootcamp", category: "Tech", description: "Learn React and Node" } as unknown as Product,
  { id: "p3", name: "Study Abroad Counselling", category: "Counselling", description: "Germany study planning" } as unknown as Product,
];

describe("ai-career.scoreProducts", () => {
  it("ranks the German course higher for a German-learning goal", () => {
    const res = scoreProducts(
      {
        currentRole: "Student",
        yearsExperience: 0,
        education: ["High School"],
        skills: ["English"],
        goals: ["learn german", "study abroad in germany"],
        industry: "Education",
      },
      products,
      3
    );
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].productName).toMatch(/German|Study Abroad/);
  });

  it("ranks the JS bootcamp higher for a tech-skilled developer", () => {
    const res = scoreProducts(
      {
        currentRole: "Software Engineer",
        yearsExperience: 3,
        education: ["BSc Computer Science"],
        skills: ["javascript", "react", "node"],
        goals: ["become senior engineer"],
        industry: "Tech",
      },
      products,
      3
    );
    expect(res[0].productName).toBe("JavaScript Bootcamp");
  });
});

describe("ai-career.buildProfileSummary", () => {
  it("labels >=10 years as senior", () => {
    const s = buildProfileSummary({
      currentRole: "Manager",
      yearsExperience: 12,
      education: [],
      skills: [],
      goals: [],
      industry: "Finance",
    });
    expect(s.toLowerCase()).toContain("senior");
  });
});
