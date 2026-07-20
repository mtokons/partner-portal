"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Upload, Download, FileText, ClipboardCheck, ChevronDown } from "lucide-react";
import type { Project, ProjectStaffingEntry, ProjectDocument, ExpertActiveStatus, ExpertEvaluation, EvaluationCriterion, EvaluationType } from "@/types";
import { getCvFileSizeError } from "@/lib/file-size";
import {
  createStaffingAction, updateStaffingAction, deleteStaffingAction,
  uploadProjectFileAction, replaceProjectFileByIdAction, deleteProjectFileAction, updateEvaluationAction,
  getExpertCvsAndEvaluationsAction, createEvaluationAction,
} from "../actions";

interface TemplateInfo { name: string; minPercent: number; criteria: EvaluationCriterion[] }

interface Props {
  project: Project;
  staffing: ProjectStaffingEntry[];
  cvs: ProjectDocument[];
  proposals: ProjectDocument[];
  documents: ProjectDocument[];
  matrix: ProjectDocument[];
  evaluations: ExpertEvaluation[];
  templates: Record<EvaluationType, TemplateInfo>;
  allExperts: any[];
}

const EMPTY = (projectId: string): Omit<ProjectStaffingEntry, "id" | "createdAt"> => ({
  projectId, workPackage: "", focusObjective: "", position: "", expertName: "", expertId: "", education: "", profExperience: "", specificExperience: "", devCooperation: "", expertise: "", cvFileName: "", activeStatus: "active", notes: "", order: 0,
});

