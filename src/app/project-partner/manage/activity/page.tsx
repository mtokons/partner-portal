import { requirePpmsManager } from "@/lib/ppms-guard";
import { getRecentAgentRuns } from "@/lib/agents/agent-runs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const PERSONA_LABEL: Record<string, string> = { tor: "ToR", cv: "CV", judge: "Judge", report: "Report" };

function statusBadge(status: string) {
  if (status === "ok") return <Badge className="bg-emerald-100 text-emerald-800">ok</Badge>;
  if (status === "mock") return <Badge className="bg-slate-100 text-slate-700">mock</Badge>;
  return <Badge className="bg-red-100 text-red-800">{status}</Badge>;
}

export default async function AiActivityPage() {
  await requirePpmsManager();
  const runs = await getRecentAgentRuns(100);

  const totalTokens = runs.reduce((s, r) => s + (r.tokensIn || 0) + (r.tokensOut || 0), 0);
  const totalCost = runs.reduce((s, r) => s + (r.costUsd || 0), 0);
  const avgLatency = runs.length ? Math.round(runs.reduce((s, r) => s + r.latencyMs, 0) / runs.length) : 0;
  const okRate = runs.length ? Math.round((runs.filter((r) => r.status === "ok").length / runs.length) * 100) : 0;
  const byPersona = runs.reduce<Record<string, number>>((m, r) => { m[r.persona] = (m[r.persona] || 0) + 1; return m; }, {});

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">AI Activity</h1>
        <p className="text-sm text-muted-foreground">Every AI agent call is logged for reproducibility and cost tracking — model, prompt version, tokens, latency and outcome.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Kpi label="Recent runs" value={String(runs.length)} />
        <Kpi label="Success rate" value={`${okRate}%`} accent="text-emerald-600" />
        <Kpi label="Total tokens" value={totalTokens.toLocaleString()} />
        <Kpi label="Est. cost" value={`$${totalCost.toFixed(4)}`} />
        <Kpi label="Avg latency" value={`${avgLatency} ms`} />
      </div>

      {Object.keys(byPersona).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byPersona).map(([p, n]) => (
            <Badge key={p} variant="outline">{PERSONA_LABEL[p] || p}: {n}</Badge>
          ))}
        </div>
      )}

      {runs.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No AI runs recorded yet. Analyze a ToR or score a CV to populate this log.</p>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Prompt</TableHead>
                <TableHead>Provider / Model</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Latency</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Context</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</TableCell>
                  <TableCell><Badge variant="outline">{PERSONA_LABEL[r.persona] || r.persona}</Badge></TableCell>
                  <TableCell className="text-xs">{r.promptVersion}</TableCell>
                  <TableCell className="text-xs">{r.provider}{r.model && r.model !== r.provider ? ` · ${r.model}` : ""}</TableCell>
                  <TableCell className="text-right text-xs">{((r.tokensIn || 0) + (r.tokensOut || 0)).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-xs">{r.latencyMs} ms</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground" title={r.contextRef}>{r.contextRef || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${accent || ""}`}>{value}</p>
    </div>
  );
}
