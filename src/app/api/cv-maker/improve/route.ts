import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/cv-maker/improve
 * Body: { text: string, field: "summary" | "experience" | "full" }
 * Uses Gemini to rewrite/improve the given text for ATS optimization.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { text, field = "summary", cvData, jobDescription, roleTitle, companyName } = body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  let prompt = "";
  if (field === "summary") {
    prompt = `You are an expert CV writer and ATS optimization specialist. Rewrite this professional summary to be more impactful, ATS-friendly, and compelling. Keep it concise (2-3 sentences). Use action verbs and quantifiable achievements where possible. Return ONLY a JSON object: {"improved": "<improved text>"}

Original text:
"""
${text}
"""`;
  } else if (field === "experience") {
    prompt = `You are an expert CV writer. Improve this job description to be more impactful with action verbs and quantifiable results. Keep the same meaning but make it more professional. Return ONLY a JSON object: {"improved": "<improved text>"}

Original text:
"""
${text}
"""`;
  } else if (field === "inline_bullet") {
    prompt = `You are an expert CV developer. Optimize or generate high-impact professional bullet points for this work experience entry.
Role: ${roleTitle || "Specialist"}
Company: ${companyName || "Company"}
Existing text:
"""
${text}
"""

Focus on:
1. Using strong action verbs (e.g. spearheaded, engineered, optimized).
2. Adding quantifiable results/metrics if context implies them (e.g. "improving performance by 20%").
3. Decoupling design details from content.
4. Outputting a clean bulleted list (separated by newlines or bullets).

Return ONLY a JSON object: {"improved": "<improved bullet points>"}`;
  } else if (field === "ats_check") {
    const cvJson = JSON.stringify(cvData || {});
    prompt = `You are an expert ATS (Applicant Tracking System) parser and CV matcher. Compare the following CV with the target Job Description.
Evaluate formatting parser issues, keyword density, semantic fit, and missing skills.

Job Description:
"""
${jobDescription || ""}
"""

CV Data:
"""
${cvJson}
"""

Return ONLY a JSON object containing:
{
  "overall_score": <number 0-100 representing semantic and keyword matching fit>,
  "matched_keywords": ["<keyword1>", "<keyword2>", ...],
  "missing_keywords": ["<keyword1>", "<keyword2>", ...],
  "suggestions": ["<actionable suggestion 1>", "<actionable suggestion 2>", ...],
  "formatting_issues": ["<format check 1 (e.g. multi-column caution or visual charts alert if present)>", ...]
}`;
  } else if (field === "full") {
    // Full CV improvement - returns improved summary + skills suggestions
    const cvJson = JSON.stringify(cvData || {});
    prompt = `You are an expert CV writer and career coach. Analyze this CV data and provide improvements. Return ONLY a JSON object with:
{
  "improved_summary": "<improved professional summary, 2-3 powerful sentences>",
  "suggested_skills": ["<skill1>", "<skill2>", ...up to 8 relevant skills],
  "experience_tips": ["<tip1>", "<tip2>", "<tip3>"],
  "overall_score": <number 1-100>,
  "ats_score": <number 1-100>,
  "suggestions": ["<suggestion1>", "<suggestion2>", "<suggestion3>"]
}

CV Data:
"""
${cvJson}
"""`;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Gemini ${res.status}: ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const j = await res.json();
    const raw = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    let parsed;
    try {
      let cleaned = raw.trim();
      const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fence) cleaned = fence[1].trim();
      parsed = JSON.parse(cleaned);

      // Check if nested string is JSON
      if (parsed.improved && typeof parsed.improved === "string" && parsed.improved.trim().startsWith("{")) {
        try {
          const nested = JSON.parse(parsed.improved);
          if (nested.improved) parsed.improved = nested.improved;
        } catch {}
      }
    } catch {
      // Fallback: extract content via regex
      let extracted = raw.trim();
      const m = raw.match(/"improved"\s*:\s*"([\s\S]*?)"\s*}/);
      if (m) {
        extracted = m[1];
      } else {
        // Strip keys manually if they leaked
        extracted = raw.replace(/\{\s*"improved"\s*:\s*"/i, "")
                       .replace(/"\s*\}$/, "")
                       .replace(/\\"/g, '"');
      }
      parsed = { improved: extracted.trim(), error: "Regex parsed" };
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
