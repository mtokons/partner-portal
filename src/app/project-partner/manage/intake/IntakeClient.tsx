"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import type { Project, CvFormTemplate, ExpertCvIntake } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Trash2, Upload, BarChart3, ShieldCheck, RefreshCw } from "lucide-react";
import Link from "next/link";
import { uploadAndExtractAction, updateIntakeAction, deleteIntakeAction, replaceCvAction } from "../actions";
import { runJudgeScoringAction } from "../agent-actions";

interface Props {
  project: Project;
  cvForm: CvFormTemplate | null;
  hasEvalTemplate: boolean;
  intakes: ExpertCvIntake[];
  provider: string;
}

export default function IntakeClient({ project, cvForm, hasEvalTemplate, intakes, provider }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const reviewHref = pathname.replace(/\/intake$/, "/review");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState("");
  const [reviewHint, setReviewHint] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replaceId, setReplaceId] = useState<string | null>(null);

  function submitUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    const fd = new FormData(e.currentTarget);
    fd.set("projectId", project.id);
    startTransition(async () => {
      try {
        const res = await uploadAndExtractAction(fd);
        setMsg(`Extracted via ${res.provider}. Review the form below, then score & publish.`);
        formRef.current?.reset();
        router.refresh();
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Upload failed");
      }
    });
  }

  function score(id: string) {
    setBusyId(id);
    setReviewHint(false);
    startTransition(async () => {
      try {
        const res = await runJudgeScoringAction(id);
        if (res.needsReview > 0) {
          setReviewHint(true);
          setMsg(`Scored ${res.percentage}% via ${res.provider}. ${res.needsReview} of ${res.total} criteria need human review before publishing.`);
        } else {
          setMsg(`Scored ${res.percentage}% (${res.passed ? "PASS" : "FAIL"}) via ${res.provider}. All ${res.total} criteria verified — published.`);
        }
        router.refresh();
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Scoring failed");
      } finally {
        setBusyId(null);
      }
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this CV intake?")) return;
    setBusyId(id);
    startTransition(async () => {
      try {
        await deleteIntakeAction(id);
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  function saveField(intake: ExpertCvIntake, key: string, value: string) {
    const form = { ...intake.form, [key]: value };
    startTransition(async () => {
      await updateIntakeAction(intake.id, { form });
      router.refresh();
    });
  }

  function replaceCv(e: React.FormEvent<HTMLFormElement>, intakeId: string) {
    e.preventDefault();
    setMsg("");
    const fd = new FormData(e.currentTarget);
    fd.set("intakeId", intakeId);
    setBusyId(intakeId);
    startTransition(async () => {
      try {
        const res = await replaceCvAction(fd);
        setMsg(`Replaced CV and re-mapped ${res.fields} field(s) via ${res.provider}. Review the fields, then re-score.`);
        setReplaceId(null);
        router.refresh();
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "Replace failed");
      } finally {
        setBusyId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg"><Upload className="h-5 w-5" /> Upload CV</CardTitle>
        </CardHeader>
        <CardContent>
          {!cvForm && (
            <p className="mb-3 rounded-md bg-amber-50 p-3 text-sm text-amber-700">
              No CV form configured for this project — extraction will be skipped. Set one up in Evaluation Setup first.
            </p>
          )}
          <form ref={formRef} onSubmit={submitUpload} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="expertName">Expert name</Label>
                <Input id="expertName" name="expertName" placeholder="Auto-detected if blank" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="position">Position</Label>
                <Input id="position" name="position" placeholder="e.g. Key Expert 2" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="cv">CV file (PDF or DOCX)</Label>
              <Input id="cv" name="cv" type="file" accept=".pdf,.docx,.txt" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rawText">…or paste CV text</Label>
              <Textarea id="rawText" name="rawText" rows={4} placeholder="Paste the CV text here if you don't have a file." />
            </div>
            <Button type="submit" disabled={pending} className="gap-2">
              <Sparkles className="h-4 w-4" /> {pending ? "Processing…" : `Extract with ${provider}`}
            </Button>
          </form>
          {msg && (
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-muted-foreground">{msg}</p>
              {reviewHint && (
                <Link href={reviewHref} className="inline-flex items-center gap-1 font-medium text-amber-700 hover:underline">
                  <ShieldCheck className="h-4 w-4" /> Open Scoring Review
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Candidates ({intakes.length})</h2>
        {intakes.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">No CVs processed yet.</p>
        ) : (
          intakes.map((it) => (
            <Card key={it.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  {it.expertName}
                  {it.position && <span className="ml-2 text-sm font-normal text-muted-foreground">· {it.position}</span>}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={it.status === "published" ? "default" : "outline"} className="capitalize">{it.status}</Badge>
                  {it.aiProvider && <Badge variant="outline">{it.aiProvider}</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {it.profile && (
                  <details className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <summary className="cursor-pointer font-medium">
                      Parsed CV profile
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {it.profile.education?.length || 0} education · {it.profile.professionalExperience?.length || 0} experience · {it.profile.languages?.length || 0} languages
                      </span>
                    </summary>
                    <div className="mt-2 space-y-2">
                      {(it.profile.languages?.length ?? 0) > 0 && (
                        <p className="text-xs"><span className="font-medium">Languages:</span> {it.profile.languages.map((l) => `${l.language}${l.statedLevel ? ` (${l.statedLevel})` : ""}`).join(", ")}</p>
                      )}
                      {(it.profile.professionalExperience?.length ?? 0) > 0 && (
                        <ul className="space-y-1 text-xs text-muted-foreground">
                          {it.profile.professionalExperience.slice(0, 6).map((x, i) => (
                            <li key={i}>
                              <span className="font-medium text-foreground">{x.title}</span>{x.org ? ` @ ${x.org}` : ""}
                              {x.durationMonths != null ? ` — ${Math.round((x.durationMonths / 12) * 10) / 10} yrs` : x.durationEstimated ? " — duration est." : ""}
                              {x.conflict && <Badge className="ml-1 bg-red-100 text-red-800">conflict</Badge>}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Parse confidence — exp {Math.round((it.profile.sectionConfidence?.professionalExperience ?? 0) * 100)}% · edu {Math.round((it.profile.sectionConfidence?.education ?? 0) * 100)}% · lang {Math.round((it.profile.sectionConfidence?.languages ?? 0) * 100)}%
                      </p>
                    </div>
                  </details>
                )}
                {(cvForm?.fields || []).length > 0 && (
                  <div className="grid gap-2 md:grid-cols-2">
                    {cvForm!.fields.map((f) => (
                      <div key={f.key} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{f.label || f.key}</Label>
                        {f.type === "textarea" ? (
                          <Textarea
                            defaultValue={it.form[f.key] || ""}
                            rows={2}
                            onBlur={(e) => e.target.value !== (it.form[f.key] || "") && saveField(it, f.key, e.target.value)}
                          />
                        ) : (
                          <Input
                            defaultValue={it.form[f.key] || ""}
                            onBlur={(e) => e.target.value !== (it.form[f.key] || "") && saveField(it, f.key, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => score(it.id)}
                    disabled={pending || !hasEvalTemplate}
                    className="gap-1"
                    title={hasEvalTemplate ? "Score with AI and publish" : "Configure an evaluation matrix first"}
                  >
                    <BarChart3 className="h-4 w-4" /> {busyId === it.id && pending ? "Scoring…" : "Score with AI"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setReplaceId(replaceId === it.id ? null : it.id)} className="gap-1">
                    <RefreshCw className="h-4 w-4" /> Replace CV
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(it.id)} className="gap-1">
                    <Trash2 className="h-4 w-4 text-red-600" /> Delete
                  </Button>
                </div>

                {replaceId === it.id && (
                  <form onSubmit={(e) => replaceCv(e, it.id)} className="space-y-2 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                    <p className="text-sm font-medium">Replace this expert&apos;s CV and re-map</p>
                    {it.cvFileName && <p className="text-xs text-muted-foreground">Current file: {it.cvFileName}</p>}
                    <div className="space-y-1">
                      <Label htmlFor={`cv-${it.id}`} className="text-xs">New CV file (PDF or DOCX)</Label>
                      <Input id={`cv-${it.id}`} name="cv" type="file" accept=".pdf,.docx,.txt" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`rt-${it.id}`} className="text-xs">…or paste corrected CV text</Label>
                      <Textarea id={`rt-${it.id}`} name="rawText" rows={3} placeholder="Paste the corrected CV text here." />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={pending && busyId === it.id} className="gap-1">
                        <RefreshCw className="h-4 w-4" /> {busyId === it.id && pending ? "Re-mapping…" : "Replace & re-map"}
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setReplaceId(null)}>Cancel</Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
