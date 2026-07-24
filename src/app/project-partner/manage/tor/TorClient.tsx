"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { TorDocument } from "@/lib/agents/contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSearch, Trash2, CheckCircle2, AlertTriangle, Wand2 } from "lucide-react";
import { uploadTorAction, approveTorAction, deleteTorAction } from "../tor-actions";

export default function TorClient({ projectId, docs, provider }: { projectId: string; docs: TorDocument[]; provider: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    const fd = new FormData(e.currentTarget);
    fd.set("projectId", projectId);
    startTransition(async () => {
      try {
        const res = await uploadTorAction(fd);
        if (res.error === "not_a_tor") setMsg(`This doesn't look like a ToR: ${res.detectedContent || "unrecognised content"}.`);
        else setMsg(`Extracted ${res.roleCount} expert role(s) via ${res.provider}. Review below, then approve to build the matrix.`);
        formRef.current?.reset();
        router.refresh();
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function approve(id: string) {
    setBusy(id);
    startTransition(async () => {
      try {
        const res = await approveTorAction(id);
        setMsg(`Created a CV form + evaluation matrix with ${res.criteria} criteria from ${res.roles} role(s). Open Evaluation Setup to fine-tune.`);
        router.refresh();
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Approve failed");
      } finally {
        setBusy(null);
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this ToR analysis?")) return;
    setBusy(id);
    startTransition(async () => {
      try { await deleteTorAction(id); router.refresh(); } finally { setBusy(null); }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><FileSearch className="h-5 w-5" /> Upload Terms of Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="tor">ToR file (PDF or DOCX)</Label>
              <Input id="tor" name="tor" type="file" accept=".pdf,.docx,.txt" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rawText">…or paste ToR text</Label>
              <Textarea id="rawText" name="rawText" rows={5} placeholder="Paste the Terms of Reference text here." />
            </div>
            <Button type="submit" disabled={pending} className="gap-2">
              <Wand2 className="h-4 w-4" /> {pending ? "Analyzing…" : `Analyze with ${provider}`}
            </Button>
          </form>
          {msg && <p className="mt-3 text-sm text-muted-foreground">{msg}</p>}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Analyzed ToRs ({docs.length})</h2>
        {docs.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">No ToR analyzed yet.</p>
        ) : (
          docs.map((d) => {
            const s = d.structure;
            const notTor = s?.error === "not_a_tor";
            return (
              <Card key={d.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base">{s?.projectTitle || d.fileName}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {s?.donor ? `${s.donor} · ` : ""}{d.fileName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={d.status === "approved" ? "default" : "outline"} className="capitalize">{d.status}</Badge>
                    {notTor && <Badge className="bg-red-100 text-red-800 gap-1"><AlertTriangle className="h-3 w-3" /> not a ToR</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notTor ? (
                    <p className="text-sm text-red-700">Detected instead: {s?.detectedContent || "unrecognised document"}.</p>
                  ) : (
                    <div className="space-y-3">
                      {(s?.expertRoles || []).map((role, ri) => (
                        <div key={ri} className="rounded-lg border p-3">
                          <p className="font-medium">{role.roleName}</p>
                          {role.mandatory.length > 0 && (
                            <div className="mt-1">
                              <p className="text-xs font-semibold text-muted-foreground">Mandatory</p>
                              <ul className="ml-4 list-disc text-sm">
                                {role.mandatory.map((q, qi) => (
                                  <li key={qi}>{q.text}{q.binary ? " " : ""}{q.durationYears ? ` (${q.durationYears}y)` : ""}{q.binary && <Badge className="ml-1 bg-slate-100 text-slate-700">pass/fail</Badge>}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {role.preferred.length > 0 && (
                            <div className="mt-1">
                              <p className="text-xs font-semibold text-muted-foreground">Preferred</p>
                              <ul className="ml-4 list-disc text-sm text-muted-foreground">
                                {role.preferred.map((q, qi) => <li key={qi}>{q.text}</li>)}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                      {(s?.deliverables?.length ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground"><span className="font-medium">Deliverables:</span> {s!.deliverables.join("; ")}</p>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => remove(d.id)} className="gap-1"><Trash2 className="h-4 w-4 text-red-600" /> Delete</Button>
                    {!notTor && (
                      <Button size="sm" disabled={(pending && busy === d.id) || d.status === "approved"} onClick={() => approve(d.id)} className="gap-1">
                        <CheckCircle2 className="h-4 w-4" /> {d.status === "approved" ? "Applied" : "Approve & build matrix"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
