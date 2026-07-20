import "server-only";
import type { CvFormField, EvaluationCriterion } from "@/types";

/**
 * Pluggable AI provider layer for the CV intake pipeline.
 * Provider is chosen via the AI_PROVIDER env var; when no key is configured it
 * falls back to a deterministic MOCK so the system always builds and runs.
 *
 * Supported: gemini | claude | openai | perplexity | mock
 */

export type AiProvider = "gemini" | "claude" | "openai" | "perplexity" | "mock";

export function activeAiProvider(): AiProvider {
  const p = (process.env.AI_PROVIDER || "").toLowerCase() as AiProvider;
  if (p === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (p === "claude" && process.env.ANTHROPIC_API_KEY) return "claude";
  if (p === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (p === "perplexity" && process.env.PERPLEXITY_API_KEY) return "perplexity";
  // auto-detect a single configured key when AI_PROVIDER unset
  if (!p) {
    if (process.env.GEMINI_API_KEY) return "gemini";
    if (process.env.ANTHROPIC_API_KEY) return "claude";
    if (process.env.OPENAI_API_KEY) return "openai";
    if (process.env.PERPLEXITY_API_KEY) return "perplexity";
  }
  return "mock";
}

/** Strip markdown code fences and parse the first JSON object/array found. */
function parseJsonLoose<T>(text: string): T {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.search(/[[{]/);
  if (start > 0) t = t.slice(start);
  // trim trailing noise after the final closing brace/bracket
  const lastObj = t.lastIndexOf("}");
  const lastArr = t.lastIndexOf("]");
  const end = Math.max(lastObj, lastArr);
  if (end >= 0) t = t.slice(0, end + 1);
  return JSON.parse(t) as T;
}

async function callProvider(prompt: string): Promise<string> {
  const provider = activeAiProvider();
  switch (provider) {
    case "gemini": {
      const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
      const j = await res.json();
      return j?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
    case "claude": {
      const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 2048, temperature: 0.2, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
      const j = await res.json();
      return j?.content?.[0]?.text || "";
    }
    case "openai": {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model, temperature: 0.2, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      const j = await res.json();
      return j?.choices?.[0]?.message?.content || "";
    }
    case "perplexity": {
      const model = process.env.PERPLEXITY_MODEL || "sonar";
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
        body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw new Error(`Perplexity ${res.status}: ${await res.text()}`);
      const j = await res.json();
      return j?.choices?.[0]?.message?.content || "";
    }
    default:
      return "";
  }
}

// ── CV → project-targeted form ──────────────────────────────────────────────

export interface CvExtractionResult {
  form: Record<string, string>;
  provider: AiProvider;
}

export async function extractCvForm(rawText: string, fields: CvFormField[]): Promise<CvExtractionResult> {
  const provider = activeAiProvider();
  if (provider === "mock" || !rawText.trim()) {
    return { form: mockExtract(rawText, fields), provider: "mock" };
  }
  const schema = fields.map((f) => `- "${f.key}" (${f.type}${f.required ? ", required" : ""}): ${f.label}${f.hint ? ` — ${f.hint}` : ""}`).join("\n");
  const prompt = `You are an expert recruitment analyst. Extract the following fields from the CV text and return ONLY a JSON object whose keys are exactly the field keys below. Use concise values; if a field is not found, use an empty string. Do not invent data.\n\nFields:\n${schema}\n\nCV TEXT:\n"""\n${rawText.slice(0, 18000)}\n"""\n\nReturn JSON only.`;
  try {
    const out = await callProvider(prompt);
    const parsed = parseJsonLoose<Record<string, string>>(out);
    const form: Record<string, string> = {};
    for (const f of fields) form[f.key] = String(parsed[f.key] ?? "").trim();
    return { form, provider };
  } catch {
    return { form: mockExtract(rawText, fields), provider: "mock" };
  }
}

// ── CV → evaluation scores ──────────────────────────────────────────────────

export interface CvScoringResult {
  scores: { key: string; score: number }[];
  provider: AiProvider;
}

export async function scoreCv(
  profileText: string,
  criteria: EvaluationCriterion[],
): Promise<CvScoringResult> {
  const provider = activeAiProvider();
  if (provider === "mock" || !profileText.trim()) {
    return { scores: mockScore(profileText, criteria), provider: "mock" };
  }
  const list = criteria.map((c) => `- "${c.key}" (max ${c.maxPoints}): [${c.category}] ${c.label}`).join("\n");
  const prompt = `You are an impartial evaluator scoring a candidate against fixed criteria. For each criterion award points between 0 and its max (one decimal allowed). Base the score strictly on evidence in the profile. Return ONLY a JSON array of objects {"key": string, "score": number}.\n\nCriteria:\n${list}\n\nCANDIDATE PROFILE:\n"""\n${profileText.slice(0, 16000)}\n"""\n\nReturn JSON array only.`;
  try {
    const out = await callProvider(prompt);
    const parsed = parseJsonLoose<{ key: string; score: number }[]>(out);
    const byKey = new Map(parsed.map((p) => [p.key, Number(p.score) || 0]));
    const scores = criteria.map((c) => ({ key: c.key, score: Math.max(0, Math.min(c.maxPoints, Math.round((byKey.get(c.key) ?? 0) * 100) / 100)) }));
    return { scores, provider };
  } catch {
    return { scores: mockScore(profileText, criteria), provider: "mock" };
  }
}

// ── Deterministic mock fallbacks ────────────────────────────────────────────

function mockExtract(rawText: string, fields: CvFormField[]): Record<string, string> {
  const text = rawText.replace(/\s+/g, " ").trim();
  const form: Record<string, string> = {};
  for (const f of fields) {
    if (f.type === "number") {
      const m = text.match(/(\d{1,2})\+?\s*(?:years|yrs)/i);
      form[f.key] = m ? m[1] : "";
    } else {
      // grab a sentence containing a keyword from the label
      const kw = f.label.split(/\s+/).find((w) => w.length > 4)?.toLowerCase() || "";
      const sentence = text.split(/(?<=[.!?])\s/).find((s) => kw && s.toLowerCase().includes(kw));
      form[f.key] = (sentence || "").slice(0, 240);
    }
  }
  return form;
}

const has = (t: string, kws: string[]) => kws.some((k) => t.includes(k));

function mockScore(profileText: string, criteria: EvaluationCriterion[]): { key: string; score: number }[] {
  const t = profileText.toLowerCase();
  const round25 = (n: number) => Math.round(n * 4) / 4;
  return criteria.map((c) => {
    const k = c.key.toLowerCase();
    let frac = 0.8;
    if (k.includes("education") || k.includes("lang")) frac = 1;
    else if (k.includes("gen") || k.includes("general")) frac = has(t, ["engineer", "energy", "safety", "industrial", "power"]) ? 1 : 0.8;
    else if (k.includes("spec")) frac = has(t, ["tvet", "competency", "curricul", "cbt", "standard", "cblm"]) ? 1 : 0.75;
    else if (k.includes("lead")) frac = has(t, ["principal", "director", "head", "lead", "manag", "coordinat"]) ? 1 : 0.7;
    else if (k.includes("country") || k.includes("region")) frac = has(t, ["bangladesh", "polytechnic", "dhaka", "south asia"]) ? 1 : 0.6;
    else if (k.includes("intl") || k.includes("international")) frac = has(t, ["australia", "singapore", "germany", "global", "international"]) ? 1 : 0.6;
    else if (k.includes("dev") || k.includes("coop")) frac = has(t, ["giz", "ilo", "adb", "world bank", "unicef", "donor", "development cooperation"]) ? 1 : 0.7;
    else frac = has(t, ["tot", "training of trainers", "cblm", "teaching", "gender", "inclusi"]) ? 1 : 0.7;
    return { key: c.key, score: round25(c.maxPoints * frac) };
  });
}
