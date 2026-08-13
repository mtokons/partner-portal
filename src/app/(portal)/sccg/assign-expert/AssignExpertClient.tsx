"use client";

import { Fragment, useMemo, useState, useTransition, useRef } from "react";
import { ChevronDown, ChevronUp, Send, Save, Search, UserCheck, CalendarCheck, Paperclip } from "lucide-react";
import type { Session } from "@/types";
import type { AssignExpertPackageRow } from "./actions";
import {
  assignExpertAction,
  fetchPackageSessionsAction,
  sendMeetingLinkAction,
  updateSessionScheduleAction,
  assignSessionAction
} from "./actions";

interface ExpertOption {
  id: string;
  name: string;
  specialization: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  scheduled: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  rescheduled: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
};

const STATUS_OPTIONS: Session["status"][] = ["pending", "scheduled", "completed", "cancelled", "rescheduled"];

function toLocalInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

// Logic Mapping for Session Details
const SESSION_LOGIC = {
  "Student Visa": {
    1: { title: "Profile Assessment", details: ["Academic profile evaluation", "Eligibility checking", "Career pathway consultation", "University & course suggestion"] },
    2: { title: "1st Academic Session on Initial Preparation", details: ["Review academic profile and skills.", "Provide feedback to improve CV and motivation letter.", "Assist in shortlisting suitable universities.", "Outline a personalized study and career roadmap."] },
    3: { title: "2nd Academic Session on Document Finalization and Application", details: ["Review and finalize CV and motivation letter.", "Guide on application strategies and deadlines.", "Ensure all documents meet university requirements.", "Finalize the list of universities for application."] },
    4: { title: "3rd Academic Session on Advance Application Support", details: ["Tailor applications to specific university programs.", "Review application documents for completeness and quality.", "Share tips for accurate and timely submissions.", "Assist in the application submission process."] },
    5: { title: "4th Academic Session on Final Review, Scholarship & Career Planning", details: ["Follow up on submitted applications.", "Take steps based on follow up result.", "Provide tailored career advice for internships.", "Identify potential scholarships aligned with your profile."] },
  },
  "Ausbildung": {
    1: { title: "Profile Assessment", details: ["Academic profile evaluation", "Eligibility checking", "Career pathway consultation", "Job sector consultation"] },
    2: { title: "1st Professional Session on Career Consultation and Documents Review", details: ["Review and provide feedback on resume (CV), cover letter, and profile.", "Create a personalized career roadmap with actionable steps.", "Identify sectors and industries that align with skills and experiences.", "Discuss job roles and market demand to focus job search."] },
    3: { title: "2nd Professional Session on Advanced Application Strategies & Document Finalization", details: ["Discuss advanced job application strategies specific to the German job market.", "Customize applications for roles that align with goals.", "Finalize CV and cover letter to tailor them for job opportunities.", "Learn how to effectively navigate job portals to find the right positions."] },
    4: { title: "3rd Professional Session on Interview Preparation & LinkedIn Optimization", details: ["In-depth discussion on how recruitment works in Germany.", "Guidance on interview questions and strategies to address them effectively.", "Conduct mock interviews with a focus on industry-specific questions.", "Enhance LinkedIn profile to boost visibility to recruiters."] },
    5: { title: "4th Professional Session on Final Review & Career Strategy", details: ["Review networking experiences and insights.", "Assess the list of target companies compiled during Session 1.", "Conduct a final review of CV and cover letter to ensure they meet professional standards.", "Reflect on achievements and define next steps for career growth."] },
  }
};
// Opportunity Card shares Ausbildung logic
(SESSION_LOGIC as any)["Opportunity Card"] = SESSION_LOGIC["Ausbildung"];

