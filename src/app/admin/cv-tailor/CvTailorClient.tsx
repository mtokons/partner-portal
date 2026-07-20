"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useTransition } from "react";
import type { Project } from "@/types";
import { cn } from "@/lib/utils";
import { saveTailoredCvAction, saveToExpertBankAction, adjustBankEvaluationAction, implementForPartnersAction } from "./actions";

// ── Types ──────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;
interface Section   { section: string; original?: string | null; tailored: string; keywords: string[] }
interface MatrixRow { requirement: string; evidence: string; score: number; max_score: number }
interface TailorResult {
  expert_name: string; tor_match_pct: number;
  sections: Section[]; matrix_matches: MatrixRow[]; provider: string;
}
interface TorExcerptOption {
  id: string; label: string; projectId: string; excerptText: string;
  bangladeshProject?: boolean;
  sectorGroups?: Array<{ groupLabel: string; sectors: string[]; mode: "cumulative" | "individual" }>;
}
interface MatrixCriterion { label: string; maxPoints: number }
interface MatrixOption { id: string; label: string; projectId: string; criteria: MatrixCriterion[] }

// ── Person data for Custom CV Format 1 ──────────────────────────────────────
interface EduEntry      { institution: string; dateFrom: string; dateTo: string; degree: string }
interface TrainEntry    { course: string; provider: string; location: string; year: string; competency: string; certificate: string }
interface LangEntry     { language: string; reading: string; speaking: string; writing: string }
interface RegionEntry   { nr: string; region: string; country: string; dates: string }
interface ExpEntry      { dateFrom: string; dateTo: string; wd: string; location: string; company: string; position: string; projectTitle: string; donor: string; description: string }
interface PersonData {
  proposedRole: string; familyName: string; firstName: string; dateOfBirth: string;
  nationality: string; placeOfResidence: string; email: string; tel: string;
  membership: string; otherSkills: string; presentPosition: string;
  education: EduEntry[]; training: TrainEntry[]; languages: LangEntry[];
  regions: RegionEntry[]; experience: ExpEntry[]; publications: string[];
}

const TEMPLATES = [
  { id: "giz",     label: "GIZ Corporate Format",  desc: "Strict multi-page tables" },
  { id: "eu",      label: "Standard EU CV",         desc: "Chronological grid layout" },
  { id: "ucep",    label: "UCEP / UN Format",        desc: "UN-style competency profile" },
  { id: "custom1", label: "Custom CV Format 1",      desc: "Full structured layout: personal info, tables, landscape experience" },
  { id: "latex_modern", label: "LaTeX Modern CV",   desc: "Professional LaTeX compiled PDF" },
];

// ── Sub-components ─────────────────────────────────────────────────────────

function StepPill({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) {
  return (
    <div className={cn("flex items-center gap-2 text-sm font-medium", active ? "text-blue-600" : done ? "text-emerald-600" : "text-muted-foreground")}>
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
        active ? "bg-blue-600 text-white" : done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>
        {done ? "✓" : n}
      </span>
      {label}
    </div>
  );
}

function DropZone({ onFile, accept = ".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp", label, subLabel }: { onFile: (f: File) => void; accept?: string; label?: string; subLabel?: string }) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  }, [onFile]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "cursor-pointer rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center transition-all",
        drag ? "border-blue-500 bg-blue-50" : "border-blue-200 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-400"
      )}
    >
      <svg className="h-10 w-10 text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-sm font-medium text-slate-700">{label || "Drag & Drop Expert CV"}</p>
      <p className="mt-1 text-xs text-slate-400">{subLabel || "PDF, DOCX or image (scanned CVs use OCR)"}</p>
      <input ref={inputRef} type="file" className="hidden" accept={accept} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </div>
  );
}

function MatchBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? "bg-emerald-100 text-emerald-700" : pct >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", color)}>{pct.toFixed(0)}% TOR Match</span>;
}

// ── PersonDataForm: fills in all personal / structured fields for Custom CV Format 1 ──
function PF({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-0.5">
      <label className="text-[10px] font-medium text-slate-500">{label}</label>
      <input className="w-full rounded border bg-white px-2 py-1 text-xs focus:outline-none" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || label} />
    </div>
  );
}

