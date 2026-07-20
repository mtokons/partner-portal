import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/cv-maker/extract
 * Accepts a PDF/DOCX file upload, forwards it to the cv-tailor /parse endpoint,
 * then uses Gemini to structure the extracted text into CV fields.
 */

const TAILOR_API = process.env.CV_TAILOR_API_URL || "http://cv-tailor:8001";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Step 1: Parse document via cv-tailor service
  let rawText = "";
  try {
    const fd = new FormData();
    fd.append("file", file);
    const parseRes = await fetch(`${TAILOR_API}/parse`, {
      method: "POST",
      body: fd,
    });
    if (parseRes.ok) {
      const data = await parseRes.json();
      rawText = data.text || "";
    }
  } catch {
    // If cv-tailor is unavailable, try reading as text
    try {
      const buffer = await file.arrayBuffer();
      rawText = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    } catch {
      return NextResponse.json({ error: "Could not parse uploaded file" }, { status: 400 });
    }
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: "Could not extract any text from the uploaded file" }, { status: 400 });
  }

  // Step 2: Use Gemini to structure the raw text into CV fields
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Return basic extraction without AI
    return NextResponse.json({
      raw_text: rawText,
      structured: null,
      provider: "none",
    });
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const prompt = `You are an expert CV parser. Extract structured data from this CV text. Return ONLY a JSON object with these exact fields:
{
  "name": "<full name>",
  "title": "<current job title or professional title>",
  "email": "<email address>",
  "phone": "<phone number>",
  "address": "<full address>",
  "nationality": "<nationality if mentioned>",
  "birthDate": "<birth date if mentioned, format DD.MM.YYYY>",
  "website": "<website or LinkedIn URL if mentioned>",
  "profileSummary": "<professional summary or objective, 2-3 sentences>",
  "skills": ["<skill1>", "<skill2>", ...],
  "experience": [
    {"company": "<company>", "role": "<job title>", "period": "<start - end>", "details": "<key responsibilities and achievements>"}
  ],
  "education": [
    {"school": "<institution>", "degree": "<degree/qualification>", "period": "<start - end>"}
  ]
}

If a field is not found in the text, use an empty string or empty array. Do NOT invent data.

CV TEXT:
"""
${rawText.slice(0, 20000)}
"""`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ raw_text: rawText, structured: null, provider: "error" });
    }

    const j = await res.json();
    const raw = j?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    let parsed;
    try {
      let cleaned = raw.trim();
      const fence = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fence) cleaned = fence[1].trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ raw_text: rawText, structured: null, provider: "parse_error" });
    }

    return NextResponse.json({
      raw_text: rawText,
      structured: parsed,
      provider: "gemini",
    });
  } catch {
    return NextResponse.json({ raw_text: rawText, structured: null, provider: "error" });
  }
}