export default function AssignExpertClient({
  packages,
  experts,
}: {
  packages: AssignExpertPackageRow[];
  experts: ExpertOption[];
}) {
  const [activeTab, setActiveTab] = useState<"assign-expert" | "assign-session">("assign-session");
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string>("");
  const [sessionsByPackage, setSessionsByPackage] = useState<Record<string, Session[]>>({});
  const [loadingSessions, setLoadingSessions] = useState<string>("");
  const [pendingExpert, setPendingExpert] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [savingSessionId, setSavingSessionId] = useState<string>("");

  // Assign Session Form State
  const [formCandidatePkgId, setFormCandidatePkgId] = useState("");
  const [formSessionNo, setFormSessionNo] = useState<number>(0);
  const [formSessionTitle, setFormSessionTitle] = useState("");
  const [formSessionDetailsOverride, setFormSessionDetailsOverride] = useState("");
  const [formExpertId, setFormExpertId] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formFile, setFormFile] = useState<File | null>(null);

  // We need the sessions for the selected candidate package to get the exact sessionId
  const selectedCandidateSessions = sessionsByPackage[formCandidatePkgId] || [];
  const selectedSessionObj = selectedCandidateSessions.find(s => s.sessionNumber === formSessionNo);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter(
      (p) =>
        p.customerName?.toLowerCase().includes(q) ||
        p.packageName.toLowerCase().includes(q) ||
        p.expertName?.toLowerCase().includes(q)
    );
  }, [packages, query]);

  function toggleExpand(pkg: AssignExpertPackageRow) {
    const next = expandedId === pkg.id ? "" : pkg.id;
    setExpandedId(next);
    if (next && !sessionsByPackage[pkg.id]) {
      setLoadingSessions(pkg.id);
      startTransition(async () => {
        const res = await fetchPackageSessionsAction(pkg.id);
        setSessionsByPackage((prev) => ({ ...prev, [pkg.id]: res.success && res.data ? res.data : [] }));
        setLoadingSessions("");
      });
    }
  }

  function handleLoadSessionsForForm(pkgId: string) {
    setFormCandidatePkgId(pkgId);
    setFormSessionNo(0);
    setFormSessionTitle("");
    setFormSessionDetailsOverride("");
    if (pkgId && !sessionsByPackage[pkgId]) {
      startTransition(async () => {
        const res = await fetchPackageSessionsAction(pkgId);
        setSessionsByPackage((prev) => ({ ...prev, [pkgId]: res.success && res.data ? res.data : [] }));
      });
    }
  }

  function handleSessionNoChange(no: number) {
    setFormSessionNo(no);
    const sessionObj = selectedCandidateSessions.find(s => s.sessionNumber === no);
    
    let cType = sessionObj?.candidateType;
    if (!cType) {
      const pkg = packages.find(p => p.id === formCandidatePkgId);
      if (pkg?.workflowCategory === "ausbildung") cType = "Ausbildung";
      else if (pkg?.workflowCategory === "opportunity-card") cType = "Opportunity Card";
      else cType = "Student Visa";
    }

    if (cType && (SESSION_LOGIC as any)[cType]?.[no]) {
      const logic = (SESSION_LOGIC as any)[cType][no];
      setFormSessionTitle(logic.title);
      // Map details array to bullet points string
      const bulletPoints = logic.details.map((d: string) => `• ${d}`).join("\n");
      setFormSessionDetailsOverride(sessionObj?.sessionDetailsOverride || bulletPoints);
    } else {
      setFormSessionTitle(`Session ${no}`);
      setFormSessionDetailsOverride(sessionObj?.sessionDetailsOverride || "");
    }
  }

  function handleAssign(pkg: AssignExpertPackageRow) {
    const expertId = pendingExpert[pkg.id];
    if (!expertId) return;
    startTransition(async () => {
      const res = await assignExpertAction(pkg.id, expertId);
      setBanner(
        res.success
          ? { type: "success", message: "Expert assigned successfully." }
          : { type: "error", message: res.error || "Failed to assign expert." }
      );
      if (res.success) window.location.reload();
    });
  }

  function updateLocalSession(packageId: string, sessionId: string, patch: Partial<Session>) {
    setSessionsByPackage((prev) => ({
      ...prev,
      [packageId]: (prev[packageId] || []).map((s) => (s.id === sessionId ? { ...s, ...patch } : s)),
    }));
  }

  function handleSaveSession(packageId: string, session: Session) {
    setSavingSessionId(session.id);
    startTransition(async () => {
      const res = await updateSessionScheduleAction({
        sessionId: session.id,
        scheduledAt: session.scheduledAt,
        meetingUrl: session.meetingUrl,
        status: session.status,
      });
      setBanner(
        res.success
          ? { type: "success", message: `Session #${session.sessionNumber} updated.` }
          : { type: "error", message: res.error || "Failed to update session." }
      );
      setSavingSessionId("");
    });
  }

  function handleSendLink(session: Session) {
    startTransition(async () => {
      const res = await sendMeetingLinkAction(session.id);
      setBanner(
        res.success
          ? { type: "success", message: `Meeting link sent for session #${session.sessionNumber}.` }
          : { type: "error", message: res.error || "Failed to send meeting link." }
      );
    });
  }

  function handleAssignSessionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formCandidatePkgId || !formSessionNo) {
      setBanner({ type: "error", message: "Please select a valid Candidate and Session No." });
      return;
    }
    
    startTransition(async () => {
      const formData = new FormData();
      formData.append("sessionId", selectedSessionObj?.id || "0");
      formData.append("candidatePkgId", formCandidatePkgId);
      formData.append("sessionNumber", formSessionNo.toString());
      formData.append("expertId", formExpertId);
      if (formSessionTitle) formData.append("sessionTitle", formSessionTitle);
      if (formSessionDetailsOverride) formData.append("sessionDetailsOverride", formSessionDetailsOverride);
      if (formDate) formData.append("scheduledAt", new Date(formDate).toISOString());
      if (formNotes) formData.append("notes", formNotes);
      if (formFile) formData.append("cvFile", formFile);

      const res = await assignSessionAction(formData);
      if (res.success) {
        setBanner({ type: "success", message: "Session assigned and emails sent successfully!" });
        setFormSessionNo(0);
        setFormExpertId("");
        setFormNotes("");
        setFormFile(null);
        setFormDate("");
        // Refresh local cache
        const updated = await fetchPackageSessionsAction(formCandidatePkgId);
        if (updated.success && updated.data) {
           setSessionsByPackage(prev => ({ ...prev, [formCandidatePkgId]: updated.data! }));
        }
      } else {
        setBanner({ type: "error", message: res.error || "Failed to assign session." });
      }
    });
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab("assign-session")}
          className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "assign-session"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> B. Assign Session</div>
        </button>
        <button
          onClick={() => setActiveTab("assign-expert")}
          className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "assign-expert"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2"><UserCheck className="w-4 h-4" /> A. Assign Expert (Packages)</div>
        </button>
      </div>

      {banner && (
        <div
          className={`rounded-xl border p-3 text-sm ${
            banner.type === "success"
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-destructive/40 bg-destructive/5 text-destructive"
          }`}
        >
          {banner.message}
        </div>
      )}

      {activeTab === "assign-session" && (
        <div className="max-w-3xl rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <h2 className="text-lg font-semibold">Assign Session Details</h2>
            <p className="text-sm text-muted-foreground">Schedule a specific session with an expert, auto-calculating session logic and sending notifications.</p>
          </div>
          <form onSubmit={handleAssignSessionSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Candidate Name / Package</label>
                <select 
                  required
                  value={formCandidatePkgId}
                  onChange={(e) => handleLoadSessionsForForm(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select Candidate...</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.customerName || "Unknown"} ({p.packageName})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Session No.</label>
                <select 
                  required
                  disabled={!formCandidatePkgId}
                  value={formSessionNo}
                  onChange={(e) => handleSessionNoChange(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value={0}>Select Session...</option>
                  {[1, 2, 3, 4, 5].map(num => {
                    const existing = selectedCandidateSessions.find(s => s.sessionNumber === num);
                    return (
                      <option key={num} value={num}>
                        Session {num} {existing && existing.status === "scheduled" ? "(Already Scheduled)" : ""}
                      </option>
                    );
                  })}
                </select>
                {!formCandidatePkgId && <p className="text-xs text-muted-foreground">Select candidate first to load sessions.</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Session Title</label>
                <input 
                  required
                  value={formSessionTitle}
                  onChange={(e) => setFormSessionTitle(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Profile Assessment"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Session Details / Agenda</label>
                <textarea 
                  required
                  rows={4}
                  value={formSessionDetailsOverride}
                  onChange={(e) => setFormSessionDetailsOverride(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Provide session agenda or bullet points..."
                />
                <p className="text-xs text-muted-foreground">You can manually edit this agenda. It will be emailed to both the candidate and expert.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Expert Name</label>
                <select 
                  required
                  value={formExpertId}
                  onChange={(e) => setFormExpertId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select Expert...</option>
                  {experts.map(e => (
                    <option key={e.id} value={e.id}>{e.name} — {e.specialization}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date and Time</label>
                <input 
                  type="datetime-local"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Additional Note</label>
                <textarea 
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Notes for the expert and candidate..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Attach CV</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer border border-border transition-colors text-sm font-medium">
                    <Paperclip className="w-4 h-4" />
                    <span>{formFile ? formFile.name : "Choose File..."}</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {formFile && (
                    <button type="button" onClick={() => setFormFile(null)} className="text-xs text-destructive hover:underline">
                      Remove
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">An automatic email with the details and CV will be sent to the Expert and Candidate.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? "Assigning..." : "Assign Session & Send Emails"} <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "assign-expert" && (
        <>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by client, package, or expert..."
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2 text-sm"
            />
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border bg-muted/40">
                  <th className="py-2 px-3">Client</th>
                  <th className="py-2 px-3">Package</th>
                  <th className="py-2 px-3">Sessions</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Expert</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pkg) => (
                  <Fragment key={pkg.id}>
                    <tr className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{pkg.customerName || "—"}</td>
                      <td className="py-2 px-3">{pkg.packageName}</td>
                      <td className="py-2 px-3">
                        {pkg.completedSessions} / {pkg.totalSessions}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${STATUS_COLORS[pkg.status] || STATUS_COLORS.pending}`}>
                          {pkg.status}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={pendingExpert[pkg.id] ?? pkg.expertId ?? ""}
                            onChange={(e) => setPendingExpert((prev) => ({ ...prev, [pkg.id]: e.target.value }))}
                            className="rounded-lg border border-input bg-background px-2 py-1 text-xs"
                          >
                            <option value="">Unassigned</option>
                            {experts.map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.name}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAssign(pkg)}
                            disabled={!pendingExpert[pkg.id] || pendingExpert[pkg.id] === pkg.expertId}
                            className="rounded-lg bg-primary text-primary-foreground px-2 py-1 text-xs font-medium disabled:opacity-40"
                          >
                            Assign
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button onClick={() => toggleExpand(pkg)} className="text-muted-foreground hover:text-foreground">
                          {expandedId === pkg.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                    {expandedId === pkg.id && (
                      <tr>
                        <td colSpan={6} className="bg-muted/20 p-4">
                          {loadingSessions === pkg.id ? (
                            <p className="text-xs text-muted-foreground">Loading sessions…</p>
                          ) : (
                            <div className="space-y-2">
                              {(sessionsByPackage[pkg.id] || []).length === 0 ? (
                                <p className="text-xs text-muted-foreground">No sessions found for this package.</p>
                              ) : (
                                (sessionsByPackage[pkg.id] || []).map((session) => (
                                  <div
                                    key={session.id}
                                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2 text-xs"
                                  >
                                    <span className="font-semibold w-16">#{session.sessionNumber}</span>
                                    <input
                                      type="datetime-local"
                                      value={toLocalInputValue(session.scheduledAt)}
                                      onChange={(e) =>
                                        updateLocalSession(pkg.id, session.id, {
                                          scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                                        })
                                      }
                                      className="rounded-md border border-input bg-background px-2 py-1"
                                    />
                                    <input
                                      type="url"
                                      placeholder="Meeting link (https://...)"
                                      value={session.meetingUrl || ""}
                                      onChange={(e) => updateLocalSession(pkg.id, session.id, { meetingUrl: e.target.value })}
                                      className="rounded-md border border-input bg-background px-2 py-1 flex-1 min-w-[180px]"
                                    />
                                    <select
                                      value={session.status}
                                      onChange={(e) => updateLocalSession(pkg.id, session.id, { status: e.target.value as Session["status"] })}
                                      className={`rounded-md border border-input px-2 py-1 font-semibold uppercase ${STATUS_COLORS[session.status] || STATUS_COLORS.pending}`}
                                    >
                                      {STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s}>
                                          {s}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => handleSaveSession(pkg.id, session)}
                                      disabled={savingSessionId === session.id}
                                      className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-2 py-1 font-medium disabled:opacity-50"
                                    >
                                      <Save className="w-3 h-3" /> Save
                                    </button>
                                    <button
                                      onClick={() => handleSendLink(session)}
                                      disabled={!session.meetingUrl}
                                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 font-medium disabled:opacity-40"
                                    >
                                      <Send className="w-3 h-3" /> Send Link
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No packages found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
