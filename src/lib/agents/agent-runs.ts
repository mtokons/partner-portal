import "server-only";
import type { AgentRunRecord } from "./contracts";

const AGENT_RUNS_LIST = "AgentRuns";

/**
 * Persist one agent invocation for reproducibility + defensibility.
 * Never throws — audit logging must not break the scoring pipeline.
 */
export async function createAgentRun(data: Omit<AgentRunRecord, "id" | "createdAt">): Promise<string> {
  try {
    const { graphPost, getSiteListUrlAsync } = await import("@/lib/graph");
    const now = new Date().toISOString();
    const res = await graphPost<{ id: string }>(await getSiteListUrlAsync(AGENT_RUNS_LIST), {
      fields: {
        Title: `${data.persona}:${data.status}`,
        Persona: data.persona,
        PromptVersion: data.promptVersion,
        Provider: data.provider,
        Model: data.model,
        InputHash: data.inputHash,
        TokensIn: data.tokensIn ?? 0,
        TokensOut: data.tokensOut ?? 0,
        CostUsd: data.costUsd ?? 0,
        LatencyMs: data.latencyMs,
        Status: data.status,
        ContextRef: data.contextRef || "",
        CreatedAt: now,
      },
    });
    return res.id;
  } catch (err) {
    console.error("createAgentRun failed (non-fatal)", err);
    return "";
  }
}

interface SpItem<T> { id: string; fields: T }

function mapRun(item: SpItem<Record<string, string>>): AgentRunRecord {
  const f = item.fields;
  return {
    id: item.id,
    persona: (f.Persona as AgentRunRecord["persona"]) || "judge",
    promptVersion: f.PromptVersion || "",
    provider: f.Provider || "",
    model: f.Model || "",
    inputHash: f.InputHash || "",
    tokensIn: Number(f.TokensIn) || 0,
    tokensOut: Number(f.TokensOut) || 0,
    costUsd: Number(f.CostUsd) || 0,
    latencyMs: Number(f.LatencyMs) || 0,
    status: (f.Status as AgentRunRecord["status"]) || "ok",
    contextRef: f.ContextRef || "",
    createdAt: f.CreatedAt || "",
  };
}

export async function getRecentAgentRuns(limit = 50): Promise<AgentRunRecord[]> {
  const { graphGetSafe, getSiteListUrlAsync } = await import("@/lib/graph");
  const base = await getSiteListUrlAsync(AGENT_RUNS_LIST);
  const res = await graphGetSafe<{ value: SpItem<Record<string, string>>[] }>(`${base}?$expand=fields&$top=${limit}`);
  return (res?.value || []).map(mapRun).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}
