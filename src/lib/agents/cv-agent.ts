import "server-only";
import { runAgent } from "./runtime";
import { CvProfileSchema, type CvProfile } from "./contracts";
import { CV_SYSTEM_PROMPT, CV_PROMPT_VERSION, buildCvUserPrompt } from "./prompts/cv.v1";

/** Deterministic mock used when no AI key is configured or the model fails. */
function mockCvProfile(rawText: string): CvProfile {
  const text = rawText.replace(/\s+/g, " ").trim();
  const nameMatch = text.match(/(?:^|\b)(?:Dr\.?|Mr\.?|Ms\.?|Mrs\.?)?\s*([A-Z][a-z]+\s[A-Z][a-z]+)/);
  const langs: { language: string; statedLevel: string | null }[] = [];
  for (const l of ["English", "Bangla", "German", "French", "Spanish"]) {
    const re = new RegExp(`${l}[^.,;]*?(C1|C2|B1|B2|A1|A2|mother tongue|native|fluent)?`, "i");
    const m = text.match(re);
    if (m) langs.push({ language: l, statedLevel: m[1] || null });
  }
  const yearsMatch = text.match(/(\d{1,2})\+?\s*years/i);
  const months = yearsMatch ? Number(yearsMatch[1]) * 12 : null;
  return {
    fullName: nameMatch ? nameMatch[1] : null,
    education: /degree|master|bachelor|university|diploma|phd/i.test(text)
      ? [{ title: (text.match(/((?:Master|Bachelor|PhD|Diploma)[^.,;]{0,60})/i)?.[1] || "Degree").trim(), institution: null, startDate: null, endDate: null, detail: null }]
      : [],
    training: /training|tot|course|workshop/i.test(text)
      ? [{ title: "Training (mock-detected)", institution: null, startDate: null, endDate: null, detail: null }]
      : [],
    languages: langs,
    professionalExperience: [{
      title: "Professional experience (mock summary)", org: null, startDate: null, endDate: null,
      durationMonths: months, durationEstimated: months === null,
      description: text.slice(0, 400), conflict: false,
    }],
    sectionConfidence: { education: 0.5, training: 0.4, languages: langs.length ? 0.6 : 0.3, professionalExperience: 0.45 },
  };
}

/** Persona 2: extract a structured, normalized CV profile from raw CV text. */
export async function extractCvProfile(rawText: string, opts?: { writingDate?: string; contextRef?: string }): Promise<{ profile: CvProfile; provider: string; runId: string }> {
  const { data, provider, runId } = await runAgent<CvProfile>({
    persona: "cv",
    promptVersion: CV_PROMPT_VERSION,
    system: CV_SYSTEM_PROMPT,
    user: buildCvUserPrompt(rawText, opts?.writingDate),
    schema: CvProfileSchema,
    mock: () => mockCvProfile(rawText),
    contextRef: opts?.contextRef,
  });
  return { profile: data, provider, runId };
}

/** Flatten a structured profile into evidence text the judge scores against.
 *  @param bangladeshProject When true, annotates each experience entry with
 *    [Bangladesh] or [International: <country>] so the judge can correctly
 *    credit non-Bangladesh experience as international experience. */
export function profileToExcerpts(profile: CvProfile, bangladeshProject?: boolean): string {
  const parts: string[] = [];
  if (profile.fullName) parts.push(`Name: ${profile.fullName}`);
  if (profile.education.length) parts.push("EDUCATION:\n" + profile.education.map((e) => `- ${e.title}${e.institution ? `, ${e.institution}` : ""}${e.endDate ? ` (${e.endDate})` : ""}`).join("\n"));
  if (profile.training.length) parts.push("TRAINING:\n" + profile.training.map((e) => `- ${e.title}${e.institution ? `, ${e.institution}` : ""}`).join("\n"));
  if (profile.languages.length) parts.push("LANGUAGES:\n" + profile.languages.map((l) => `- ${l.language}${l.statedLevel ? `: ${l.statedLevel}` : ""}`).join("\n"));
  if (profile.professionalExperience.length) {
    parts.push("PROFESSIONAL EXPERIENCE:\n" + profile.professionalExperience.map((x) => {
      const dur = x.durationMonths != null ? ` [${Math.round((x.durationMonths / 12) * 10) / 10} yrs${x.durationEstimated ? ", est." : ""}]` : "";
      let countryTag = "";
      if (bangladeshProject && x.country) {
        const isBD = /bangladesh|dhaka|chittagong|khulna|sylhet/i.test(x.country);
        countryTag = isBD ? " [Bangladesh]" : ` [International: ${x.country}]`;
      } else if (x.country) {
        countryTag = ` [${x.country}]`;
      }
      return `- ${x.title}${x.org ? ` @ ${x.org}` : ""}${x.startDate || x.endDate ? ` (${x.startDate || "?"}–${x.endDate || "?"})` : ""}${countryTag}${dur}: ${x.description}`;
    }).join("\n"));
  }
  return parts.join("\n\n").trim();
}
