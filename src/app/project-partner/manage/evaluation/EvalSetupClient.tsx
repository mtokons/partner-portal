"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Project, CvFormTemplate, EvaluationTemplate, CvFormField, EvaluationCriterion } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { saveCvFormTemplateAction, saveEvalTemplateAction } from "../actions";

interface Props {
  project: Project;
  cvForm: CvFormTemplate | null;
  evalTemplate: EvaluationTemplate | null;
}

const FIELD_TYPES: CvFormField["type"][] = ["text", "textarea", "number", "date", "list"];

export default function EvalSetupClient({ project, cvForm, evalTemplate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // CV form state
  const [formName, setFormName] = useState(cvForm?.name || `${project.name} CV form`);
  const [fields, setFields] = useState<CvFormField[]>(cvForm?.fields || []);
  const [formMsg, setFormMsg] = useState("");

  // Eval template state
  const [evalName, setEvalName] = useState(evalTemplate?.name || `${project.name} matrix`);
  const [evalKey, setEvalKey] = useState(evalTemplate?.evalKey || "matrix-1");
  const [minPercent, setMinPercent] = useState(evalTemplate?.minPercent ?? 85);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(evalTemplate?.criteria || []);
  const [evalMsg, setEvalMsg] = useState("");

  const totalPoints = criteria.reduce((s, c) => s + (Number(c.maxPoints) || 0), 0);

  function addField() {
    setFields([...fields, { key: `field${fields.length + 1}`, label: "", type: "text" }]);
  }
  function updateField(i: number, patch: Partial<CvFormField>) {
    setFields(fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }
  function removeField(i: number) {
    setFields(fields.filter((_, idx) => idx !== i));
  }

  function addCriterion() {
    setCriteria([...criteria, { key: `c${criteria.length + 1}`, category: "", label: "", maxPoints: 1 }]);
  }
  function updateCriterion(i: number, patch: Partial<EvaluationCriterion>) {
    setCriteria(criteria.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  function removeCriterion(i: number) {
    setCriteria(criteria.filter((_, idx) => idx !== i));
  }

  function saveForm() {
    setFormMsg("");
    startTransition(async () => {
      try {
        await saveCvFormTemplateAction({ id: cvForm?.id, projectId: project.id, name: formName, fields });
        setFormMsg("Saved ✓");
        router.refresh();
      } catch (e) {
        setFormMsg(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  function saveEval() {
    setEvalMsg("");
    startTransition(async () => {
      try {
        await saveEvalTemplateAction({
          id: evalTemplate?.id, projectId: project.id, name: evalName,
          evalKey: evalKey.trim() || "matrix-1", minPercent: Number(minPercent) || 0, criteria,
        });
        setEvalMsg("Saved ✓");
        router.refresh();
      } catch (e) {
        setEvalMsg(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  return (
    <Tabs defaultValue="form" className="space-y-4">
      <TabsList>
        <TabsTrigger value="form">CV Form</TabsTrigger>
        <TabsTrigger value="matrix">Evaluation Matrix</TabsTrigger>
      </TabsList>

      <TabsContent value="form" className="space-y-4">
        <div className="space-y-1 max-w-md">
          <Label>Form name</Label>
          <Input value={formName} onChange={(e) => setFormName(e.target.value)} />
        </div>
        <div className="space-y-2">
          {fields.map((f, i) => (
            <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-lg border p-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Key</Label>
                <Input value={f.key} onChange={(e) => updateField(i, { key: e.target.value })} />
              </div>
              <div className="col-span-4 space-y-1">
                <Label className="text-xs">Label</Label>
                <Input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Type</Label>
                <Select value={f.type} onValueChange={(v) => updateField(i, { type: v as CvFormField["type"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">AI hint</Label>
                <Input value={f.hint || ""} onChange={(e) => updateField(i, { hint: e.target.value })} />
              </div>
              <div className="col-span-1">
                <Button variant="ghost" size="sm" onClick={() => removeField(i)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addField} className="gap-1"><Plus className="h-4 w-4" /> Add field</Button>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={saveForm} disabled={pending}>{pending ? "Saving…" : "Save CV form"}</Button>
          {formMsg && <span className="text-sm text-muted-foreground">{formMsg}</span>}
        </div>
      </TabsContent>

      <TabsContent value="matrix" className="space-y-4">
        <div className="grid max-w-2xl grid-cols-3 gap-3">
          <div className="space-y-1 col-span-1">
            <Label>Matrix name</Label>
            <Input value={evalName} onChange={(e) => setEvalName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Eval key</Label>
            <Input value={evalKey} onChange={(e) => setEvalKey(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Pass threshold (%)</Label>
            <Input type="number" value={minPercent} onChange={(e) => setMinPercent(Number(e.target.value))} />
          </div>
        </div>
        <div className="space-y-2">
          {criteria.map((c, i) => (
            <div key={i} className="grid grid-cols-12 items-end gap-2 rounded-lg border p-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Key</Label>
                <Input value={c.key} onChange={(e) => updateCriterion(i, { key: e.target.value })} />
              </div>
              <div className="col-span-3 space-y-1">
                <Label className="text-xs">Category</Label>
                <Input value={c.category} onChange={(e) => updateCriterion(i, { category: e.target.value })} />
              </div>
              <div className="col-span-5 space-y-1">
                <Label className="text-xs">Criterion</Label>
                <Input value={c.label} onChange={(e) => updateCriterion(i, { label: e.target.value })} />
              </div>
              <div className="col-span-1 space-y-1">
                <Label className="text-xs">Max</Label>
                <Input type="number" step="0.5" value={c.maxPoints} onChange={(e) => updateCriterion(i, { maxPoints: Number(e.target.value) })} />
              </div>
              <div className="col-span-1">
                <Button variant="ghost" size="sm" onClick={() => removeCriterion(i)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={addCriterion} className="gap-1"><Plus className="h-4 w-4" /> Add criterion</Button>
            <span className="text-sm text-muted-foreground">Total points: <strong>{totalPoints}</strong></span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={saveEval} disabled={pending}>{pending ? "Saving…" : "Save matrix"}</Button>
          {evalMsg && <span className="text-sm text-muted-foreground">{evalMsg}</span>}
        </div>
      </TabsContent>
    </Tabs>
  );
}
