"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Send, Save, Search, UserCheck, CalendarCheck, Paperclip, Sparkles, BookOpen, Briefcase, GraduationCap, Languages } from "lucide-react";
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

export const SESSION_CATEGORIES = [
  { id: "Student Visa", label: "Academic / Student Visa", icon: GraduationCap },
  { id: "Ausbildung", label: "Ausbildung (Vocational Training)", icon: BookOpen },
  { id: "Employment", label: "Employment / Opportunity Card / Job Seeker", icon: Briefcase },
  { id: "Training & Language", label: "Training & Language", icon: Languages },
] as const;

// Comprehensive Logic Mapping for 1-5 Sessions Across All Service Tracks
export const SESSION_LOGIC: Record<string, Record<number, { title: string; details: string[] }>> = {
  "Student Visa": {
    1: {
      title: "Profile Assessment & Academic Pathway",
      details: [
        "Academic profile evaluation & qualification verification",
        "Anabin & Uni-Assist eligibility checking",
        "University & course shortlisting consultation",
        "Personalized study roadmap and application timeline"
      ]
    },
    2: {
      title: "1st Academic Session: Initial Preparation & CV Architecture",
      details: [
        "Review academic background, transcripts, and technical skills",
        "Provide in-depth feedback to improve German-standard academic CV",
        "Draft and structure Statement of Purpose / Motivation Letter",
        "Outline language certificate requirements (IELTS/TOEFL/TestDaF) and deadlines"
      ]
    },
    3: {
      title: "2nd Academic Session: Document Finalization & Application Strategy",
      details: [
        "Review and finalize academic CV and Motivation Letter",
        "Uni-Assist portal profile setup and documentation verification",
        "Ensure all certified translations and apostilles meet German university standards",
        "Finalize priority university application list"
      ]
    },
    4: {
      title: "3rd Academic Session: Advance Application Support & Submission",
      details: [
        "Tailor applications to specific university degree requirements",
        "Detailed quality check on all uploaded application documents",
        "Live guidance on application submission process and fee handling",
        "Post-submission tracking and faculty correspondence management"
      ]
    },
    5: {
      title: "4th Academic Session: Final Review, Scholarship & Career Planning",
      details: [
        "Admission offer review and formal enrollment acceptance",
        "Identify DAAD and institution-specific scholarships aligned with profile",
        "German student visa dossier preparation and Sperrkonto (Blocked Account) guidance",
        "Part-time student work (Werkstudent) and long-term career planning in Germany"
      ]
    }
  },
  "Ausbildung": {
    1: {
      title: "Profile Assessment & Vocational Track Consultation",
      details: [
        "Educational background and secondary school credential assessment",
        "German language level check (B1/B2 vocational requirement)",
        "Sector consultation (Nursing, IT, Hospitality, Mechatronics, Crafts)",
        "Step-by-step vocational training roadmap and application timeline"
      ]
    },
    2: {
      title: "1st Professional Session: Career Consultation & Document Review",
      details: [
        "Review and optimize resume (Tabellarischer Lebenslauf) for German employers",
        "Draft tailored cover letter (Anschreiben) for specific Ausbildung openings",
        "Identify regional chambers (IHK/HWK) and accredited training companies",
        "Overview of dual vocational training system (Berufsschule + Betrieb)"
      ]
    },
    3: {
      title: "2nd Professional Session: Advanced Application Strategies & Document Finalization",
      details: [
        "Advanced application strategies on German portals (Azubi.de, Ausbildung.de, Arbeitsagentur)",
        "Customizing applications and direct speculative outreach (Initiativbewerbung)",
        "Document certification and school leaving certificate recognition (Zeugnisanerkennung)",
        "Tracking company responses and follow-up communication"
      ]
    },
    4: {
      title: "3rd Professional Session: Interview Preparation & Mock Interview",
      details: [
        "In-depth guidance on German vocational job interview standards",
        "Preparation for common motivation, behavioral, and practical questions",
        "Conduct realistic mock interview in German with actionable feedback",
        "Professional workplace etiquette and etiquette with German recruiters"
      ]
    },
    5: {
      title: "4th Professional Session: Final Review, Contract & Visa Strategy",
      details: [
        "Review Ausbildung contract (Ausbildungsvertrag) & vocational school registration",
        "Federal Employment Agency approval (ZAV / Vorabzustimmung) guidance",
        "Visa application package preparation and embassy appointment checklist",
        "Relocation, accommodation search, and successful onboarding in Germany"
      ]
    }
  },
  "Employment": {
    1: {
      title: "Profile Assessment & German Job Market Viability",
      details: [
        "Professional experience, skill gap, and qualification evaluation",
        "Degree comparability verification (Anabin / ZAB Statement of Comparability)",
        "Opportunity Card (Chancenkarte) point score calculation and eligibility",
        "Target industries, salary benchmarks, and German job market mapping"
      ]
    },
    2: {
      title: "1st Professional Session: German-Standard CV & Cover Letter Architecture",
      details: [
        "Full restructuring of CV into German DIN 5008 / ATS-friendly format",
        "Crafting high-converting cover letters (Anschreiben) tailored to role requirements",
        "LinkedIn and Xing profile optimization for German recruiters and headhunters",
        "Designing a targeted, high-yield job application strategy"
      ]
    },
    3: {
      title: "2nd Professional Session: Advanced Job Search & Application Strategy",
      details: [
        "Strategic navigation of German portals (StepStone, Indeed, LinkedIn, Xing)",
        "Direct company applications and high-impact speculative outreach (Initiativbewerbung)",
        "Tailoring technical dossiers and project portfolios for German employers",
        "Networking strategies and working with specialized German recruitment agencies"
      ]
    },
    4: {
      title: "3rd Professional Session: German Interview Mastery & Mock Interview",
      details: [
        "Understanding German recruitment cycles (HR Screening, Technical Round, Management Interview)",
        "Mastering behavioral questions (STAR technique) and Germany-specific workplace scenarios",
        "Full-length simulated mock interview with real-time feedback",
        "Salary negotiation tactics and German compensation structure (Gross/Net, benefits)"
      ]
    },
    5: {
      title: "4th Professional Session: Contract Review, Visa & Probation Strategy",
      details: [
        "Employment contract (Arbeitsvertrag) legal and terms review",
        "Work visa / EU Blue Card application support and embassy dossier checklist",
        "Probation period (Probezeit) success strategy and workplace integration",
        "Long-term career progression and permanent residency (Niederlassungserlaubnis) roadmap"
      ]
    }
  },
  "Training & Language": {
    1: {
      title: "Language & Skills Assessment",
      details: [
        "CEFR German language level diagnostic (A1, A2, B1, B2, C1)",
        "Identify learning goals, milestones, and target exam dates (Goethe, TELC, TestDaF)",
        "Personalized study curriculum and daily practice schedule",
        "Recommended learning materials, digital tools, and immersion techniques"
      ]
    },
    2: {
      title: "1st Training Session: Core Fundamentals & Grammar Mastery",
      details: [
        "Focused instruction on complex German grammar structures (Cases, Tenses, Sentence Order)",
        "Vocabulary expansion strategies tailored to professional and academic needs",
        "Interactive pronunciation, phonetics, and speaking drills",
        "Homework assignment and practical writing exercises"
      ]
    },
    3: {
      title: "2nd Training Session: Professional & Academic Communication",
      details: [
        "Formal email, letter, and report writing in German",
        "Workplace and classroom conversational fluency drills",
        "Listening comprehension exercises with authentic German audio and media",
        "Interactive roleplay (meetings, consultations, client interactions)"
      ]
    },
    4: {
      title: "3rd Training Session: Official Exam Preparation & Mock Test",
      details: [
        "Breakdown of target exam format (Reading, Listening, Writing, Speaking)",
        "Timed module walkthrough and time-management strategies",
        "Conducting a full simulated speaking exam with real-time scoring",
        "Targeted analysis of common pitfalls and error correction"
      ]
    },
    5: {
      title: "4th Training Session: Final Review & Next Stage Transition",
      details: [
        "Final readiness evaluation and personalized test-day strategy",
        "Review of high-yield exam tips and confidence building",
        "Transition roadmap into Academic, Ausbildung, or Employment applications",
        "Course completion review and ongoing language maintenance plan"
      ]
    }
  }
};

