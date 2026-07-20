"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Deliverable } from "@/lib/agents/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Wand2, Trash2, Save, CheckCircle2, StickyNote } from "lucide-react";
import { draftDeliverableAction, saveDeliverableAction, deleteDeliverableAction } from "../report-actions";

const PRESETS = ["Case Study", "Final Report", "Activity Summary", "Training Report", "Lessons Learned"];

export default function ReportsClient({ projectId, deliverables, provider }: { projectId: string; deliverables: Deliverable[]; provider: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [section, setSection] = useState("");
  const [sources, setSources] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  function draft() {
    setMsg("");
    if (!section.trim() || !sources.trim()) { setMsg("Enter a section and paste some source material."); return; }
    startTransition(async () => {
      try {
        const res = await draftDeliverableAction({ projectId, section, sources });
        setMsg(`Drafted "${section}" via ${res.provider}${res.editorNotes ? ` with ${res.editorNotes} editor note(s)` : ""}. Review below.`);
        setSection(""); setSources("");
        router.refresh();
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Draft failed");
      }
    });
  }

  function save(d: Deliverable, status: "draft" | "final") {
    setBusy(d.id);
    const draftText = edits[d.id] ?? d.draftText;
    startTransition(async () => {
      try { await saveDeliverableAction(d.id, { draftText, status }); router.refresh(); }
      catch (e) { alert(e instanceof Error ? e.message : "Save failed"); }
      finally { setBusy(null); }
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this draft?")) return;
    setBusy(id);
    startTransition(async () => {
      try { await deleteDeliverableAction(id); router.refresh(); } finally { setBusy(null); }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5" /> Draft a deliverable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="section">Section / deliverable</Label>
            <Input id="section" value={section} onChange={(e) => setSection(e.target.value)} placeholder="e.g. Case Study: Cohort 1 outcomes" />
            <div className="flex flex-wrap gap-1 pt-1">
              {PRESETS.map((p) => (
                <button key={p} type="button" onClick={() => setSection(p)} className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted">{p}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="sources">Source material</Label>
            <Textarea id="sources" value={sources} onChange={(e) => setSources(e.target.value)} rows={6} placeholder="Paste pilot data, session notes, interview summaries. The AI drafts only from this." />
          </div>
          <Button onClick={draft} disabled={pending} className="gap-2"><Wand2 className="h-4 w-4" /> {pending ? "Drafting…" : `Draft with ${provider}`}</Button>
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Drafts ({deliverables.length})</h2>
        {deliverables.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">No drafts yet.</p>
        ) : (
          deliverables.map((d) => (
            <Card key={d.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <CardTitle className="text-base">{d.section}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={d.status === "final" ? "default" : "outline"} className="capitalize">{d.status}</Badge>
                  {d.provider && <Badge variant="outline">{d.provider}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {d.editorNotes.length > 0 && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-3 text-sm">
                    <p className="flex items-center gap-1 font-medium text-amber-800"><StickyNote className="h-4 w-4" /> Editor notes</p>
                    <ul className="ml-5 list-disc text-amber-800">
                      {d.editorNotes.map((n, i) => <li key={i}>{n}</li>)}
                    </ul>
                  </div>
                )}
                <Textarea
                  defaultValue={d.draftText}
                  rows={10}
                  className="font-mono text-sm"
                  onChange={(e) => setEdits((s) => ({ ...s, [d.id]: e.target.value }))}
                />
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => remove(d.id)} className="gap-1"><Trash2 className="h-4 w-4 text-red-600" /> Delete</Button>
                  <Button size="sm" variant="outline" onClick={() => save(d, "draft")} disabled={pending && busy === d.id} className="gap-1"><Save className="h-4 w-4" /> Save</Button>
                  <Button size="sm" onClick={() => save(d, "final")} disabled={pending && busy === d.id} className="gap-1"><CheckCircle2 className="h-4 w-4" /> Mark final</Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
