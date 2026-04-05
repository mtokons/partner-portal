"use client";

import { useState } from "react";
import {
  RefreshCw, Plus, Pencil, Trash2, CheckCircle2, XCircle,
  Loader2, AlertTriangle, Database, Wifi, WifiOff, ChevronDown, ChevronUp,
} from "lucide-react";

interface SpItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  partnerId: string;
  createdAt: string;
}

interface ApiResult {
  ok: boolean;
  status?: number;
  data?: unknown;
  error?: string;
  durationMs?: number;
}

function ResultBox({ result, label }: { result: ApiResult | null; label: string }) {
  const [expanded, setExpanded] = useState(true);
  if (!result) return null;
  return (
    <div className={`rounded-2xl border text-sm overflow-hidden ${result.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
      <div
        className={`flex items-center justify-between px-4 py-2.5 cursor-pointer ${result.ok ? "bg-emerald-100/70" : "bg-red-100/70"}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {result.ok
            ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            : <XCircle className="h-4 w-4 text-red-500" />
          }
          <span className={`font-semibold text-xs ${result.ok ? "text-emerald-700" : "text-red-700"}`}>
            {label} — {result.ok ? "SUCCESS" : "FAILED"} {result.durationMs ? `(${result.durationMs}ms)` : ""}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      {expanded && (
        <pre className="px-4 py-3 text-xs overflow-x-auto whitespace-pre-wrap font-mono text-gray-700 max-h-72 overflow-y-auto">
          {result.error || JSON.stringify(result.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function SpTestClient() {
  const [loading, setLoading] = useState<string | null>(null);
  const [items, setItems] = useState<SpItem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [results, setResults] = useState<Record<string, ApiResult>>({});

  // Note: SP_TEST_LIVE is server-side only; we detect mode from API response
  const [mode, setMode] = useState<"unknown" | "live" | "mock">("unknown");

  // Helper to call the test API
  async function callApi(action: string, body?: Record<string, unknown>): Promise<ApiResult> {
    const start = Date.now();
    setLoading(action);
    try {
      const res = await fetch("/api/sp-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json() as Record<string, unknown>;
      // Detect live vs mock from API response
      if (data.mode === "mock") setMode("mock");
      else if (res.ok) setMode("live");
      const result: ApiResult = {
        ok: res.ok && !data.error,
        status: res.status,
        data,
        error: data.error as string | undefined,
        durationMs: Date.now() - start,
      };
      setResults((prev) => ({ ...prev, [action]: result }));
      return result;
    } catch (err) {
      const result: ApiResult = { ok: false, error: String(err), durationMs: Date.now() - start };
      setResults((prev) => ({ ...prev, [action]: result }));
      return result;
    } finally {
      setLoading(null);
    }
  }

  async function handleRead() {
    const res = await callApi("read");
    if (res.ok && Array.isArray((res.data as any)?.items)) {
      setItems((res.data as any).items);
      if ((res.data as any).items.length > 0) {
        setSelectedId((res.data as any).items[0].id);
      }
    }
  }

  async function handleCreate() {
    const res = await callApi("create", {
      name: "Test Entry " + Date.now().toString().slice(-4),
      email: `test${Date.now().toString().slice(-4)}@example.com`,
      phone: "+49 151 000 0000",
      address: "Test Street 1, Berlin",
    });
    if (res.ok) await handleRead();
  }

  async function handleUpdate() {
    if (!selectedId) return;
    await callApi("update", {
      id: selectedId,
      phone: "+49 000 UPDATED-" + new Date().toLocaleTimeString(),
    });
    await handleRead();
  }

  async function handleDelete() {
    if (!selectedId) return;
    await callApi("delete", { id: selectedId });
    setSelectedId("");
    await handleRead();
  }

  const ops = [
    { key: "read",   label: "Fetch All",    icon: RefreshCw,   color: "bg-blue-500 hover:bg-blue-600",       fn: handleRead,   desc: "GET items from SCCG Client list" },
    { key: "create", label: "Create Test",  icon: Plus,        color: "bg-emerald-500 hover:bg-emerald-600", fn: handleCreate, desc: "POST a new test entry" },
    { key: "update", label: "Update Phone", icon: Pencil,      color: "bg-amber-500 hover:bg-amber-600",     fn: handleUpdate, desc: "PATCH phone of selected item" },
    { key: "delete", label: "Delete",       icon: Trash2,      color: "bg-red-500 hover:bg-red-600",         fn: handleDelete, desc: "DELETE selected item permanently" },
  ];

  return (
    <div className="space-y-7 page-enter max-w-4xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Developer Tools</p>
        </div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">SharePoint CRUD Test</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Test real Microsoft Graph API calls to your SharePoint <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">Clients</code> list.
          This page is admin-only and does not affect other portal views.
        </p>
      </div>

      {/* Mode indicator */}
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border ${
        mode === "live"  ? "bg-emerald-50 border-emerald-200" :
        mode === "mock"  ? "bg-amber-50 border-amber-200" :
                           "bg-muted/40 border-border"
      }`}>
        {mode === "live"
          ? <Wifi    className="h-5 w-5 text-emerald-500 shrink-0" />
          : <WifiOff className="h-5 w-5 text-amber-500 shrink-0" />
        }
        <div>
          <p className={`text-sm font-semibold ${
            mode === "live" ? "text-emerald-800" : mode === "mock" ? "text-amber-800" : "text-foreground"
          }`}>
            {mode === "live"    ? "🟢 Live Mode — Reading from SCCG Client on SharePoint" :
             mode === "mock"    ? "🟡 Mock Mode — No real SharePoint calls" :
                                  "⚪ Click 'Fetch All' to detect mode"}
          </p>
          <p className="text-xs mt-0.5 text-muted-foreground">
            {mode === "live" ? "CRUD operations read/write your real 'SCCG Client' SharePoint list" :
             mode === "mock" ? "Set SP_TEST_LIVE=true in .env.local to enable live SharePoint" :
                               "Mode will be shown automatically after first API call"}
          </p>
        </div>
      </div>

      {/* Config checklist */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Configuration Checklist</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            { label: "AZURE_AD_TENANT_ID", done: true },
            { label: "AZURE_AD_CLIENT_ID", done: true },
            { label: "AZURE_AD_CLIENT_SECRET", done: true },
            { label: "SHAREPOINT_SITE_ID (resolved)", done: true },
            { label: "SP_TEST_LIVE=true", done: mode === "live" },
            { label: "'SCCG Client' list reachable", done: mode === "live" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className={`h-4 w-4 rounded border flex items-center justify-center text-[10px] font-bold ${
                item.done ? "bg-emerald-100 border-emerald-300 text-emerald-600" : "border-border text-muted-foreground"
              }`}>{item.done ? "✓" : "○"}</span>
              <code className={`font-mono text-xs ${item.done ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</code>
            </div>
          ))}
        </div>
      </div>

      {/* CRUD Buttons */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">CRUD Operations</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {ops.map((op) => (
            <button
              key={op.key}
              onClick={op.fn}
              disabled={loading !== null}
              className={`flex flex-col items-start gap-2 p-4 rounded-2xl text-white ${op.color} transition-all disabled:opacity-60 disabled:cursor-not-allowed relative overflow-hidden`}
            >
              <div className="absolute inset-0 bg-white/0 hover:bg-white/10 transition-all" />
              <div className="flex items-center gap-2 relative z-10">
                {loading === op.key
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <op.icon className="h-4 w-4" />
                }
                <span className="text-sm font-bold">{op.label}</span>
              </div>
              <p className="text-[10px] text-white/70 relative z-10 leading-tight">{op.desc}</p>
            </button>
          ))}
        </div>
        {items.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <p className="text-xs text-muted-foreground">Target for update/delete:</p>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-xl border border-border bg-muted/40 outline-none focus:ring-2 focus:ring-primary/20"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  #{item.id} — {item.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Items preview */}
      {items.length > 0 && (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{items.length} items fetched from SharePoint</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {["SP ID", "Full Name", "Email", "Phone", "Address"].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-border/40 cursor-pointer transition-colors ${item.id === selectedId ? "bg-primary/5" : "hover:bg-muted/30"}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">#{item.id}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.email || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{item.phone || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-[180px] truncate">{item.address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Results */}
      {Object.keys(results).length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">API Response Log</p>
          {Object.entries(results)
            .reverse()
            .map(([key, result]) => (
              <ResultBox key={key} result={result} label={key.toUpperCase()} />
            ))
          }
        </div>
      )}

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          <strong>Delete is permanent.</strong> When in Live Mode, deleting an item removes it from your actual SharePoint list immediately.
          Test with dummy data first.
        </p>
      </div>
    </div>
  );
}