export default function ProjectDetailAdminClient({ project, staffing, cvs, proposals, documents, matrix, evaluations, templates, allExperts }: Props) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProjectStaffingEntry | null>(null);
  const [form, setForm] = useState(EMPTY(project.id));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Collapsible sections state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    evaluations: true,
    cvs: true,
    proposals: true,
    documents: false,
    matrix: false,
    staffing: true,
  });

  const toggleSection = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Expert Bank Mapping states
  const [selectedBankExpertId, setSelectedBankExpertId] = useState<string>("");
  const [bankCvs, setBankCvs] = useState<any[]>([]);
  const [bankEvaluations, setBankEvaluations] = useState<any[]>([]);
  const [loadingBankData, setLoadingBankData] = useState(false);
  const [selectedCvName, setSelectedCvName] = useState("");
  const [mapEvalType, setMapEvalType] = useState("");

  function openCreate() { 
    setEditing(null); 
    setForm({ ...EMPTY(project.id), order: staffing.length + 1 }); 
    setSelectedBankExpertId("");
    setBankCvs([]);
    setBankEvaluations([]);
    setSelectedCvName("");
    setMapEvalType("");
    setError(""); 
    setShowForm(true); 
  }
  function openEdit(e: ProjectStaffingEntry) { 
    setEditing(e); 
    setForm({ ...e }); 
    setSelectedBankExpertId(e.expertId || "");
    setBankCvs([]);
    setBankEvaluations([]);
    setSelectedCvName(e.cvFileName || "");
    setMapEvalType("");
    setError(""); 
    setShowForm(true); 
  }

  async function handleSelectBankExpert(id: string) {
    setSelectedBankExpertId(id);
    const exp = allExperts.find((e) => e.id === id);
    if (!exp) {
      setBankCvs([]);
      setBankEvaluations([]);
      setSelectedCvName("");
      setMapEvalType("");
      return;
    }
    
    setForm((prev) => ({
      ...prev,
      expertId: exp.id,
      expertName: exp.expertName,
      position: exp.position || "",
      education: exp.level || "",
      activeStatus: "active",
      expertise: exp.tags || "",
    }));

    setLoadingBankData(true);
    try {
      const res = await getExpertCvsAndEvaluationsAction(exp.id, exp.expertName);
      if (res.success) {
        setBankCvs(res.cvs || []);
        setBankEvaluations(res.evaluations || []);
        if (res.cvs && res.cvs.length > 0) {
          const firstCv = res.cvs[0].fileName;
          setSelectedCvName(firstCv);
          setForm((prev) => ({ ...prev, cvFileName: firstCv }));
        } else {
          setSelectedCvName("");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBankData(false);
    }
  }

  async function save() {
    setBusy(true); setError("");
    
    const res = editing ? await updateStaffingAction(editing.id, project.id, form) : await createStaffingAction(form);
    
    if (!res.success) { 
      setError(res.error || "Failed to save staffing entry"); 
      setBusy(false); 
      return; 
    }

    if (!editing && mapEvalType) {
      const evalRes = await createEvaluationAction({
        projectId: project.id,
        expertId: form.expertId || "",
        expertName: form.expertName,
        position: form.position || mapEvalType,
        evalKey: mapEvalType,
        cvFileName: form.cvFileName,
      });
      if (!evalRes.success) {
        console.error("Failed to auto-initialize evaluation:", evalRes.error);
      }
    }

    setBusy(false);
    setShowForm(false); 
    router.refresh();
  }

  async function removeEntry(e: ProjectStaffingEntry) {
    if (!confirm(`Remove ${e.expertName} (${e.position})?`)) return;
    const res = await deleteStaffingAction(e.id, project.id);
    if (res.success) router.refresh(); else alert(res.error);
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{project.client} · {project.partnerName} ({project.partnerEmail})</p>
          <h1 className="text-2xl font-bold">{project.name}</h1>
        </div>
        <button onClick={openCreate} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          <Plus className="h-4 w-4" /> Add Expert
        </button>
      </div>

      {/* 1. Evaluation Matrix */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button onClick={() => toggleSection("evaluations")} className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 font-semibold border-b transition-colors">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-600" />
            <span>Expert Evaluations</span>
            <span className="text-sm font-normal text-muted-foreground">({evaluations.length})</span>
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${expanded.evaluations ? "" : "-rotate-90"}`} />
        </button>
        {expanded.evaluations && (
          <div className="p-5">
            <EvaluationsAdmin projectId={project.id} evaluations={evaluations} templates={templates} />
          </div>
        )}
      </div>

      {/* 2. CVs Folder */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button onClick={() => toggleSection("cvs")} className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 font-semibold border-b transition-colors">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>CVs Folder</span>
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${expanded.cvs ? "" : "-rotate-90"}`} />
        </button>
        {expanded.cvs && (
          <div className="p-5">
            <FolderManager projectId={project.id} folder="CVs" docs={cvs} />
          </div>
        )}
      </div>

      {/* 3. Proposals Folder */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button onClick={() => toggleSection("proposals")} className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 font-semibold border-b transition-colors">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            <span>Proposals Folder</span>
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${expanded.proposals ? "" : "-rotate-90"}`} />
        </button>
        {expanded.proposals && (
          <div className="p-5">
            <FolderManager projectId={project.id} folder="Proposals" docs={proposals} />
          </div>
        )}
      </div>

      {/* 4. Other Project Folders (Documents & Matrix) */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button onClick={() => toggleSection("documents")} className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 font-semibold border-b transition-colors">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            <span>Other Project Folders (Documents &amp; Matrix)</span>
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${expanded.documents ? "" : "-rotate-90"}`} />
        </button>
        {expanded.documents && (
          <div className="p-5 grid grid-cols-1 gap-6 md:grid-cols-2">
            <FolderManager projectId={project.id} folder="Documents" docs={documents} />
            <FolderManager projectId={project.id} folder="Matrix" docs={matrix} />
          </div>
        )}
      </div>

      {/* 5. Staffing Matrix */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <button onClick={() => toggleSection("staffing")} className="w-full flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/40 font-semibold border-b transition-colors">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600 animate-pulse" />
            <span>Staffing Matrix</span>
            <span className="text-sm font-normal text-muted-foreground">({staffing.length} Experts)</span>
          </div>
          <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${expanded.staffing ? "" : "-rotate-90"}`} />
        </button>
        {expanded.staffing && (
          <div className="p-5 space-y-4">
            <div className="flex justify-end">
              <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
                <Plus className="h-4 w-4" /> Add Expert
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left"><tr>
                  <th className="px-3 py-2">Position</th><th className="px-3 py-2">Expert</th><th className="px-3 py-2">Expertise</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">CV file</th><th className="px-3 py-2">Actions</th>
                </tr></thead>
                <tbody>
                  {staffing.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No entries.</td></tr>}
                  {staffing.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="px-3 py-2 font-medium">{e.position}</td>
                      <td className="px-3 py-2">
                        {e.expertId ? (
                          <a href={`/admin/experts/${e.expertId}`} className="font-medium text-indigo-600 hover:underline" title="Open in Master Expert Bank">{e.expertName}</a>
                        ) : (
                          <span className="inline-flex items-center gap-1">{e.expertName}<span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700" title="Not yet linked to the Master Expert Bank">unlinked</span></span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{e.expertise}</td>
                      <td className="px-3 py-2 capitalize">{e.activeStatus}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{e.cvFileName || "—"}</td>
                      <td className="px-3 py-2"><div className="flex gap-2">
                        <button onClick={() => openEdit(e)} className="rounded p-1 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => removeEntry(e)} className="rounded p-1 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-card p-6 shadow-xl border">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">{editing ? "Edit" : "Add"} Expert</h2><button onClick={() => setShowForm(false)}><X className="h-5 w-5" /></button></div>
            {error && <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              {!editing && (
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Select Onboarded Expert</label>
                  <select
                    value={selectedBankExpertId}
                    onChange={(e) => handleSelectBankExpert(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-background"
                  >
                    <option value="">-- Choose from Master Expert Bank --</option>
                    {allExperts
                      .filter((exp) => !staffing.some((s) => s.expertId === exp.id))
                      .map((exp) => (
                        <option key={exp.id} value={exp.id}>
                          {exp.expertName} ({exp.position})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <F label="Expert Name" v={form.expertName} on={(x) => setForm({ ...form, expertName: x })} />
              <F label="Expert ID" v={form.expertId || ""} on={(x) => setForm({ ...form, expertId: x })} />

              <div>
                <label className="text-xs font-medium">Suggested Position</label>
                <select
                  value={
                    ["Key Expert 1", "Key Expert 2", "International Pool", "National Pool", "Project Manager"].includes(form.position)
                      ? form.position
                      : form.position
                      ? "custom"
                      : ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "custom") {
                      setForm({ ...form, position: "" });
                    } else {
                      setForm({ ...form, position: val });
                      if (val === "Key Expert 2") setMapEvalType("expert-2");
                      else if (val === "International Pool") setMapEvalType("pool-1");
                      else if (val === "National Pool") setMapEvalType("pool-2");
                      else setMapEvalType("");
                    }
                  }}
                  className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                >
                  <option value="">-- Choose Position --</option>
                  <option value="Key Expert 1">Key Expert 1</option>
                  <option value="Key Expert 2">Key Expert 2</option>
                  <option value="International Pool">International Pool</option>
                  <option value="National Pool">National Pool</option>
                  <option value="Project Manager">Project Manager</option>
                  <option value="custom">Other / Custom Title...</option>
                </select>
              </div>

              {(!["Key Expert 1", "Key Expert 2", "International Pool", "National Pool", "Project Manager"].includes(form.position) || form.position === "") && (
                <F
                  label="Custom Position Title"
                  v={form.position}
                  on={(x) => setForm({ ...form, position: x })}
                />
              )}

              <F label="Work Package" v={form.workPackage || ""} on={(x) => setForm({ ...form, workPackage: x })} />
              <F label="Edu. qualifications" v={form.education || ""} on={(x) => setForm({ ...form, education: x })} />
              <F label="CV file name" v={form.cvFileName || ""} on={(x) => setForm({ ...form, cvFileName: x })} />

              {selectedBankExpertId && (
                <div className="col-span-2 space-y-3 bg-muted/10 p-4 rounded-xl border border-dashed">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Expert Bank Mapping &amp; Linkage</p>
                  
                  <div>
                    <label className="text-xs font-medium">Select Central CV File</label>
                    {loadingBankData ? (
                      <p className="text-xs text-muted-foreground mt-1">Loading expert CVs...</p>
                    ) : bankCvs.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-1">No central CVs uploaded.</p>
                    ) : (
                      <select
                        value={selectedCvName}
                        onChange={(e) => {
                          setSelectedCvName(e.target.value);
                          setForm({ ...form, cvFileName: e.target.value });
                        }}
                        className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                      >
                        {bankCvs.map((cv) => (
                          <option key={cv.id} value={cv.fileName}>
                            {cv.fileName} ({cv.format || "original"})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {!editing && (
                    <div>
                      <label className="text-xs font-medium">Auto-create Evaluation Matrix?</label>
                      <select
                        value={mapEvalType}
                        onChange={(e) => setMapEvalType(e.target.value)}
                        className="mt-1 w-full rounded border px-2 py-1.5 text-sm bg-background"
                      >
                        <option value="">Do not initialize evaluation matrix</option>
                        <option value="expert-2">Key Expert 2 Matrix</option>
                        <option value="pool-1">International Pool Matrix</option>
                        <option value="pool-2">National Pool Matrix</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="col-span-2"><label className="text-xs font-medium">Focus &amp; Objective</label><textarea value={form.focusObjective} onChange={(e) => setForm({ ...form, focusObjective: e.target.value })} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" rows={2} /></div>
              <div className="col-span-2"><label className="text-xs font-medium">Prof. Experience</label><textarea value={form.profExperience} onChange={(e) => setForm({ ...form, profExperience: e.target.value })} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" rows={2} /></div>
              <div className="col-span-2"><label className="text-xs font-medium">Specific Prof. Experience</label><textarea value={form.specificExperience} onChange={(e) => setForm({ ...form, specificExperience: e.target.value })} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" rows={2} /></div>
              <div className="col-span-2"><label className="text-xs font-medium">Exp. Dev. Cooperation</label><textarea value={form.devCooperation} onChange={(e) => setForm({ ...form, devCooperation: e.target.value })} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" rows={2} /></div>
              <div><label className="text-xs font-medium">Status</label><select value={form.activeStatus} onChange={(e) => setForm({ ...form, activeStatus: e.target.value as ExpertActiveStatus })} className="mt-1 w-full rounded border px-2 py-1.5 text-sm"><option value="active">Active</option><option value="standby">Standby</option><option value="unavailable">Unavailable</option></select></div>
            </div>
            <div className="mt-4 flex justify-end gap-2"><button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button onClick={save} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function FolderManager({ projectId, folder, docs }: { projectId: string; folder: string; docs: ProjectDocument[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeError = getCvFileSizeError(file.size);
    if (sizeError) {
      e.target.value = "";
      alert(sizeError);
      return;
    }
    setBusy(true);
    try {
      const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const res = await uploadProjectFileAction(projectId, folder, file.name, b64, file.type || "application/octet-stream");
      e.target.value = "";
      if (res.success) router.refresh(); else alert(res.error);
    } finally {
      setBusy(false);
    }
  }
  async function onReplace(oldName: string, itemId: string, file: File) {
    const sizeError = getCvFileSizeError(file.size);
    if (sizeError) {
      alert(sizeError);
      return;
    }
    setReplacing(itemId);
    try {
      // Overwrite in place by drive item ID so expert/staffing references stay
      // valid AND the correct file is hit regardless of special chars in name.
      const b64 = Buffer.from(await file.arrayBuffer()).toString("base64");
      const res = await replaceProjectFileByIdAction(projectId, folder, itemId, oldName, b64, file.type || "application/octet-stream");
      if (res.success) router.refresh(); else alert(res.error);
    } finally {
      setReplacing(null);
    }
  }
  async function del(name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    const res = await deleteProjectFileAction(projectId, folder, name);
    if (res.success) router.refresh(); else alert(res.error);
  }

  const fmtDate = (s: string) => {
    if (!s) return "—";
    const d = new Date(s);
    return isNaN(d.getTime()) ? "—" : d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const files = docs.filter((d) => !d.isFolder);

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{folder}</h3>
        <label className="inline-flex cursor-pointer items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white"><Upload className="h-3.5 w-3.5" /> {busy ? "Uploading…" : "Upload"}<input type="file" className="hidden" onChange={onUpload} disabled={busy} /></label>
      </div>
      {files.length > 0 && (
        <div className="flex items-center gap-2 border-b pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <span className="min-w-0 flex-1">File</span>
          <span className="w-40 shrink-0 text-right">Last updated</span>
          <span className="w-28 shrink-0 text-right">Actions</span>
        </div>
      )}
      <ul className="divide-y">
        {files.length === 0 && <li className="py-2 text-xs text-muted-foreground">No files.</li>}
        {files.map((d) => (
          <li key={d.id} className="flex items-center gap-2 py-2 text-sm">
            <span className="flex min-w-0 flex-1 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-blue-600" /><span className="truncate">{d.name}</span></span>
            <span className="w-40 shrink-0 text-right text-xs text-muted-foreground">{fmtDate(d.modified)}</span>
            <span className="flex w-28 shrink-0 justify-end gap-2">
              <ReplaceFileButton fileName={d.name} itemId={d.id} onReplace={onReplace} isReplacing={replacing === d.id} />
              <a href={`/api/project-files/${projectId}/${folder}/${encodeURIComponent(d.name)}?download=1`} className="rounded p-1 hover:bg-muted" title="Download"><Download className="h-4 w-4" /></a>
              <button onClick={() => del(d.name)} className="rounded p-1 text-red-600 hover:bg-red-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Per-row Replace button: holds its own ref so each row's file picker is
 * triggered independently. Using a <label> + hidden input shared across many
 * rows is unreliable — browsers may open the picker only for the first one.
 */
function ReplaceFileButton({ fileName, itemId, onReplace, isReplacing }: {
  fileName: string;
  itemId: string;
  onReplace: (name: string, itemId: string, file: File) => void;
  isReplacing: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="rounded p-1 hover:bg-muted disabled:opacity-40"
        title="Replace file (keeps the same name)"
        disabled={isReplacing}
      >
        <Upload className="h-4 w-4 text-emerald-600" />
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onReplace(fileName, itemId, file);
        }}
        disabled={isReplacing}
      />
    </>
  );
}

function F({ label, v, on }: { label: string; v: string; on: (x: string) => void }) {
  return <div><label className="text-xs font-medium">{label}</label><input value={v} onChange={(e) => on(e.target.value)} className="mt-1 w-full rounded border px-2 py-1.5 text-sm" /></div>;
}

const TYPE_LABEL: Record<EvaluationType, string> = { "expert-2": "Key Expert 2", "pool-1": "International Pool", "pool-2": "National Pool" };

function EvaluationsAdmin({ projectId, evaluations, templates }: { projectId: string; evaluations: ExpertEvaluation[]; templates: Record<EvaluationType, TemplateInfo> }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ExpertEvaluation | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const tpl = editing ? templates[editing.evalType] : null;
  const previewTotal = tpl ? Math.round(tpl.criteria.reduce((s, c) => s + (scores[c.key] ?? 0), 0) * 100) / 100 : 0;
  const previewMax = tpl ? tpl.criteria.reduce((s, c) => s + c.maxPoints, 0) : 0;
  const previewPct = previewMax ? Math.round((previewTotal / previewMax) * 1000) / 10 : 0;
  const previewPass = tpl ? previewPct >= tpl.minPercent : false;

  function open(ev: ExpertEvaluation) {
    setEditing(ev);
    const map: Record<string, number> = {};
    for (const c of templates[ev.evalType].criteria) map[c.key] = ev.scores.find((s) => s.key === c.key)?.score ?? 0;
    setScores(map); setError("");
  }

  async function save() {
    if (!editing) return;
    setBusy(true); setError("");
    const payload = Object.entries(scores).map(([key, score]) => ({ key, score }));
    const res = await updateEvaluationAction(editing.id, projectId, editing.evalType, payload);
    setBusy(false);
    if (!res.success) { setError(res.error || "Failed"); return; }
    setEditing(null); router.refresh();
  }

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold">Expert Evaluations</h2>
        <span className="text-sm text-muted-foreground">({evaluations.length})</span>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>
            <th className="px-3 py-2">Expert</th><th className="px-3 py-2">Position</th><th className="px-3 py-2">Pool</th><th className="px-3 py-2 text-right">Score</th><th className="px-3 py-2 text-right">%</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Actions</th>
          </tr></thead>
          <tbody>
            {evaluations.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">No evaluations. Run scripts/seed-evaluations.mjs.</td></tr>}
            {evaluations.map((ev) => (
              <tr key={ev.id} className="border-t">
                <td className="px-3 py-2 font-medium">{ev.expertId} · {ev.expertName}</td>
                <td className="px-3 py-2 text-muted-foreground">{ev.position}</td>
                <td className="px-3 py-2">{TYPE_LABEL[ev.evalType]}</td>
                <td className="px-3 py-2 text-right">{ev.totalScore} / {ev.maxScore}</td>
                <td className="px-3 py-2 text-right font-medium">{ev.percentage}%</td>
                <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ev.passed ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{ev.passed ? "Qualified" : "Below min"}</span></td>
                <td className="px-3 py-2"><button onClick={() => open(ev)} className="rounded p-1 hover:bg-muted"><Pencil className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && tpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setEditing(null)}>
          <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-card shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div><h2 className="text-lg font-semibold">{editing.expertName}</h2><p className="text-xs text-muted-foreground">{TYPE_LABEL[editing.evalType]} · min {tpl.minPercent}%</p></div>
              <button onClick={() => setEditing(null)}><X className="h-5 w-5" /></button>
            </div>
            {error && <p className="mx-5 mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>}
            <div className="overflow-y-auto px-5 py-3">
              {tpl.criteria.map((c) => (
                <div key={c.key} className="flex items-start justify-between gap-3 border-b py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{c.category}</p>
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <input type="number" step={0.25} min={0} max={c.maxPoints}
                      value={scores[c.key] ?? 0}
                      onChange={(e) => setScores({ ...scores, [c.key]: Math.max(0, Math.min(c.maxPoints, Number(e.target.value))) })}
                      className="w-16 rounded border px-2 py-1 text-right text-sm" />
                    <span className="text-xs text-muted-foreground">/ {c.maxPoints}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t px-5 py-3">
              <div className="text-sm">
                <span className="font-semibold">{previewTotal} / {previewMax}</span>
                <span className="ml-2 text-muted-foreground">{previewPct}%</span>
                <span className={`ml-2 font-semibold ${previewPass ? "text-emerald-600" : "text-red-600"}`}>{previewPass ? "Qualified" : "Below min"}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(null)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button>
                <button onClick={save} disabled={busy} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
