import "server-only";
import { createHash } from "node:crypto";
import type { ZodType } from "zod";
import { activeAiProvider, type AiProvider } from "@/lib/ai";
import { createAgentRun } from "./agent-runs";
import type { AgentPersona, AgentRunStatus } from "./contracts";

interface ModelCall { text: string; model: string; tokensIn?: number; tokensOut?: number }

/** Low-level model call with a system + user prompt. Reuses the provider selected in ai.ts. */
async function callModel(system: string, user: string): Promise<ModelCall> {
  const provider = activeAiProvider();
  switch (provider) {
    case "gemini": {
      const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: user }] }],
          generationConfig: { temperature: 0, responseMimeType: "application/json" },
        }),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
      const j = await res.json();
      return {
        text: j?.candidates?.[0]?.content?.parts?.[0]?.text || "", model,
        tokensIn: j?.usageMetadata?.promptTokenCount, tokensOut: j?.usageMetadata?.candidatesTokenCount,
      };
    }
    case "claude": {
      const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, max_tokens: 1024, temperature: 0, system, messages: [{ role: "user", content: user }] }),
      });
      if (!res.ok) throw new Error(`Claude ${res.status}: ${await res.text()}`);
      const j = await res.json();
      return { text: j?.content?.[0]?.text || "", model, tokensIn: j?.usage?.input_tokens, tokensOut: j?.usage?.output_tokens };
    }
    case "openai": {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model, temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
      const j = await res.json();
      return { text: j?.choices?.[0]?.message?.content || "", model, tokensIn: j?.usage?.prompt_tokens, tokensOut: j?.usage?.completion_tokens };
    }
    case "perplexity": {
      const model = process.env.PERPLEXITY_MODEL || "sonar";
      const res = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
        body: JSON.stringify({ model, temperature: 0, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
      });
      if (!res.ok) throw new Error(`Perplexity ${res.status}: ${await res.text()}`);
      const j = await res.json();
      return { text: j?.choices?.[0]?.message?.content || "", model, tokensIn: j?.usage?.prompt_tokens, tokensOut: j?.usage?.completion_tokens };
    }
    default:
      return { text: "", model: "mock" };
  }
}

/** Rough per-1M-token USD rates for cost estimation (input, output). Configurable & approximate. */
const COST_RATES: Record<string, { in: number; out: number }> = {
  gemini: { in: 0.075, out: 0.30 },
  claude: { in: 3, out: 15 },
  openai: { in: 0.15, out: 0.60 },
  perplexity: { in: 1, out: 1 },
};

function estimateCost(provider: string, tokensIn?: number, tokensOut?: number): number {
  const rate = COST_RATES[provider];
  if (!rate) return 0;
  const cost = ((tokensIn || 0) / 1e6) * rate.in + ((tokensOut || 0) / 1e6) * rate.out;
  return Math.round(cost * 1e6) / 1e6; // 6dp
}

/** Strip markdown fences and parse the first JSON object/array. */
function parseJsonLoose<T>(text: string): T {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.search(/[[{]/);
  if (start > 0) t = t.slice(start);
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (end >= 0) t = t.slice(0, end + 1);
  return JSON.parse(t) as T;
}

export interface AgentResult<T> {
  data: T;
  provider: AiProvider;
  status: AgentRunStatus;
  runId: string;
}

/**
 * Run one agent invocation: schema-validated, one retry on invalid JSON, fully
 * audited. Falls back to `mock()` when no provider key is configured or the model
 * repeatedly fails — keeps builds/CI green without an API key.
 */
export async function runAgent<T>(opts: {
  persona: AgentPersona;
  promptVersion: string;
  system: string;
  user: string;
  schema: ZodType<T>;
  mock: () => T;
  contextRef?: string;
}): Promise<AgentResult<T>> {
  const provider = activeAiProvider();
  const inputHash = createHash("sha256").update(`${opts.promptVersion}\n${opts.system}\n${opts.user}`).digest("hex").slice(0, 32);
  const started = Date.now();

  async function log(status: AgentRunStatus, model: string, tokensIn?: number, tokensOut?: number) {
    return createAgentRun({
      persona: opts.persona, promptVersion: opts.promptVersion, provider, model,
      inputHash, tokensIn, tokensOut, costUsd: estimateCost(provider, tokensIn, tokensOut),
      latencyMs: Date.now() - started, status, contextRef: opts.contextRef,
    });
  }

  if (provider === "mock") {
    const runId = await log("mock", "mock");
    return { data: opts.mock(), provider, status: "mock", runId };
  }

  let lastModel = "unknown";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const call = await callModel(opts.system, attempt === 0 ? opts.user : `${opts.user}\n\nYour previous reply was not valid JSON. Return ONLY the JSON object.`);
      lastModel = call.model;
      const parsed = parseJsonLoose<unknown>(call.text);
      const result = opts.schema.safeParse(parsed);
      if (!result.success) {
        if (attempt === 0) continue;
        const runId = await log("schema_error", call.model, call.tokensIn, call.tokensOut);
        return { data: opts.mock(), provider, status: "schema_error", runId };
      }
      const runId = await log("ok", call.model, call.tokensIn, call.tokensOut);
      return { data: result.data, provider, status: "ok", runId };
    } catch (err) {
      if (attempt === 0) continue;
      console.error(`runAgent(${opts.persona}) failed`, err);
      const runId = await log("error", lastModel);
      return { data: opts.mock(), provider, status: "error", runId };
    }
  }
  const runId = await log("error", lastModel);
  return { data: opts.mock(), provider, status: "error", runId };
}
