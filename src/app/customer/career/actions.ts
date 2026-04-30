"use server";

import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { getProducts, getCareerProfile, upsertCareerProfile } from "@/lib/sharepoint";
import { generateSuggestions, type CareerSurveyInput } from "@/lib/ai-career";
import { revalidatePath } from "next/cache";

export async function fetchMyCareerProfile() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return getCareerProfile(session.user.id);
}

export async function submitCareerSurveyAction(input: CareerSurveyInput) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const user = session.user as SessionUser;

  // Light validation at the system boundary.
  if (typeof input.yearsExperience !== "number" || input.yearsExperience < 0 || input.yearsExperience > 80) {
    throw new Error("yearsExperience must be between 0 and 80");
  }
  const cleaned: CareerSurveyInput = {
    currentRole: String(input.currentRole || "").slice(0, 200),
    yearsExperience: Math.floor(input.yearsExperience),
    education: (input.education || []).slice(0, 20).map((s) => String(s).slice(0, 200)),
    skills: (input.skills || []).slice(0, 50).map((s) => String(s).slice(0, 100)),
    goals: (input.goals || []).slice(0, 20).map((s) => String(s).slice(0, 200)),
    industry: String(input.industry || "").slice(0, 200),
  };

  const products = await getProducts();
  const result = await generateSuggestions(cleaned, products);

  await upsertCareerProfile({
    userId: user.id,
    userName: user.name || "",
    email: user.email || "",
    currentRole: cleaned.currentRole,
    yearsExperience: cleaned.yearsExperience,
    education: cleaned.education,
    skills: cleaned.skills,
    goals: cleaned.goals,
    industry: cleaned.industry,
    profile: result.profileSummary,
    suggestions: JSON.stringify(result.suggestions),
    lastModelVersion: result.modelVersion,
    generatedAt: result.generatedAt,
    updatedAt: new Date().toISOString(),
  });

  revalidatePath("/customer/career");
  return result;
}
