"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  FolderKanban, Plus, Pencil, Trash2, X, Building2, Search, 
  ArrowRight, Mail, Settings, UserPlus, FolderInput, CheckSquare, 
  Square, Shield, CheckCircle2, Copy 
} from "lucide-react";
import type { Project, ProjectStatus } from "@/types";
import { 
  createProjectAction, updateProjectAction, deleteProjectAction,
  createPartnerOrgAction, updatePartnerOrgAction, createPartnerUserAction, assignProjectsToPartnerAction
} from "./actions";

const EMPTY: Omit<Project, "id" | "createdAt"> = {
  name: "", code: "", client: "", partnerName: "", partnerEmail: "", description: "", status: "active", orgId: "",
};

interface PartnerOrg {
  id: string;
  name: string;
  emails: string[];
}

interface Props {
  initial: Project[];
  orgs: PartnerOrg[];
}

export default function ProjectsAdminClient({ initial, orgs }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("all");
  const [partnerSearch, setPartnerSearch] = useState("");
  
  // Project form states
  const [editing, setEditing] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [useTemplate, setUseTemplate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Partner Org CRUD states
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [editingOrg, setEditingOrg] = useState<PartnerOrg | null>(null);
  const [orgForm, setOrgForm] = useState({ name: "", adminEmails: "", notes: "" });
  const [orgBusy, setOrgBusy] = useState(false);
  const [orgError, setOrgError] = useState("");

  // Partner User provisioning states
  const [showUserForm, setShowUserForm] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", fullName: "", role: "project-partner" as "project-partner" | "project-partner-admin" });
  const [userBusy, setUserBusy] = useState(false);
  const [userError, setUserError] = useState("");
  const [createdUserCreds, setCreatedUserCreds] = useState<{ email: string; password?: string; name: string } | null>(null);

  // Project assignment states
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignedProjectIds, setAssignedProjectIds] = useState<string[]>([]);
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignError, setAssignError] = useState("");

  const selectedPartner = useMemo(() => {
    if (selectedPartnerId === "all") return null;
    return orgs.find(o => o.id === selectedPartnerId) || null;
  }, [selectedPartnerId, orgs]);

  // Check if project belongs to a partner organization
  const doesProjectBelongToPartner = (project: Project, partnerId: string): boolean => {
    if (project.orgId) {
      const ids = project.orgId.split(",").map(x => x.trim()).filter(Boolean);
      return ids.includes(partnerId);
    }
    
    // Fallback to legacy matching
    const pName = (project.partnerName || "").trim().toLowerCase();
    const pEmail = (project.partnerEmail || "").trim().toLowerCase();
    const org = orgs.find(o => o.id === partnerId);
    if (!org) return false;
    return org.name.trim().toLowerCase() === pName || org.emails.some(e => e.trim().toLowerCase() === pEmail);
  };

  // Compute project counts for each partner
  const projectCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length };
    orgs.forEach(o => { counts[o.id] = 0; });
    counts.unassigned = 0;

    projects.forEach(p => {
      let assigned = false;
      orgs.forEach(o => {
        if (doesProjectBelongToPartner(p, o.id)) {
          counts[o.id] = (counts[o.id] || 0) + 1;
          assigned = true;
        }
      });
      if (!assigned) {
        counts.unassigned = (counts.unassigned || 0) + 1;
      }
    });

    return counts;
  }, [projects, orgs]);

  // Filtered partners based on search
  const filteredOrgs = useMemo(() => {
    return orgs.filter(o => 
      o.name.toLowerCase().includes(partnerSearch.toLowerCase())
    );
  }, [orgs, partnerSearch]);

  // Filtered projects based on selected partner
  const filteredProjects = useMemo(() => {
    if (selectedPartnerId === "all") return projects;
    return projects.filter(p => doesProjectBelongToPartner(p, selectedPartnerId));
  }, [projects, selectedPartnerId]);

  function openCreate() {
    setError("");
    setUseTemplate(false);
    const newForm = { ...EMPTY };
    if (selectedPartner) {
      newForm.partnerName = selectedPartner.name;
      newForm.partnerEmail = selectedPartner.emails[0] || "";
      newForm.orgId = selectedPartner.id;
    }
    setEditing(null);
    setForm(newForm);
    setShowForm(true);
  }

  function openEdit(p: Project) {
    setEditing(p);
    setForm({ ...p, orgId: p.orgId || "" });
    setError("");
    setUseTemplate(false);
    setShowForm(true);
  }

  async function save() {
    setBusy(true);
    setError("");
    const res = editing 
      ? await updateProjectAction(editing.id, form) 
      : await createProjectAction({ ...form, useTemplate });
    setBusy(false);
    if (!res.success) {
      setError(res.error || "Failed");
      return;
    }
    setShowForm(false);
    router.refresh();
    
    // Reload projects
    if (editing) {
      setProjects(prev => prev.map(p => p.id === editing.id ? { ...p, ...form } : p));
    } else {
      window.location.reload();
    }
  }

  async function remove(p: Project) {
    if (!confirm(`Delete project "${p.name}" and all its staffing entries? CVs in the document library are not removed.`)) return;
    const res = await deleteProjectAction(p.id);
    if (res.success) {
      setProjects((arr) => arr.filter((x) => x.id !== p.id));
      router.refresh();
    } else {
      alert(res.error);
    }
  }

  // Partner CRUD Handlers
  function openCreateOrg() {
    setOrgError("");
    setEditingOrg(null);
    setOrgForm({ name: "", adminEmails: "", notes: "" });
    setShowOrgForm(true);
  }

  function openEditOrg(org: PartnerOrg) {
    setOrgError("");
    setEditingOrg(org);
    setOrgForm({ name: org.name, adminEmails: org.emails.join(", "), notes: "" });
    setShowOrgForm(true);
  }

  async function saveOrg() {
    setOrgBusy(true);
    setOrgError("");
    const emails = orgForm.adminEmails.split(",").map(e => e.trim()).filter(Boolean);
    const res = editingOrg
      ? await updatePartnerOrgAction(editingOrg.id, { name: orgForm.name, adminEmails: emails, status: "active", notes: orgForm.notes })
      : await createPartnerOrgAction({ name: orgForm.name, adminEmails: emails, status: "active", notes: orgForm.notes });
    setOrgBusy(false);
    if (!res.success) {
      setOrgError(res.error || "Failed to save organisation");
      return;
    }
    setShowOrgForm(false);
    router.refresh();
    window.location.reload();
  }

  // Provision Partner User Handlers
  function openCreateUser() {
    if (!selectedPartner) return;
    setUserError("");
    setCreatedUserCreds(null);
    setUserForm({ email: "", fullName: "", role: "project-partner" });
    setShowUserForm(true);
  }

  async function saveUser() {
    if (!selectedPartner) return;
    setUserBusy(true);
    setUserError("");
    const res = await createPartnerUserAction({
      ...userForm,
      orgId: selectedPartner.id,
      orgName: selectedPartner.name
    });
    setUserBusy(false);
    if (!res.success) {
      setUserError(res.error || "Failed to create user");
      return;
    }
    setCreatedUserCreds({
      name: userForm.fullName,
      email: userForm.email,
      password: res.data?.tempPassword
    });
  }

  // Project Assignment Handlers
  function openAssignProjects() {
    if (!selectedPartner) return;
    setAssignError("");
    const matched = projects
      .filter(p => doesProjectBelongToPartner(p, selectedPartner.id))
      .map(p => p.id);
    setAssignedProjectIds(matched);
    setShowAssignForm(true);
  }

  async function saveProjectAssignment() {
    if (!selectedPartner) return;
    setAssignBusy(true);
    setAssignError("");
    const res = await assignProjectsToPartnerAction(selectedPartner.id, assignedProjectIds);
    setAssignBusy(false);
    if (!res.success) {
      setAssignError(res.error || "Failed to save assignment");
      return;
    }
    setShowAssignForm(false);
    router.refresh();
    window.location.reload();
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] flex-col bg-slate-50/50" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Page Header */}
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Project Partners Dashboard</h1>
              <p className="text-xs text-slate-500">Manage partner organisations, users, and project allocations</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={openCreateOrg}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
            >
              <Building2 className="h-4 w-4" /> Add Partner Org
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="h-4 w-4" /> New Project
            </button>
          </div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 md:grid-cols-4 lg:grid-cols-5">
        {/* Left Sidebar: Partner Selector */}
        <div className="border-r bg-white p-4 md:col-span-1 lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search partner..."
              value={partnerSearch}
              onChange={(e) => setPartnerSearch(e.target.value)}
              className="w-full rounded-xl border bg-slate-50 pl-9 pr-4 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30 transition-all border-slate-200"
            />
          </div>

          <div className="space-y-1">
            <button
              onClick={() => setSelectedPartnerId("all")}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                selectedPartnerId === "all"
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4" /> All Partners
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                selectedPartnerId === "all" ? "bg-blue-200/50 text-blue-700" : "bg-slate-100 text-slate-500"
              }`}>{projectCounts.all}</span>
            </button>

            <div className="h-px bg-slate-100 my-2" />

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">Project Partners</div>
            <div className="space-y-0.5 max-h-[calc(100vh-22rem)] overflow-y-auto pr-1">
              {filteredOrgs.map((org) => {
                const isSelected = selectedPartnerId === org.id;
                const count = projectCounts[org.id] || 0;
                return (
                  <button
                    key={org.id}
                    onClick={() => setSelectedPartnerId(org.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                      isSelected
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{org.name}</span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isSelected ? "bg-blue-200/50 text-blue-700" : "bg-slate-100 text-slate-500"
                    }`}>{count}</span>
                  </button>
                );
              })}
              {filteredOrgs.length === 0 && (
                <div className="px-3 py-4 text-xs text-slate-400 italic">No partners match.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Content: Projects List & Partner Details */}
        <div className="p-6 md:col-span-3 lg:col-span-4 space-y-6">
          <div className="flex flex-col gap-2 rounded-2xl bg-white border p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {selectedPartner ? selectedPartner.name : "All Project Partners"}
                </h2>
                {selectedPartner && (
                  <p className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <Mail className="h-3 w-3" /> Contact Emails: {selectedPartner.emails.join(", ") || "No emails recorded"}
                  </p>
                )}
              </div>
              
              {selectedPartner && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditOrg(selectedPartner)}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    <Settings className="h-3.5 w-3.5" /> Edit Org
                  </button>
                  <button
                    onClick={openCreateUser}
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                  >
                    <UserPlus className="h-3.5 w-3.5" /> Add User
                  </button>
                  <button
                    onClick={openAssignProjects}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition"
                  >
                    <FolderInput className="h-3.5 w-3.5" /> Allocate Projects
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <span className="text-sm font-semibold text-slate-700">Assigned Projects</span>
              <span className="text-xs text-slate-400 font-semibold bg-slate-100 rounded-full px-3 py-1">
                {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"}
              </span>
            </div>

            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/70 text-left border-b">
                  <tr className="text-slate-600 font-semibold">
                    <th className="px-4 py-3">Project Details</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Partner Org</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                        <FolderKanban className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-sm">No projects assigned</p>
                        <p className="text-xs text-slate-400 mt-0.5">Allocate existing projects or click 'New Project'.</p>
                      </td>
                    </tr>
                  )}
                  {filteredProjects.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3">
                        <Link
                          className="font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
                          href={`/admin/projects/${p.id}`}
                        >
                          {p.name}
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-all translate-x-0 group-hover:translate-x-1" />
                        </Link>
                        {p.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">{p.description}</p>}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">{p.client}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{p.code || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700 font-medium">{p.partnerName}</div>
                        <div className="text-[10px] text-slate-400">{p.partnerEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : p.status === "on-hold"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(p)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition"
                            title="Edit project"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => remove(p)}
                            className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition"
                            title="Delete project"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Project Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">{editing ? "Edit" : "New"} Project</h2>
              <button onClick={() => setShowForm(false)} className="rounded-full p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {error && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 border border-rose-100">{error}</p>}
            
            <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="col-span-2">
                <Field label="Project Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              </div>
              <Field label="Project Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} />
              <Field label="Client" value={form.client} onChange={(v) => setForm({ ...form, client: v })} />
              <Field label="Partner Org Name" value={form.partnerName} onChange={(v) => setForm({ ...form, partnerName: v })} />
              <Field label="Partner Login Email" value={form.partnerEmail} onChange={(v) => setForm({ ...form, partnerEmail: v })} />
              
              {!editing && (
                <div className="col-span-2 bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="useTemplate"
                    checked={useTemplate}
                    onChange={(e) => setUseTemplate(e.target.checked)}
                    className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="useTemplate" className="text-xs text-slate-600 font-semibold cursor-pointer">
                    Clone layout & content from standard template project <span className="text-blue-600">("GIZ Bangladesh PRECISE & TVET4RE")</span>.
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">This copies CV configurations, evaluations criteria list, and staffing matrix setup.</p>
                  </label>
                </div>
              )}

              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Assigned Partner Organisations</label>
                <div className="flex flex-wrap gap-2.5">
                  {orgs.map((org) => {
                    const ids = (form.orgId || "").split(",").map(x => x.trim()).filter(Boolean);
                    const isChecked = ids.includes(org.id);
                    return (
                      <label key={org.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer select-none text-xs font-medium hover:bg-slate-100 transition-colors text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            let nextIds;
                            if (e.target.checked) {
                              nextIds = [...ids, org.id];
                            } else {
                              nextIds = ids.filter(id => id !== org.id);
                            }
                            setForm({ ...form, orgId: nextIds.join(",") });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        {org.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                  className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 outline-none"
                >
                  <option value="active">Active</option>
                  <option value="on-hold">On hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 outline-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button onClick={() => setShowForm(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button
                onClick={save}
                disabled={busy}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Org CRUD Modal */}
      {showOrgForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">{editingOrg ? "Edit" : "New"} Partner Organisation</h2>
              <button onClick={() => setShowOrgForm(false)} className="rounded-full p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {orgError && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 border border-rose-100">{orgError}</p>}
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Organisation Name</label>
                <input
                  type="text"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  className="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/30 outline-none border-slate-200"
                  placeholder="e.g. GFA Consulting Group"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Admin Emails (comma-separated)</label>
                <input
                  type="text"
                  value={orgForm.adminEmails}
                  onChange={(e) => setOrgForm({ ...orgForm, adminEmails: e.target.value })}
                  className="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/30 outline-none border-slate-200"
                  placeholder="e.g. admin@gfa.com, user@gfa.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Notes / Summary</label>
                <textarea
                  value={orgForm.notes}
                  onChange={(e) => setOrgForm({ ...orgForm, notes: e.target.value })}
                  className="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/30 outline-none border-slate-200"
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button onClick={() => setShowOrgForm(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button
                onClick={saveOrg}
                disabled={orgBusy}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
              >
                {orgBusy ? "Saving…" : "Save Organisation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision Partner User Modal */}
      {showUserForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">Add Partner User for {selectedPartner?.name}</h2>
              <button onClick={() => setShowUserForm(false)} className="rounded-full p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {userError && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 border border-rose-100">{userError}</p>}
            
            {createdUserCreds ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <div className="text-xs font-semibold">User created successfully! Share these temporary credentials.</div>
                </div>
                <div className="space-y-2 rounded-xl bg-slate-50 p-4 border text-xs">
                  <div className="flex justify-between border-b pb-2"><span className="text-slate-400">Full Name</span><span className="font-semibold">{createdUserCreds.name}</span></div>
                  <div className="flex justify-between border-b py-2"><span className="text-slate-400">Login Email</span><span className="font-semibold">{createdUserCreds.email}</span></div>
                  <div className="flex justify-between py-2"><span className="text-slate-400">Temporary Password</span><span className="font-semibold font-mono text-blue-600">{createdUserCreds.password || "Password Set"}</span></div>
                </div>
                <p className="text-[10px] text-amber-600 bg-amber-50 rounded-lg p-2">⚠️ The temporary password is shown only once. Please copy it before closing.</p>
                <div className="flex justify-end pt-2 border-t">
                  <button onClick={() => { setShowUserForm(false); router.refresh(); window.location.reload(); }} className="rounded-xl bg-slate-800 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700">Close</button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    className="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/30 outline-none border-slate-200"
                    placeholder="e.g. John Smith"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Login Email Address</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/30 outline-none border-slate-200"
                    placeholder="john.smith@partner.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Access Role Level</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                    className="w-full rounded-xl border bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/30 outline-none"
                  >
                    <option value="project-partner">Normal Partner Viewer (read-only console)</option>
                    <option value="project-partner-admin">Partner Org Manager (edit/create console)</option>
                  </select>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t pt-4">
                  <button onClick={() => setShowUserForm(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
                  <button
                    onClick={saveUser}
                    disabled={userBusy}
                    className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {userBusy ? "Provisioning…" : "Create User"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Project Allocation / Assignment Modal */}
      {showAssignForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border animate-in zoom-in-95 duration-200">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-slate-800">Allocate Projects to {selectedPartner?.name}</h2>
              <button onClick={() => setShowAssignForm(false)} className="rounded-full p-1 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>
            {assignError && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 border border-rose-100">{assignError}</p>}
            
            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {projects.map((proj) => {
                const isChecked = assignedProjectIds.includes(proj.id);
                return (
                  <label key={proj.id} className="flex items-start gap-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-150 p-3 rounded-xl cursor-pointer select-none transition-colors">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAssignedProjectIds(prev => [...prev, proj.id]);
                        } else {
                          setAssignedProjectIds(prev => prev.filter(id => id !== proj.id));
                        }
                      }}
                      className="mt-1 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-700">{proj.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{proj.code} · {proj.client}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-4">
              <button onClick={() => setShowAssignForm(false)} className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              <button
                onClick={saveProjectAssignment}
                disabled={assignBusy}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
              >
                {assignBusy ? "Allocating…" : "Save Allocation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/30 outline-none transition border-slate-200"
      />
    </div>
  );
}
