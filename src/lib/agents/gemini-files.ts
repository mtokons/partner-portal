import "server-only";

/**
 * Gemini File API helper — upload PDFs/DOCX and get a persistent URI that
 * can be used in place of pasted text for grounded, hallucination-resistant
 * extraction and scoring.
 *
 * This is the open equivalent of NotebookLM: the model answers only from
 * the uploaded documents. Files live for 48 h; URIs are cached in AgentRuns.
 */

interface GeminiFile {
  name: string;
  displayName: string;
  uri: string;
  mimeType: string;
  state: "PROCESSING" | "ACTIVE" | "FAILED";
}

const BASE = "https://generativelanguage.googleapis.com";

function key(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("GEMINI_API_KEY not set");
  return k;
}

/** Upload a Buffer to the Gemini File API and return file metadata. */
export async function uploadGeminiFile(
  content: Buffer,
  fileName: string,
  mimeType: string,
  displayName?: string,
): Promise<GeminiFile> {
  const boundary = "---GeminiBoundary";
  const meta = JSON.stringify({ file: { displayName: displayName || fileName } });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
    Buffer.from(meta),
    Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
    content,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const res = await fetch(`${BASE}/upload/v1beta/files?key=${key()}`, {
    method: "POST",
    headers: {
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "X-Goog-Upload-Protocol": "multipart",
    },
    body,
  });
  if (!res.ok) throw new Error(`Gemini upload error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.file as GeminiFile;
}

/** Poll until the file reaches ACTIVE state (max 60 s). */
export async function waitForFile(file: GeminiFile, timeoutMs = 60_000): Promise<GeminiFile> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/v1beta/${file.name}?key=${key()}`);
    if (!res.ok) throw new Error(`File poll error ${res.status}`);
    const meta = (await res.json()) as GeminiFile;
    if (meta.state === "ACTIVE") return meta;
    if (meta.state === "FAILED") throw new Error("Gemini file processing FAILED");
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`File not ACTIVE after ${timeoutMs / 1000}s`);
}

/** List all live Gemini files for this API key. */
export async function listGeminiFiles(): Promise<GeminiFile[]> {
  const res = await fetch(`${BASE}/v1beta/files?key=${key()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.files || []) as GeminiFile[];
}

/** Delete a Gemini file by its name (e.g. "files/abc123"). */
export async function deleteGeminiFile(name: string): Promise<void> {
  await fetch(`${BASE}/v1beta/${name}?key=${key()}`, { method: "DELETE" });
}

interface FilePart { mime_type: string; file_uri: string }

/**
 * Call Gemini with one or more uploaded file URIs as grounded context.
 * The model can only answer from what is in the files — equivalent to NotebookLM.
 */
export async function callGeminiGrounded(prompt: string, files: FilePart[]): Promise<string> {
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
  const parts = [
    ...files.map((f) => ({ fileData: { mimeType: f.mime_type, fileUri: f.file_uri } })),
    { text: prompt },
  ];
  const res = await fetch(
    `${BASE}/v1beta/models/${model}:generateContent?key=${key()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini grounded error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