// Aliases
SESSION_LOGIC["Academic"] = SESSION_LOGIC["Student Visa"];
SESSION_LOGIC["Opportunity Card"] = SESSION_LOGIC["Employment"];
SESSION_LOGIC["Job Seeker"] = SESSION_LOGIC["Employment"];
SESSION_LOGIC["Training"] = SESSION_LOGIC["Training & Language"];
SESSION_LOGIC["Language"] = SESSION_LOGIC["Training & Language"];

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
  const [formCategory, setFormCategory] = useState<string>("Student Visa");
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

  function detectCategoryForPackage(pkg?: AssignExpertPackageRow): string {
    if (!pkg) return "Student Visa";
    const cat = (pkg.workflowCategory || "").toLowerCase();
    const name = (pkg.packageName || "").toLowerCase();

    if (cat.includes("ausbildung") || name.includes("ausbildung")) return "Ausbildung";
    if (cat.includes("opportunity") || cat.includes("card") || name.includes("opportunity") || name.includes("card") || name.includes("job") || name.includes("employ")) return "Employment";
    if (cat.includes("training") || cat.includes("language") || name.includes("training") || name.includes("language") || name.includes("german")) return "Training & Language";
    return "Student Visa";
  }

  function handleLoadSessionsForForm(pkgId: string) {
    setFormCandidatePkgId(pkgId);
    setFormSessionNo(0);
    setFormSessionTitle("");
    setFormSessionDetailsOverride("");

    const pkg = packages.find(p => p.id === pkgId);
    const autoCat = detectCategoryForPackage(pkg);
    setFormCategory(autoCat);

    if (pkgId && !sessionsByPackage[pkgId]) {
      startTransition(async () => {
        const res = await fetchPackageSessionsAction(pkgId);
        setSessionsByPackage((prev) => ({ ...prev, [pkgId]: res.success && res.data ? res.data : [] }));
      });
    }
  }

  function applySessionLogic(category: string, sessionNo: number) {
    if (sessionNo === 0) {
      setFormSessionTitle("");
      setFormSessionDetailsOverride("");
      return;
    }

    const sessionObj = selectedCandidateSessions.find(s => s.sessionNumber === sessionNo);
    const logic = SESSION_LOGIC[category]?.[sessionNo] || SESSION_LOGIC["Student Visa"][sessionNo];

    if (logic) {
      setFormSessionTitle(logic.title);
      const bulletPoints = logic.details.map((d: string) => `• ${d}`).join("\n");
      setFormSessionDetailsOverride(sessionObj?.sessionDetailsOverride || bulletPoints);
    } else {
      setFormSessionTitle(`Session ${sessionNo}`);
      setFormSessionDetailsOverride(sessionObj?.sessionDetailsOverride || "");
    }
  }

  function handleCategoryChange(newCategory: string) {
    setFormCategory(newCategory);
    if (formSessionNo > 0) {
      applySessionLogic(newCategory, formSessionNo);
    }
  }

  function handleSessionNoChange(no: number) {
    setFormSessionNo(no);
    applySessionLogic(formCategory, no);
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
      formData.append("category", formCategory);
      if (formSessionTitle) formData.append("sessionTitle", formSessionTitle);
      if (formSessionDetailsOverride) formData.append("sessionDetailsOverride", formSessionDetailsOverride);
      if (formDate) formData.append("scheduledAt", new Date(formDate).toISOString());
      if (formNotes) formData.append("notes", formNotes);
      if (formFile) formData.append("cvFile", formFile);

      const res = await assignSessionAction(formData);
      if (res.success) {
        setBanner({ type: "success", message: res.message || "Session assigned and emails sent successfully!" });
        const assignedPkgId = formCandidatePkgId;
        setFormCandidatePkgId("");
        setFormSessionNo(0);
        setFormExpertId("");
        setFormNotes("");
        setFormFile(null);
        setFormDate("");
        setFormSessionTitle("");
        setFormSessionDetailsOverride("");
        // Refresh local cache
        if (assignedPkgId) {
          const updated = await fetchPackageSessionsAction(assignedPkgId);
          if (updated.success && updated.data) {
            setSessionsByPackage(prev => ({ ...prev, [assignedPkgId]: updated.data! }));
          }
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
          <div className="flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> Assign Session Details & Email</div>
        </button>
        <button
          onClick={() => setActiveTab("assign-expert")}
          className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
            activeTab === "assign-expert"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2"><UserCheck className="w-4 h-4" /> Package Overview & Experts</div>
        </button>
      </div>

      {banner && (
        <div
          className={`rounded-xl border p-3.5 text-sm font-medium ${
            banner.type === "success"
              ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-destructive/40 bg-destructive/5 text-destructive"
          }`}
        >
          {banner.message}
        </div>
      )}

      {activeTab === "assign-session" && (
        <div className="max-w-4xl rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="p-5 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Assign Session Details & Schedule Meeting</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Select candidate, service category (Academic, Ausbildung, Employment, or Training), session number, and expert. Predefined curriculum details will load automatically.
            </p>
          </div>
          
          <form onSubmit={handleAssignSessionSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Candidate Selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Candidate Name / Registered Service</label>
                <select 
                  required
                  value={formCandidatePkgId}
                  onChange={(e) => handleLoadSessionsForForm(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">Select Candidate...</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.customerName || "Unknown"} — {p.packageName}</option>
                  ))}
                </select>
              </div>

              {/* Service Track / Category */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Service Track / Pathway Category</label>
                <select
                  required
                  value={formCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                >
                  {SESSION_CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground">Adjust category to auto-switch between Academic, Ausbildung, Employment, or Training curricula.</p>
              </div>

              {/* Session Number */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Session No.</label>
                <select 
                  required
                  disabled={!formCandidatePkgId}
                  value={formSessionNo}
                  onChange={(e) => handleSessionNoChange(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50 font-medium"
                >
                  <option value={0}>Select Session (1 to 5)...</option>
                  {[1, 2, 3, 4, 5].map(num => {
                    const existing = selectedCandidateSessions.find(s => s.sessionNumber === num);
                    return (
                      <option key={num} value={num}>
                        Session {num} {existing && existing.status === "scheduled" ? "✓ (Scheduled)" : ""}
                      </option>
                    );
                  })}
                </select>
                {!formCandidatePkgId && <p className="text-xs text-muted-foreground">Select candidate first to view session schedule.</p>}
              </div>

              {/* Session Title */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Session Title</label>
                <input 
                  required
                  value={formSessionTitle}
                  onChange={(e) => setFormSessionTitle(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="e.g. Profile Assessment & Vocational Track Consultation"
                />
              </div>

              {/* Session Details / Agenda */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-foreground">Session Agenda & Curriculum Points</label>
                <textarea 
                  required
                  rows={5}
                  value={formSessionDetailsOverride}
                  onChange={(e) => setFormSessionDetailsOverride(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none font-mono text-xs leading-relaxed"
                  placeholder="Auto-populated session agenda bullet points..."
                />
                <p className="text-xs text-muted-foreground">This agenda will be formatted and emailed automatically to both the Candidate and the Expert.</p>
              </div>

              {/* Expert Selector */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Assign Expert</label>
                <select 
                  required
                  value={formExpertId}
                  onChange={(e) => setFormExpertId(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="">Select Expert...</option>
                  {experts.map(e => (
                    <option key={e.id} value={e.id}>{e.name} ({e.specialization || "Expert"})</option>
                  ))}
                </select>
              </div>

              {/* Scheduled Date and Time */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Date and Time</label>
                <input 
                  type="datetime-local"
                  required
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              {/* Additional Notes */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-foreground">Additional Notes & Instructions (Optional)</label>
                <textarea 
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Special instructions for expert or meeting preparation instructions for candidate..."
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>

              {/* CV Attachment */}
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-foreground">Attach Candidate CV / Dossier (Optional)</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-muted hover:bg-muted/80 rounded-xl cursor-pointer border border-border transition-colors text-sm font-medium">
                    <Paperclip className="w-4 h-4 text-primary" />
                    <span>{formFile ? formFile.name : "Choose CV / Document File (PDF, DOCX)..."}</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {formFile && (
                    <button type="button" onClick={() => setFormFile(null)} className="text-xs text-destructive hover:underline font-semibold">
                      Remove File
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">If attached, the file will be sent as an email attachment directly to the assigned expert.</p>
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-7 py-3 text-sm font-bold shadow-md hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Assigning & Sending Emails..." : "Assign Session & Send Emails"} <Send className="w-4 h-4" />
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
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Package</th>
                  <th className="py-3 px-4">Sessions</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Expert</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((pkg) => (
                  <Fragment key={pkg.id}>
                    <tr className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold">{pkg.customerName || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{pkg.packageName}</td>
                      <td className="py-3 px-4 font-medium">
                        {pkg.completedSessions} / {pkg.totalSessions}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${STATUS_COLORS[pkg.status] || STATUS_COLORS.pending}`}>
                          {pkg.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => toggleExpand(pkg)} className="text-muted-foreground hover:text-foreground cursor-pointer">
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
                                    className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2.5 text-xs shadow-sm"
                                  >
                                    <span className="font-bold w-16 text-primary">#{session.sessionNumber}</span>
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