function PersonDataForm({ personData, onChange }: { personData: PersonData; onChange: (p: PersonData) => void }) {
  const set = <K extends keyof PersonData>(k: K, v: PersonData[K]) => onChange({ ...personData, [k]: v });

  return (
    <details open className="rounded-xl border bg-white">
      <summary className="cursor-pointer px-3 py-2 text-xs font-semibold text-slate-700">Personal &amp; Structured Data (Custom CV Format 1)</summary>
      <div className="space-y-4 px-3 pb-4 pt-2">

        <section className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Identity</p>
          <PF label="Proposed Role" value={personData.proposedRole} onChange={(v) => set("proposedRole", v)} />
          <PF label="Family Name" value={personData.familyName} onChange={(v) => set("familyName", v)} />
          <PF label="First Name(s)" value={personData.firstName} onChange={(v) => set("firstName", v)} />
          <PF label="Date of Birth" value={personData.dateOfBirth} onChange={(v) => set("dateOfBirth", v)} placeholder="DD/MM/YYYY" />
          <PF label="Nationality" value={personData.nationality} onChange={(v) => set("nationality", v)} />
          <PF label="Place of Residence" value={personData.placeOfResidence} onChange={(v) => set("placeOfResidence", v)} />
          <PF label="Email" value={personData.email} onChange={(v) => set("email", v)} />
          <PF label="Tel." value={personData.tel} onChange={(v) => set("tel", v)} />
          <PF label="Present Position" value={personData.presentPosition} onChange={(v) => set("presentPosition", v)} />
          <div className="space-y-0.5">
            <label className="text-[10px] font-medium text-slate-500">Membership of Professional Bodies</label>
            <textarea rows={2} className="w-full rounded border bg-white px-2 py-1 text-xs" value={personData.membership} onChange={(e) => set("membership", e.target.value)} />
          </div>
          <div className="space-y-0.5">
            <label className="text-[10px] font-medium text-slate-500">Other Skills</label>
            <textarea rows={2} className="w-full rounded border bg-white px-2 py-1 text-xs" value={personData.otherSkills} onChange={(e) => set("otherSkills", e.target.value)} />
          </div>
        </section>

        <SectionArray
          label="Education"
          items={personData.education}
          emptyItem={{ institution: "", dateFrom: "", dateTo: "", degree: "" }}
          onChange={(v) => set("education", v as EduEntry[])}
          fields={[
            { key: "institution", label: "Institution" },
            { key: "dateFrom", label: "Date from (MM/YYYY)" },
            { key: "dateTo", label: "Date to (MM/YYYY)" },
            { key: "degree", label: "Degree / Diploma" },
          ]}
        />

        <SectionArray
          label="Training / Professional Development"
          items={personData.training}
          emptyItem={{ course: "", provider: "", location: "", year: "", competency: "", certificate: "" }}
          onChange={(v) => set("training", v as TrainEntry[])}
          fields={[
            { key: "course", label: "Course Name" },
            { key: "provider", label: "Provider" },
            { key: "location", label: "Location" },
            { key: "year", label: "Year" },
            { key: "competency", label: "Competency Gained" },
            { key: "certificate", label: "Certificate" },
          ]}
        />

        <SectionArray
          label="Language Skills"
          items={personData.languages}
          emptyItem={{ language: "", reading: "", speaking: "", writing: "" }}
          onChange={(v) => set("languages", v as LangEntry[])}
          fields={[
            { key: "language", label: "Language" },
            { key: "reading", label: "Reading" },
            { key: "speaking", label: "Speaking" },
            { key: "writing", label: "Writing" },
          ]}
        />

        <SectionArray
          label="Specific Regional Experience"
          items={personData.regions}
          emptyItem={{ nr: "", region: "", country: "", dates: "" }}
          onChange={(v) => set("regions", v as RegionEntry[])}
          fields={[
            { key: "nr", label: "Nr." },
            { key: "region", label: "Region" },
            { key: "country", label: "Country" },
            { key: "dates", label: "Date from – Date to" },
          ]}
        />

        <SectionArray
          label="Professional Experience"
          items={personData.experience}
          emptyItem={{ dateFrom: "", dateTo: "", wd: "", location: "", company: "", position: "", projectTitle: "", donor: "", description: "" }}
          onChange={(v) => set("experience", v as ExpEntry[])}
          fields={[
            { key: "dateFrom", label: "Date from" },
            { key: "dateTo", label: "Date to" },
            { key: "wd", label: "WD (months/days)" },
            { key: "location", label: "Location" },
            { key: "company", label: "Company / Organisation" },
            { key: "position", label: "Position" },
            { key: "projectTitle", label: "Project Title" },
            { key: "donor", label: "Donor" },
            { key: "description", label: "Description" },
          ]}
        />

        <div className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Publications / Other Information</p>
          {personData.publications.map((pub, i) => (
            <div key={i} className="flex gap-1">
              <input className="flex-1 rounded border bg-white px-2 py-1 text-xs" value={pub}
                onChange={(e) => set("publications", personData.publications.map((x, j) => j === i ? e.target.value : x))} />
              <button type="button" onClick={() => set("publications", personData.publications.filter((_, j) => j !== i))} className="text-xs text-red-500">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => set("publications", [...personData.publications, ""])}
            className="text-xs font-medium text-blue-600 hover:underline">+ Add publication</button>
        </div>
      </div>
    </details>
  );
}

function SectionArray({ label, items, emptyItem, onChange, fields }: {
  label: string;
  items: Record<string, string>[];
  emptyItem: Record<string, string>;
  onChange: (v: Record<string, string>[]) => void;
  fields: { key: string; label: string }[];
}) {
  return (
    <section className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
      {items.map((item, i) => (
        <div key={i} className="rounded border bg-slate-50 p-2 space-y-1">
          {fields.map((f) => (
            <div key={f.key} className="space-y-0.5">
              <label className="text-[9px] font-medium text-slate-400">{f.label}</label>
              <input className="w-full rounded border bg-white px-2 py-0.5 text-[11px]"
                value={item[f.key] || ""}
                onChange={(e) => onChange(items.map((x, j) => j === i ? { ...x, [f.key]: e.target.value } : x))} />
            </div>
          ))}
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-[10px] text-red-500">Remove</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { ...emptyItem }])}
        className="text-xs font-medium text-blue-600 hover:underline">+ Add row</button>
    </section>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function CvTailorClient({ projects, selectedProject, serviceStatus, torExcerpts, matrices }: {
  projects: Project[];
  selectedProject: Project | null;
  serviceStatus: "ok" | "unavailable";
  torExcerpts: TorExcerptOption[];
  matrices: MatrixOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // State
  const [step, setStep] = useState<Step>(1);
  const [project, setProject] = useState<Project | null>(selectedProject);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [torText, setTorText] = useState("");
  const [criteriaJson, setCriteriaJson] = useState("[]");
  const [torExcerptId, setTorExcerptId] = useState("");
  const [matrixId, setMatrixId] = useState("");
  const [bdProject, setBdProject] = useState(false);
  const [sectorGroups, setSectorGroups] = useState<TorExcerptOption["sectorGroups"]>([]);
  const [result, setResult] = useState<TailorResult | null>(null);

  const emptyPerson = (): PersonData => ({
    proposedRole: "", familyName: "", firstName: "", dateOfBirth: "",
    nationality: "", placeOfResidence: "", email: "", tel: "",
    membership: "", otherSkills: "", presentPosition: "",
    education: [], training: [], languages: [], regions: [], experience: [], publications: [],
  });
  const [personData, setPersonData] = useState<PersonData>(emptyPerson());
  const [previewTab, setPreviewTab] = useState<"cv" | "matrix" | "report">("cv");
  const [templateId, setTemplateId] = useState("giz");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  // Master Expert Bank
  const [bankSaving, setBankSaving] = useState(false);
  const [bankMsg, setBankMsg] = useState("");
  const [bankExpertId, setBankExpertId] = useState("");
  const [bankEvalId, setBankEvalId] = useState("");
  const [implementing, setImplementing] = useState(false);
  const [expertEmail, setExpertEmail] = useState("");
  const [expertLevel, setExpertLevel] = useState("");
  // Editable evaluation insights (preview-mode adjustments)
  const [editStrengths, setEditStrengths] = useState("");
  const [editGaps, setEditGaps] = useState("");
  const [editTorAnalysis, setEditTorAnalysis] = useState("");

  // Filter library items to the selected project (plus general/unassigned)
  const availableExcerpts = torExcerpts.filter((x) => !project || !x.projectId || x.projectId === project.id);
  const availableMatrices = matrices.filter((m) => !project || !m.projectId || m.projectId === project.id);

  // Step 2: call the tailor endpoint via the Next.js proxy
  function runTailor() {
    if (!cvFile) { setError("Please upload an expert CV."); return; }
    if (!project) { setError("Please select a project."); return; }
    setError("");
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("cv_file", cvFile);
        fd.append("tor_text", torText);
        fd.append("criteria_json", criteriaJson);
        fd.append("project_name", project.name);
        fd.append("bangladesh_project", String(bdProject));
        fd.append("sector_groups_json", JSON.stringify(sectorGroups || []));
        const r = await fetch("/api/cv-tailor/tailor", { method: "POST", body: fd });
        if (!r.ok) { const j = await r.json(); throw new Error(j.error || `HTTP ${r.status}`); }
        const data: TailorResult = await r.json();
        setResult(data);
        // Reset bank state + seed editable insights for the new result
        setBankExpertId(""); setBankEvalId(""); setBankMsg("");
        const ins = computeInsights(data);
        setEditStrengths(ins.strengths); setEditGaps(ins.gaps); setEditTorAnalysis(ins.torAnalysis);
        if (!expertEmail && personData.email) setExpertEmail(personData.email);
        setStep(2);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Tailoring failed");
      }
    });
  }

  // Step 3: download tailored DOCX
  async function downloadDocx() {
    if (!result) return;
    setDownloading(true);
    try {
      const body: Record<string, unknown> = { result, template_id: templateId };
      if (templateId === "custom1") body.person_data = personData;
      const r = await fetch("/api/cv-tailor/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `${result.expert_name.replace(/\s+/g, "_")}_${templateId}_tailored.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally { setDownloading(false); }
  }

  // Step 3: save tailored DOCX to the SharePoint document library
  async function saveToSharePoint() {
    if (!result) return;
    setSaving(true); setSaveMsg(""); setError("");
    try {
      const res = await saveTailoredCvAction({
        result,
        templateId,
        projectId: project?.id || "",
        projectName: project?.name || "",
        expertName: result.expert_name,
        personData: templateId === "custom1" ? personData : undefined,
      });
      setSaveMsg(`Saved to SharePoint: ${res.fileName}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save to SharePoint failed");
    } finally { setSaving(false); }
  }

  // Derive editable insights from the current result (strengths / gaps / TOR analysis)
  function computeInsights(r: TailorResult) {
    const matches = r.matrix_matches || [];
    const total = matches.reduce((s, m) => s + (Number(m.score) || 0), 0);
    const max = matches.reduce((s, m) => s + (Number(m.max_score) || 0), 0);
    const pct = max > 0 ? Math.round((total / max) * 100) : Math.round(r.tor_match_pct || 0);
    const strengths = matches.filter((m) => m.max_score && m.score / m.max_score >= 0.7)
      .map((m) => `• ${m.requirement}: ${m.evidence}`).join("\n");
    const gaps = matches.filter((m) => !m.max_score || m.score / m.max_score < 0.5)
      .map((m) => `• ${m.requirement} (scored ${m.score}/${m.max_score})`).join("\n");
    const strong = matches.filter((m) => m.max_score && m.score / m.max_score >= 0.7).length;
    const gapCount = matches.filter((m) => !m.max_score || m.score / m.max_score < 0.5).length;
    const torAnalysis = `TOR match ${Math.round(r.tor_match_pct || pct)}% · Matrix ${total}/${max} (${pct}%). ${strong} strong criteria, ${gapCount} gaps.`;
    return { strengths, gaps, torAnalysis };
  }

  // Save the tailored CV + editable evaluation into the Master Expert Bank (dedup)
  async function saveToBank() {
    if (!result) return;
    setBankSaving(true); setBankMsg(""); setError("");
    try {
      const res = await saveToExpertBankAction({
        result,
        templateId,
        projectId: project?.id || "",
        projectName: project?.name || "",
        matrixId,
        torExcerptId,
        email: expertEmail || personData.email,
        nationality: personData.nationality,
        level: expertLevel,
        personData: templateId === "custom1" ? personData : undefined,
      });
      setBankExpertId(res.expertId);
      setBankEvalId(res.evaluationId);
      // Save any human edits to the insights
      if (editStrengths || editGaps || editTorAnalysis) {
        await adjustBankEvaluationAction({
          evaluationId: res.evaluationId, strengths: editStrengths, gaps: editGaps,
          torAnalysis: editTorAnalysis, torMatchPct: Math.round(result.tor_match_pct),
        });
      }
      setBankMsg(res.created ? "New expert added to Master Bank ✓" : "Existing expert updated in Master Bank ✓");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save to Master Bank failed");
    } finally { setBankSaving(false); }
  }

  // Push this expert to all project partners' boards
  async function implementForPartners() {
    if (!bankExpertId) { setError("Save to Master Bank first."); return; }
    setImplementing(true); setBankMsg(""); setError("");
    try {
      const res = await implementForPartnersAction(bankExpertId);
      setBankMsg(res.ok ? `Offered to ${res.offered} project partner(s) ✓` : (res.reason || "Could not implement"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Implement for partners failed");
    } finally { setImplementing(false); }
  }

  return (
    <div className="flex h-full min-h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800">CV Tailor</h1>
            <p className="text-sm text-muted-foreground">Tailor expert CVs to a project&apos;s TOR and evaluation matrix, then generate a ready-to-submit DOCX.</p>
          </div>
          <div className={cn("flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", serviceStatus === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
            <span className={cn("h-2 w-2 rounded-full", serviceStatus === "ok" ? "bg-emerald-500" : "bg-amber-400")} />
            {serviceStatus === "ok" ? "Python service live" : "Python service starting…"}
          </div>
        </div>
        {/* Step progress */}
        <div className="mt-4 flex flex-wrap gap-6">
          <StepPill n={1} active={step === 1} done={step > 1} label="Setup & Upload" />
          <span className="self-center text-muted-foreground">→</span>
          <StepPill n={2} active={step === 2} done={step > 2} label="AI Preview" />
          <span className="self-center text-muted-foreground">→</span>
          <StepPill n={3} active={step === 3} done={false} label="Format & Export" />
        </div>
      </div>

      {/* 3-column workspace */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL: Step 1 – Setup & Upload ─────────────────────────────── */}
        <aside className="flex w-80 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-slate-50/50 p-5">
          <h2 className="text-sm font-semibold text-slate-800">Step 1 — Project &amp; CV</h2>

          {/* Project selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Project</label>
            <select
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              value={project?.id || ""}
              onChange={(e) => {
                const p = projects.find((x) => x.id === e.target.value) || null;
                setProject(p);
                router.push(`/admin/cv-tailor?project=${e.target.value}`);
              }}
            >
              <option value="">Select a project…</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {project && (
              <div className="flex flex-wrap gap-1 pt-1">
                <span className="rounded-full border bg-white px-2 py-0.5 text-[11px] text-slate-500">{project.client}</span>
                {project.status && <span className="rounded-full border bg-white px-2 py-0.5 text-[11px] capitalize text-slate-500">{project.status}</span>}
              </div>
            )}
          </div>

          {/* CV upload */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Expert CV</label>
            {cvFile
              ? <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm">
                  <span className="truncate text-blue-700">{cvFile.name}</span>
                  <button onClick={() => setCvFile(null)} className="ml-2 text-slate-400 hover:text-red-600">✕</button>
                </div>
              : <DropZone onFile={setCvFile} />
            }
          </div>

          {/* Saved ToR excerpt selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">ToR Excerpt (from Library)</label>
            <select
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              value={torExcerptId}
              onChange={(e) => {
                setTorExcerptId(e.target.value);
                const x = availableExcerpts.find((o) => o.id === e.target.value);
                if (x) {
                  setTorText(x.excerptText || "");
                  setBdProject(x.bangladeshProject ?? false);
                  setSectorGroups(x.sectorGroups ?? []);
                }
              }}
            >
              <option value="">— None / paste manually —</option>
              {availableExcerpts.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
            </select>
            {bdProject && (
              <p className="rounded bg-green-50 px-2 py-1 text-[11px] font-medium text-green-700">
                🇧🇩 Bangladesh project — non-BD experience counts as international
              </p>
            )}
            {(sectorGroups?.length ?? 0) > 0 && (
              <p className="rounded bg-blue-50 px-2 py-1 text-[11px] text-blue-700">
                {sectorGroups!.length} sector group{sectorGroups!.length > 1 ? "s" : ""} active
                {sectorGroups!.some((g) => g.mode === "cumulative") ? " · cumulative scoring" : ""}
              </p>
            )}
          </div>

          {/* Saved evaluation matrix selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Evaluation Matrix (from Library)</label>
            <select
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              value={matrixId}
              onChange={(e) => {
                setMatrixId(e.target.value);
                const m = availableMatrices.find((o) => o.id === e.target.value);
                if (m) setCriteriaJson(JSON.stringify(m.criteria, null, 2));
              }}
            >
              <option value="">— None / manual criteria —</option>
              {availableMatrices.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>

          {/* TOR context */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Terms of Reference (paste excerpt)</label>
            <textarea
              rows={5}
              placeholder="Paste the relevant TOR section…"
              className="w-full rounded-lg border bg-white p-3 text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
              value={torText}
              onChange={(e) => setTorText(e.target.value)}
            />
          </div>

          {/* Evaluation criteria JSON (advanced) */}
          <details className="rounded-lg border bg-white">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-600">Evaluation criteria JSON (optional)</summary>
            <textarea
              rows={4}
              placeholder='[{"label": "5 years TVET experience", "maxPoints": 3}]'
              className="w-full p-3 text-[11px] font-mono focus:outline-none"
              value={criteriaJson}
              onChange={(e) => setCriteriaJson(e.target.value)}
            />
          </details>

          {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}

          <button
            disabled={!cvFile || !project || pending}
            onClick={runTailor}
            className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-3 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            {pending ? "Tailoring with AI…" : "Tailor CV with AI"}
          </button>
        </aside>

        {/* ── CENTER PANEL: Step 2 – AI Preview ─────────────────────────────────── */}
        <main className="flex flex-1 flex-col overflow-y-auto bg-white p-6">
          {!result ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <svg className="mb-4 h-16 w-16 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              <p className="text-sm font-medium text-slate-400">Select a project, upload a CV,</p>
              <p className="text-sm text-slate-400">then click <strong className="text-blue-600">Tailor CV with AI</strong></p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">{result.expert_name}</h2>
                  <p className="text-xs text-muted-foreground">via {result.provider}</p>
                </div>
                <div className="flex items-center gap-2">
                  <MatchBadge pct={result.tor_match_pct} />
                  <button onClick={() => setStep(3)} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">Select format →</button>
                </div>
              </div>

              {/* Tabs */}
              <div className="mb-4 flex gap-2 border-b">
                {(["cv", "matrix", "report"] as const).map((t) => (
                  <button key={t} onClick={() => setPreviewTab(t)} className={cn("px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors", previewTab === t ? "border-blue-600 text-blue-700" : "border-transparent text-muted-foreground hover:text-slate-700")}>
                    {t === "cv" ? "Tailored CV" : t === "matrix" ? "Requirement Matrix" : "Evaluation Report"}
                  </button>
                ))}
              </div>

              {/* Tab A: Tailored sections */}
              {previewTab === "cv" && (
                <div className="space-y-4">
                  {result.sections.map((s, i) => (
                    <div key={i} className="rounded-xl border bg-slate-50/50 p-4">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-amber-600">{s.section}</span>
                      {s.original && (
                        <p className="mb-2 rounded bg-slate-100 p-2 text-xs italic text-slate-500"><strong>Original:</strong> {s.original}</p>
                      )}
                      <p className="text-sm text-slate-700">{s.tailored}</p>
                      {s.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.keywords.map((k) => (
                            <span key={k} className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Tab B: Matrix alignment */}
              {previewTab === "matrix" && (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left">
                      <tr>
                        <th className="px-3 py-2 font-medium">Requirement</th>
                        <th className="px-3 py-2 font-medium">Evidence from CV</th>
                        <th className="px-3 py-2 text-center font-medium">Score</th>
                        <th className="px-3 py-2 font-medium">Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.matrix_matches.map((m, i) => {
                        const pct = m.max_score ? (m.score / m.max_score) * 100 : 0;
                        return (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2 text-slate-700">{m.requirement}</td>
                            <td className="px-3 py-2 text-slate-600 italic">{m.evidence}</td>
                            <td className="px-3 py-2 text-center font-mono">{m.score}/{m.max_score}</td>
                            <td className="px-3 py-2 w-28">
                              <div className="h-1.5 w-full rounded bg-slate-100">
                                <div className={cn("h-full rounded", pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-400")} style={{ width: `${pct}%` }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Tab C: Editable Evaluation Report (preview-mode adjustments) */}
              {previewTab === "report" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-blue-700">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Short TOR Rating Analysis
                    </div>
                    <textarea rows={2} value={editTorAnalysis} onChange={(e) => setEditTorAnalysis(e.target.value)}
                      className="w-full resize-none rounded-lg border bg-white p-2 text-xs text-slate-700 focus:border-blue-400 focus:outline-none" />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-700">Strengths</div>
                      <textarea rows={7} value={editStrengths} onChange={(e) => setEditStrengths(e.target.value)}
                        className="w-full resize-none rounded-lg border bg-white p-2 text-xs text-slate-700 focus:border-emerald-400 focus:outline-none" />
                    </div>
                    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4">
                      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">Gaps vs TOR</div>
                      <textarea rows={7} value={editGaps} onChange={(e) => setEditGaps(e.target.value)}
                        className="w-full resize-none rounded-lg border bg-white p-2 text-xs text-slate-700 focus:border-amber-400 focus:outline-none" />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">Adjust the report freely — your edits are saved with the evaluation in the Master Bank.</p>
                </div>
              )}
            </>
          )}
        </main>

        {/* ── RIGHT PANEL: Step 3 – Format & Export ─────────────────────────────── */}
        <aside className="flex w-72 shrink-0 flex-col gap-4 overflow-y-auto border-l bg-slate-50/50 p-5">
          <h2 className="text-sm font-semibold text-slate-800">Step 3 — Format &amp; Export</h2>
          <p className="text-xs text-slate-500">Choose an output layout. Your AI-tailored content is injected into the selected template.</p>

          <div className="grid grid-cols-1 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTemplateId(t.id); setStep(3); }}
                className={cn("rounded-xl border p-3 text-left transition-all",
                  templateId === t.id ? "border-blue-600 bg-blue-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300"
                )}
              >
                <div className={cn("text-sm font-medium", templateId === t.id ? "text-blue-800" : "text-slate-800")}>{t.label}</div>
                <div className="mt-0.5 text-xs text-slate-500">{t.desc}</div>
              </button>
            ))}
          </div>

          {/* ── Custom CV Format 1: person data form ─────────────────────────── */}
          {templateId === "custom1" && (
            <PersonDataForm personData={personData} onChange={setPersonData} />
          )}

          <div className="mt-auto space-y-3">
            {!result && <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">Complete Step 2 to unlock export.</p>}
            <button
              disabled={!result || downloading}
              onClick={downloadDocx}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {downloading ? "Generating…" : "Download DOCX"}
            </button>
            <button
              disabled={!result || saving}
              onClick={saveToSharePoint}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-white p-3 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-50 active:scale-[0.99] disabled:opacity-40"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              {saving ? "Saving…" : "Save to SharePoint"}
            </button>
            {saveMsg && <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">{saveMsg}</p>}

            {/* ── Master Expert Bank ─────────────────────────────────────────── */}
            <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 to-violet-50/50 p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-800">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H6a2 2 0 00-2 2z" /></svg>
                Master Expert Bank
              </div>
              <p className="text-[11px] leading-tight text-slate-500">Saves this expert (deduplicated), the tailored CV tagged <span className="font-medium">{templateId}</span>, and the editable evaluation report.</p>
              <input value={expertEmail} onChange={(e) => setExpertEmail(e.target.value)} placeholder="Expert email (for dedup)"
                className="w-full rounded-lg border bg-white px-2 py-1.5 text-xs focus:outline-none" />
              <input value={expertLevel} onChange={(e) => setExpertLevel(e.target.value)} placeholder="Level (e.g. Team Leader, Key Expert 1)"
                className="w-full rounded-lg border bg-white px-2 py-1.5 text-xs focus:outline-none" />
              <button
                disabled={!result || bankSaving}
                onClick={saveToBank}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 p-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition-all hover:opacity-95 active:scale-[0.99] disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                {bankSaving ? "Saving…" : "Save to Master Bank"}
              </button>
              {bankExpertId && (
                <button
                  disabled={implementing}
                  onClick={implementForPartners}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-white p-2.5 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-50 active:scale-[0.99] disabled:opacity-40"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m-4-4v12a4 4 0 01-4 4H4" /></svg>
                  {implementing ? "Implementing…" : "Implement for Partners"}
                </button>
              )}
              {bankMsg && <p className="rounded-lg bg-indigo-50 p-2 text-[11px] text-indigo-700">{bankMsg}</p>}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
