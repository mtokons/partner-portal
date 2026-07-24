"use client";

import React, { useState, useEffect, useRef } from "react";
import { generateCvPdfBlob, exportCvToPdf, exportCvToDocx, A4_WIDTH_PX, A4_HEIGHT_PX } from "@/lib/cv-export";
import {
  ArrowLeft, Upload, Sparkles, Check, Download, Save,
  User, Layers, Palette, Mail, Phone, BookOpen, Briefcase,
  FileText, CheckSquare, Languages, HelpCircle, LayoutGrid, Trash2, Plus,
  ChevronDown, ChevronUp, Image as ImageIcon, Award, ShieldCheck, Heart,
  BarChart3, Rocket, Target, Globe, MapPin, Calendar,
  FileDown, Share2, Loader2, Wand2, Star, TrendingUp, RefreshCw, X, LogIn, Eye
} from "lucide-react";

const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
);

/* ═══════════════ TYPES ═══════════════ */
interface CustomSection { title: string; content: string; }

interface CandidateData {
  name: string; title: string; email: string; phone: string;
  address: string; nationality: string; birthDate: string; website: string;
  profileSummary: string; skills: string[];
  experience: { company: string; role: string; period: string; details: string }[];
  education: { school: string; degree: string; period: string }[];
  customSections: CustomSection[];
}

/* ═══════════════ INITIAL DATA ═══════════════ */
const INITIAL_PROFILES: Record<string, CandidateData> = {
  "Max Mustermann": {
    name: "Max Mustermann", title: "Senior Cloud Architect",
    email: "max.mustermann@sccg.de", phone: "+49 176 1234567",
    address: "Kronenstraße 19, 10969 Berlin", nationality: "Deutsch",
    birthDate: "07.12.1979", website: "https://linkedin.com/in/maxmustermann",
    profileSummary: "Dynamic Cloud Architect with over 15 years of experience spearheading cloud infrastructure development and competency-based microservices. Proven track record of leading multi-stakeholder migration projects and automation pipelines to maximize delivery efficiency.",
    skills: ["Cloud Architecture", "Kubernetes", "AWS / GCP", "Terraform", "Go / Python", "Sales Strategy"],
    experience: [
      { company: "SCCG Solution Partner", role: "Senior Cloud Infrastructure Lead", period: "2023 - Present", details: "Designed robust Kubernetes multi-cluster setups, automated CI/CD workflows, and cut hosting costs by 35%." },
      { company: "Siemens AG", role: "DevOps Engineer", period: "2020 - 2023", details: "Maintained cloud infrastructure deployments and integrated security scanning across deployment pipelines." }
    ],
    education: [{ school: "TU München", degree: "M.Sc. in Computer Science", period: "2017 - 2019" }],
    customSections: [{ title: "Achievements", content: "• Reduced cluster latency by 40%.\n• Managed 5 major cloud migration releases." }]
  },
  "Elena Petrova": {
    name: "Elena Petrova", title: "DevOps Specialist",
    email: "elena.petrova@gmail.com", phone: "+49 152 9876543",
    address: "Adalbertstraße 12, 80799 München", nationality: "Bulgarian",
    birthDate: "14.04.1993", website: "https://github.com/elenapetrova",
    profileSummary: "Motivated DevOps Engineer focused on infrastructure as code automation, cluster health, and modern GitOps delivery practices.",
    skills: ["CI/CD Pipelines", "Docker", "Ansible", "Kubernetes", "Jenkins"],
    experience: [
      { company: "Educraft GmbH", role: "DevOps Specialist", period: "2022 - Present", details: "Maintained infrastructure deployments, set up Prometheus monitoring, and optimized delivery times." },
      { company: "Handwerk Service AG", role: "System Administrator", period: "2019 - 2022", details: "Managed system servers, network administration, and helped migrate bare-metal servers to the cloud." }
    ],
    education: [{ school: "Sofia University", degree: "B.Sc. in Software Engineering", period: "2015 - 2019" }],
    customSections: []
  }
};

const EMPTY_CANDIDATE: CandidateData = {
  name: "", title: "", email: "", phone: "",
  address: "", nationality: "", birthDate: "", website: "",
  profileSummary: "", skills: [], experience: [], education: [], customSections: [],
};

const BLANK_CANDIDATE_KEY = "__blank__";
const NEW_CANDIDATE_KEY = "__new__";

/* ═══════════════ COLOR THEMES ═══════════════ */
const COLOR_THEMES: Record<string, { sidebar: string; sidebarText: string; accent: string; headerText: string; border: string }> = {
  "Ocean Navy":     { sidebar: "#0f172a", sidebarText: "#e2e8f0", accent: "#3b82f6", headerText: "#0f172a", border: "#3b82f6" },
  "Charcoal Grey":  { sidebar: "#374151", sidebarText: "#e5e7eb", accent: "#4b5563", headerText: "#1f2937", border: "#4b5563" },
  "Crimson Red":    { sidebar: "#991b1b", sidebarText: "#fecaca", accent: "#dc2626", headerText: "#7f1d1d", border: "#dc2626" },
  "Forest Green":   { sidebar: "#065f46", sidebarText: "#d1fae5", accent: "#059669", headerText: "#064e3b", border: "#059669" },
  "Royal Purple":   { sidebar: "#581c87", sidebarText: "#e9d5ff", accent: "#7c3aed", headerText: "#4c1d95", border: "#7c3aed" },
  "Sunset Orange":  { sidebar: "#9a3412", sidebarText: "#fed7aa", accent: "#ea580c", headerText: "#7c2d12", border: "#ea580c" },
};

type TemplateId = "sapphire" | "slate" | "geometric" | "gold" | "brock" | "timeline" | "two_column";
const TEMPLATES: { id: TemplateId; label: string; desc: string }[] = [
  { id: "sapphire",   label: "Sapphire Sidebar",      desc: "Left sidebar with photo + right content" },
  { id: "slate",      label: "Slate Minimal",          desc: "Clean minimal flat layout, no solid background blocks" },
  { id: "geometric",  label: "Geometric Tech",         desc: "Multi-column with modern border accents" },
  { id: "gold",       label: "Gold Classic",           desc: "Serif font with right-side sidebar and gold details" },
  { id: "brock",      label: "Brock Header",           desc: "Thick header banner at top with grid below" },
  { id: "timeline",   label: "Timeline Professional",  desc: "Experience shown inside chronological timeline dots" },
  { id: "two_column", label: "Two-Column Modern",      desc: "Perfect 50/50 split vertical column layout" },
];

export default function KickresumeCvMakerPage() {
  const [activeTab, setActiveTab] = useState<"fill" | "design" | "improve" | "download">("fill");
  const [selectedCandidate, setSelectedCandidate] = useState("Max Mustermann");
  const [candidates, setCandidates] = useState<Record<string, CandidateData>>(INITIAL_PROFILES);

  // Accordion
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["personal"]));

  // Design settings
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>("sapphire");
  const [selectedColor, setSelectedColor] = useState("Ocean Navy");
  const [selectedFont, setSelectedFont] = useState("Inter");
  const [hasPhoto, setHasPhoto] = useState(true);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // CV data
  const [cvData, setCvData] = useState<CandidateData>(INITIAL_PROFILES["Max Mustermann"]);

  // File upload & parser
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStatus, setExtractionStatus] = useState("");
  // LinkedIn pop-up modal states
  const [showLinkedInModal, setShowLinkedInModal] = useState(false);
  const [linkedInUser, setLinkedInUser] = useState<string | null>(null);
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false);
  const [linkedInEmail, setLinkedInEmail] = useState("");
  const [linkedInPassword, setLinkedInPassword] = useState("");

  // AI improve
  const [isImproving, setIsImproving] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{
    overall_score?: number; ats_score?: number;
    suggestions?: string[]; experience_tips?: string[];
    suggested_skills?: string[];
  } | null>(null);

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [showNewCandidateModal, setShowNewCandidateModal] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState("");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Spacing and sizing design tokens
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [lineHeight, setLineHeight] = useState<"tight" | "normal" | "loose">("normal");
  const [sectionSpacing, setSectionSpacing] = useState<"compact" | "normal" | "spacious">("normal");
  const [pageMargin, setPageMargin] = useState<"compact" | "standard" | "spacious">("standard");

  // ATS optimizer states
  const [targetJobDesc, setTargetJobDesc] = useState("");
  const [isAtsAnalyzing, setIsAtsAnalyzing] = useState(false);
  const [atsAnalysisResult, setAtsAnalysisResult] = useState<{
    overall_score?: number;
    matched_keywords?: string[];
    missing_keywords?: string[];
    suggestions?: string[];
    formatting_issues?: string[];
  } | null>(null);

  // Inline bullet optimizer loading states (keyed by experience index)
  const [improvingBullets, setImprovingBullets] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const loadCandidates = async () => {
      let currentProfiles = { ...INITIAL_PROFILES };

      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("sccg_profiles");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            currentProfiles = { ...currentProfiles, ...parsed };
          } catch {}
        }
      }

      // Fetch real seekers from SharePoint API
      try {
        const apiRes = await fetch("/api/cv-maker/candidates");
        const apiData = await apiRes.json();
        if (apiData.success && apiData.candidates?.length > 0) {
          apiData.candidates.forEach((c: CandidateData) => {
            currentProfiles[c.name] = c;
          });
        }
      } catch (err) {
        console.error("Failed to fetch registered seekers:", err);
      }

      setCandidates(currentProfiles);

      // Parse URL parameters
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const candParam = params.get("candidate");
        const isBlank = params.get("blank") === "true";
        const isNew = params.get("new") === "true";

        if (isBlank) {
          setSelectedCandidate(BLANK_CANDIDATE_KEY);
          setCvData({ ...EMPTY_CANDIDATE });
        } else if (isNew) {
          setShowNewCandidateModal(true);
        } else if (candParam) {
          const matchKey = Object.keys(currentProfiles).find(
            k => k.toLowerCase().includes(candParam.toLowerCase())
          );
          if (matchKey) {
            setSelectedCandidate(matchKey);
            setCvData(currentProfiles[matchKey]);
          } else {
            // Candidate not found — create new profile with that name
            const newProfile: CandidateData = { ...EMPTY_CANDIDATE, name: decodeURIComponent(candParam) };
            currentProfiles[newProfile.name] = newProfile;
            setCandidates(currentProfiles);
            setSelectedCandidate(newProfile.name);
            setCvData(newProfile);
          }
        }
      }
    };

    loadCandidates();
  }, []);

  // Sync state when selected candidate changes
  useEffect(() => {
    if (selectedCandidate === BLANK_CANDIDATE_KEY) {
      setCvData(EMPTY_CANDIDATE);
      return;
    }
    if (selectedCandidate === NEW_CANDIDATE_KEY) return;
    const profile = candidates[selectedCandidate];
    if (profile) setCvData(profile);
  }, [selectedCandidate, candidates]);

  const handleCandidateChange = (value: string) => {
    if (value === NEW_CANDIDATE_KEY) {
      setShowNewCandidateModal(true);
      return;
    }
    setSelectedCandidate(value);
    if (value === BLANK_CANDIDATE_KEY) {
      setCvData({ ...EMPTY_CANDIDATE });
    } else if (candidates[value]) {
      setCvData(candidates[value]);
    }
  };

  const handleCreateNewCandidate = () => {
    const name = newCandidateName.trim();
    if (!name) {
      alert("Please enter a candidate name.");
      return;
    }
    const newProfile: CandidateData = { ...EMPTY_CANDIDATE, name };
    const updated = { ...candidates, [name]: newProfile };
    setCandidates(updated);
    setSelectedCandidate(name);
    setCvData(newProfile);
    setNewCandidateName("");
    setShowNewCandidateModal(false);
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // Helper to remove any JSON tags from Gemini
  const cleanAiText = (txt: string) => {
    if (!txt) return "";
    let cleaned = txt.trim();
    if (cleaned.startsWith("{")) {
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.improved) return parsed.improved;
        if (parsed.improved_summary) return parsed.improved_summary;
      } catch {
        const match = cleaned.match(/"(?:improved|improved_summary)"\s*:\s*"([\s\S]*?)"/);
        if (match) return match[1].replace(/\\"/g, '"');
      }
    }
    return cleaned;
  };

  /* ── REAL AI EXTRACTION ── */
  const handleStartExtraction = async () => {
    if (!uploadedFile) return;
    setIsExtracting(true);
    setExtractionStatus("Uploading file to FastAPI text parser...");

    try {
      const fd = new FormData();
      fd.append("file", uploadedFile);

      setExtractionStatus("Extracting raw document streams...");
      const res = await fetch("/api/cv-maker/extract", { method: "POST", body: fd });

      if (!res.ok) {
        setExtractionStatus("Extraction failed — using mock extractor");
        setTimeout(() => setIsExtracting(false), 1500);
        return;
      }

      setExtractionStatus("Gemini structuring candidate database fields...");
      const data = await res.json();

      if (data.structured) {
        const s = data.structured;
        const newProfile: CandidateData = {
          name: s.name || "Extracted Candidate",
          title: s.title || "Consultant",
          email: s.email || "candidate@mysccg.de",
          phone: s.phone || "+49 000 0000000",
          address: s.address || "",
          nationality: s.nationality || "",
          birthDate: s.birthDate || "",
          website: s.website || "",
          profileSummary: cleanAiText(s.profileSummary || ""),
          skills: Array.isArray(s.skills) ? s.skills : [],
          experience: Array.isArray(s.experience) ? s.experience : [],
          education: Array.isArray(s.education) ? s.education : [],
          customSections: cvData.customSections,
        };
        setCvData(newProfile);
        setExtractionStatus("✓ Candidate profile successfully updated and filled!");
      }
    } catch {
      setExtractionStatus("Network error occurred during extraction.");
    }
    setTimeout(() => setIsExtracting(false), 2000);
  };

  /* ── LINKEDIN CONNECT MODAL SUBMIT ── */
  const handleLinkedInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkedInEmail || !linkedInPassword) return;

    setIsLinkedInLoading(true);
    setTimeout(() => {
      // Set connected user
      setLinkedInUser("MD. FEROJ ALOM MOLLA");
      setShowLinkedInModal(false);
      setIsLinkedInLoading(false);

      // Autofill candidate profile data
      const s: CandidateData = {
        name: "MD. FEROJ ALOM MOLLA",
        title: "NATIONAL CONSULTANT (TVET EXPERT)",
        email: "admin@mysccg.de",
        phone: "+49 176 1234567",
        address: "Kronenstraße 19, 10969 Berlin",
        nationality: "Bangladeshi",
        birthDate: "05.12.1990",
        website: "https://linkedin.com/in/feroj-alom-molla",
        profileSummary: "Results-driven TVET Expert and National Consultant with over 15 years of experience spearheading curriculum development and competency-based training (CBT) frameworks in Bangladesh, specializing in green and renewable energy. Proven track record of leading multi-stakeholder development cooperation projects, successfully designing national occupational standards and establishing high-impact Training of Trainers (ToT) programs.",
        skills: ["Microsoft office package", "SPSS", "AI", "TVET Curriculum Development", "Competency Standards (CS)", "Competency-Based Learning Materials (CBLM)", "Training of Trainers (ToT)", "Project Cycle Management (PCM)", "Occupational Safety and Health (OSH)", "Work Improvement in Small Enterprises (WISE)", "Competency-Based Training and Assessment (CBT&A)", "Gender and Social Inclusion (GEDSI) Integration"],
        experience: [
          { company: "AIT Thailand, IDRC-CRDI, CANADA", role: "TVET Expert", period: "02/02/2025 - 30/06/2025", details: "Mapping TVET Sector Skills Engagement in Asia. Reviewed national assessment reports, provided input to national TVET policies mapping, identified knowledge gaps, and coordinated consultative meetings." },
          { company: "ILO", role: "TVET Expert (National Consultant-TVET)", period: "04/2003 - Present", details: "Served as TVET Expert across multiple major projects (ProGRESS, Skills 21, B-SEP, TVET Reform, etc.). Developed TVET curricula, CS, CBLM, and CBA tools. Supported DIFE, BEF, and industries in embedding standardized safety frameworks (OSH, WISE). Managed multi-stakeholder coordination, workplace-based learning, and apprenticeship programs." }
        ],
        education: [
          { school: "CHSR, Bangladesh University of Professional (BUP)", degree: "Research Fellow", period: "2025" },
          { school: "CPD, UK; Edupro, UK", degree: "PGD in Project Cycle Management", period: "2023" }
        ],
        customSections: []
      };

      setCvData(s);

      // Persist to local storage database immediately so it doesn't get lost on refresh!
      const savedProfiles = localStorage.getItem("sccg_profiles") || "{}";
      let profilesObj: Record<string, CandidateData> = {};
      try {
        profilesObj = JSON.parse(savedProfiles);
      } catch {}
      profilesObj[s.name] = s;
      localStorage.setItem("sccg_profiles", JSON.stringify(profilesObj));

      // Update candidates list
      setCandidates(profilesObj);
      setSelectedCandidate(s.name);

      // Save document link
      const savedDocs = localStorage.getItem("sccg_cvs");
      let docs = [];
      if (savedDocs) {
        try { docs = JSON.parse(savedDocs); } catch {}
      } else {
        docs = [
          { id: "doc-1", name: "Max Mustermann - Resume", role: "Senior Cloud Architect", updated: "Updated 10 min ago" },
          { id: "doc-2", name: "Elena Petrova - CV", role: "DevOps Specialist", updated: "Updated 2 hours ago" },
          { id: "doc-3", name: "Sabine Schmidt - Lebenslauf", role: "Java Backend Developer", updated: "Updated 1 day ago" },
          { id: "doc-4", name: "SCCG HR Template", role: "Sales Executive Profile", updated: "Updated 3 days ago" }
        ];
      }
      const docName = `${s.name} - CV`;
      if (!docs.some((d: any) => d.name === docName)) {
        docs.unshift({
          id: `doc-${Date.now()}`,
          name: docName,
          role: s.title,
          updated: "Imported just now"
        });
        localStorage.setItem("sccg_cvs", JSON.stringify(docs));
      }

      alert("✓ LinkedIn profile connected and saved permanently to portal database!");
    }, 1500);
  };

  const handleLinkedInDisconnect = () => {
    setLinkedInUser(null);
    setLinkedInEmail("");
    setLinkedInPassword("");
  };

  /* ── AI IMPROVE ── */
  const handleAiImprove = async (field: "summary" | "full") => {
    setIsImproving(true);
    try {
      const res = await fetch("/api/cv-maker/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: field === "summary" ? cvData.profileSummary : "",
          field,
          cvData: field === "full" ? cvData : undefined,
        }),
      });

      if (!res.ok) {
        setIsImproving(false);
        return;
      }

      const data = await res.json();

      if (field === "summary" && data.improved) {
        setCvData(prev => ({ ...prev, profileSummary: cleanAiText(data.improved) }));
      } else if (field === "full") {
        if (data.improved_summary) {
          setCvData(prev => ({ ...prev, profileSummary: cleanAiText(data.improved_summary) }));
        }
        if (data.suggested_skills?.length) {
          setCvData(prev => ({ ...prev, skills: data.suggested_skills }));
        }
        setAiAnalysis(data);
      }
    } catch {}
    setIsImproving(false);
  };

  /* ── INLINE EXPERIENCE BULLET AI OPTIMIZATION ── */
  const handleOptimizeBullet = async (index: number) => {
    const exp = cvData.experience[index];
    if (!exp || !exp.details.trim()) return;

    setImprovingBullets(prev => ({ ...prev, [index]: true }));
    try {
      const res = await fetch("/api/cv-maker/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: exp.details,
          field: "inline_bullet",
          roleTitle: exp.role,
          companyName: exp.company,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.improved) {
          const updatedExp = [...cvData.experience];
          updatedExp[index] = { ...exp, details: cleanAiText(data.improved) };
          setCvData(prev => ({ ...prev, experience: updatedExp }));
        }
      }
    } catch (err) {
      console.error("Failed to optimize bullet point:", err);
    }
    setImprovingBullets(prev => ({ ...prev, [index]: false }));
  };

  /* ── ATS JOB DESCRIPTION FIT MATCHER ── */
  const handleAtsCheck = async () => {
    if (!targetJobDesc.trim()) {
      alert("Please paste a target Job Description first.");
      return;
    }
    setIsAtsAnalyzing(true);
    setAtsAnalysisResult(null);

    try {
      const res = await fetch("/api/cv-maker/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "ats_check",
          cvData,
          jobDescription: targetJobDesc,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAtsAnalysisResult(data);
      } else {
        alert("Failed to analyze CV fit.");
      }
    } catch (err) {
      console.error("ATS optimization failed:", err);
    }
    setIsAtsAnalyzing(false);
  };

  const cvFilenameBase = (cvData.name.trim() || "CV").replace(/\s+/g, "_");

  /* ── OPEN PDF IN VIEWER MODAL ── */
  const handleOpenPdfViewer = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    setDownloadError("");
    try {
      const blob = await generateCvPdfBlob(previewRef.current);
      // Revoke any previous URL to avoid memory leaks
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      const url = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setDownloadError("Could not generate PDF. Use browser print (Ctrl+P) as fallback.");
    }
    setIsDownloading(false);
  };

  const handleClosePdfViewer = () => {
    if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
    setPdfBlobUrl(null);
  };

  /* ── PDF DOWNLOAD — native browser print for 100% format accuracy ── */
  const handleDownloadPdf = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  /* ── DOCX DOWNLOAD — structured Word from preview data ── */
  const handleDownloadDocx = async () => {
    setIsDownloading(true);
    setDownloadError("");
    try {
      await exportCvToDocx(cvData, `${cvFilenameBase}_CV.docx`);
    } catch (err) {
      console.error("DOCX export failed:", err);
      setDownloadError("Word export failed. Please try again.");
    }
    setIsDownloading(false);
  };

  /* ── FINISH SAVE TO LOCAL STORAGE DB ── */
  const handleFinishSave = () => {
    if (!cvData.name.trim()) {
      alert("Please enter a Candidate Name before saving.");
      return;
    }

    const saved = localStorage.getItem("sccg_profiles") || "{}";
    let profilesObj: Record<string, CandidateData> = {};
    try {
      profilesObj = JSON.parse(saved);
    } catch {}
    profilesObj[cvData.name] = cvData;
    localStorage.setItem("sccg_profiles", JSON.stringify(profilesObj));
    setCandidates(profilesObj);

    const savedDocs = localStorage.getItem("sccg_cvs");
    let docs = [];
    if (savedDocs) {
      try {
        docs = JSON.parse(savedDocs);
      } catch {}
    } else {
      docs = [
        { id: "doc-1", name: "Max Mustermann - Resume", role: "Senior Cloud Architect", updated: "Updated 10 min ago" },
        { id: "doc-2", name: "Elena Petrova - CV", role: "DevOps Specialist", updated: "Updated 2 hours ago" },
        { id: "doc-3", name: "Sabine Schmidt - Lebenslauf", role: "Java Backend Developer", updated: "Updated 1 day ago" },
        { id: "doc-4", name: "SCCG HR Template", role: "Sales Executive Profile", updated: "Updated 3 days ago" }
      ];
    }

    const docName = `${cvData.name} - CV`;
    const existingIndex = docs.findIndex((d: any) => d.name.toLowerCase().includes(cvData.name.toLowerCase()));
    
    if (existingIndex >= 0) {
      docs[existingIndex].name = docName;
      docs[existingIndex].role = cvData.title || "Consultant";
      docs[existingIndex].updated = "Updated just now";
    } else {
      docs.unshift({
        id: `doc-${Date.now()}`,
        name: docName,
        role: cvData.title || "Consultant",
        updated: "Created just now"
      });
    }

    localStorage.setItem("sccg_cvs", JSON.stringify(docs));
    alert("CV successfully saved to portal database!");
    window.location.href = "/admin/cv-suite";
  };

  const handleAddExperience = () => setCvData(p => ({ ...p, experience: [...p.experience, { company: "Company Name", role: "Job Role", period: "2024 - Present", details: "Describe duties." }] }));
  const handleRemoveExperience = (i: number) => setCvData(p => ({ ...p, experience: p.experience.filter((_, j) => j !== i) }));
  const handleAddEducation = () => setCvData(p => ({ ...p, education: [...p.education, { school: "School Name", degree: "Degree Title", period: "2020 - 2024" }] }));
  const handleRemoveEducation = (i: number) => setCvData(p => ({ ...p, education: p.education.filter((_, j) => j !== i) }));
  const handleAddCustomSection = (title: string) => { if (cvData.customSections.some(s => s.title === title)) return; setCvData(p => ({ ...p, customSections: [...p.customSections, { title, content: `Enter your ${title} details here.` }] })); };
  const handleRemoveCustomSection = (i: number) => setCvData(p => ({ ...p, customSections: p.customSections.filter((_, j) => j !== i) }));
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) setPhotoUrl(URL.createObjectURL(e.target.files[0])); };

  const theme = COLOR_THEMES[selectedColor] || COLOR_THEMES["Ocean Navy"];

  const availableCustomSections = [
    { title: "Achievements", icon: <Award className="w-4.5 h-4.5" /> },
    { title: "Awards", icon: <Star className="w-4.5 h-4.5" /> },
    { title: "Certificates", icon: <ShieldCheck className="w-4.5 h-4.5" /> },
    { title: "Goal", icon: <Target className="w-4.5 h-4.5" /> },
    { title: "Graphs", icon: <BarChart3 className="w-4.5 h-4.5" /> },
    { title: "Hobbies", icon: <Heart className="w-4.5 h-4.5" /> },
    { title: "Projects", icon: <Rocket className="w-4.5 h-4.5" /> },
  ];

  /* ═══════════════ TEMPLATE RENDER ENGINE ═══════════════ */
  const CvPreview = () => {
    const sharedStyles: React.CSSProperties = { fontFamily: `'${selectedFont}', sans-serif` };

      // ── Template: Sapphire Sidebar ──
      if (selectedTemplate === "sapphire") {
        return (
          <div style={sharedStyles} className="grid grid-cols-[240px_1fr] min-h-0 bg-white">
            <div style={{ backgroundColor: theme.sidebar, color: theme.sidebarText }} className="p-7 space-y-custom text-left">
              {hasPhoto && (
                <div className="w-24 h-24 rounded-full mx-auto overflow-hidden border-2 border-white/20 flex items-center justify-center bg-white/5 shadow-inner">
                  {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <User className="w-10 h-10 opacity-30" />}
                </div>
              )}
              <div className="space-y-custom">
                <div>
                  <h4 className="text-[12px] font-bold uppercase tracking-wider mb-2 pb-1 border-b border-white/10 opacity-60">Contact</h4>
                  <div className="space-y-2 text-xs opacity-90">
                    <p className="flex items-start gap-2"><Mail className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-60" /> {cvData.email}</p>
                    <p className="flex items-start gap-2"><Phone className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-60" /> {cvData.phone}</p>
                    {cvData.address && <p className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-60" /> {cvData.address}</p>}
                    {cvData.website && <p className="flex items-start gap-2"><Globe className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-60" /> <span className="break-all">{cvData.website}</span></p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-[12px] font-bold uppercase tracking-wider mb-2 pb-1 border-b border-white/10 opacity-60">Details</h4>
                  <div className="space-y-1.5 text-xs opacity-90">
                    {cvData.nationality && <p><span className="opacity-60">Nationality:</span> {cvData.nationality}</p>}
                    {cvData.birthDate && <p><span className="opacity-60">Born:</span> {cvData.birthDate}</p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-[12px] font-bold uppercase tracking-wider mb-2 pb-1 border-b border-white/10 opacity-60">Skills</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {cvData.skills.map((s, i) => (
                      <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/10 border border-white/5">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-8 space-y-custom text-left">
              <div>
                <h2 className="text-3xl font-extrabold uppercase tracking-tight" style={{ color: theme.headerText }}>{cvData.name}</h2>
                {cvData.title && <p className="text-sm font-semibold tracking-wide uppercase mt-1.5 border-t-2 pt-2" style={{ color: theme.accent, borderColor: theme.border }}>{cvData.title}</p>}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b" style={{ color: theme.headerText, borderColor: `${theme.border}20` }}>Profile</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">{cvData.profileSummary}</p>
              </div>
              <div className="space-y-custom">
                <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b" style={{ color: theme.headerText, borderColor: `${theme.border}20` }}>Experience</h3>
                <div className="space-y-custom">
                  {cvData.experience.map((exp, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex justify-between items-start font-bold">
                        <span className="text-slate-900">{exp.role} <span className="opacity-60 font-normal">at {exp.company}</span></span>
                        <span className="text-slate-400 font-normal shrink-0 ml-2">{exp.period}</span>
                      </div>
                      <p className="text-slate-550 leading-relaxed mt-1">{exp.details}</p>
                    </div>
                  ))}
                </div>
              </div>
              {cvData.education.length > 0 && (
                <div className="space-y-custom">
                  <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b" style={{ color: theme.headerText, borderColor: `${theme.border}20` }}>Education</h3>
                  <div className="space-y-custom">
                    {cvData.education.map((edu, i) => (
                      <div key={i} className="text-xs flex justify-between">
                        <span className="text-slate-800"><span className="font-bold">{edu.degree}</span> — {edu.school}</span>
                        <span className="text-slate-400">{edu.period}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {cvData.customSections.map((sec, i) => (
                <div key={i} className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b" style={{ color: theme.headerText, borderColor: `${theme.border}20` }}>{sec.title}</h3>
                  <p className="text-xs text-slate-655 whitespace-pre-line leading-relaxed">{sec.content}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

    // ── Template: Slate Minimal (Light Minimal Layout) ──
    if (selectedTemplate === "slate") {
      return (
        <div style={sharedStyles} className="grid grid-cols-[240px_1fr] min-h-0 bg-white border border-slate-100">
          <div className="p-7 space-y-custom text-left bg-slate-50 border-r border-slate-200">
            {hasPhoto && (
              <div className="w-24 h-24 rounded-none mx-auto overflow-hidden border border-slate-300 flex items-center justify-center bg-white shadow-sm">
                {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-slate-300" />}
              </div>
            )}
            <div className="space-y-custom">
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-700 mb-2 pb-1 border-b border-slate-200">Contact</h4>
                <div className="space-y-2 text-xs text-slate-600">
                  <p>{cvData.email}</p>
                  <p>{cvData.phone}</p>
                  {cvData.address && <p>{cvData.address}</p>}
                  {cvData.website && <p className="break-all">{cvData.website}</p>}
                </div>
              </div>
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-700 mb-2 pb-1 border-b border-slate-200">Details</h4>
                <div className="space-y-1.5 text-xs text-slate-600">
                  {cvData.nationality && <p>Nationality: {cvData.nationality}</p>}
                  {cvData.birthDate && <p>Born: {cvData.birthDate}</p>}
                </div>
              </div>
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-slate-700 mb-2 pb-1 border-b border-slate-200">Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {cvData.skills.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-none text-[10px] bg-slate-200 text-slate-700 border border-slate-300">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="p-8 space-y-custom text-left">
            <div>
              <h2 className="text-3xl font-light text-slate-900 tracking-wide">{cvData.name}</h2>
              {cvData.title && <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mt-1">{cvData.title}</p>}
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1">Profile</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{cvData.profileSummary}</p>
            </div>
            <div className="space-y-custom">
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1">Experience</h3>
              <div className="space-y-custom">
                {cvData.experience.map((exp, i) => (
                  <div key={i} className="text-xs">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{exp.role} <span className="font-normal text-slate-500">| {exp.company}</span></span>
                      <span className="text-slate-400 font-normal">{exp.period}</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed mt-1">{exp.details}</p>
                  </div>
                ))}
              </div>
            </div>
            {cvData.education.length > 0 && (
              <div className="space-y-custom">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1">Education</h3>
                {cvData.education.map((edu, i) => (
                  <div key={i} className="text-xs flex justify-between">
                    <span><span className="font-bold">{edu.degree}</span> — {edu.school}</span>
                    <span className="text-slate-400">{edu.period}</span>
                  </div>
                ))}
              </div>
            )}
            {cvData.customSections.map((sec, i) => (
              <div key={i} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1">{sec.title}</h3>
                <p className="text-xs text-slate-655 whitespace-pre-line leading-relaxed">{sec.content}</p>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // ── Template: Geometric Tech ──
    if (selectedTemplate === "geometric") {
      return (
        <div style={sharedStyles} className="p-8 space-y-custom min-h-0 bg-white text-left">
          <div className="border-4 border-double p-6" style={{ borderColor: theme.border }}>
            <h2 className="text-3xl font-mono font-bold tracking-tight text-slate-900">{cvData.name}</h2>
            <p className="text-xs font-mono tracking-widest uppercase mt-1" style={{ color: theme.accent }}>{cvData.title}</p>
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-dashed border-slate-300 text-xs font-mono text-slate-500">
              <p>Email: {cvData.email}</p>
              <p>Phone: {cvData.phone}</p>
              {cvData.address && <p>Address: {cvData.address}</p>}
              {cvData.website && <p>Website: {cvData.website}</p>}
            </div>
          </div>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8 space-y-custom">
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b-2" style={{ color: theme.headerText, borderColor: theme.border }}>// Summary</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{cvData.profileSummary}</p>
              </div>
              <div className="space-y-custom">
                <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b-2" style={{ color: theme.headerText, borderColor: theme.border }}>// Experience</h3>
                <div className="space-y-custom">
                  {cvData.experience.map((exp, i) => (
                    <div key={i} className="text-xs border-l-2 pl-3" style={{ borderColor: theme.accent }}>
                      <p className="font-bold text-slate-900">{exp.role} @ {exp.company}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{exp.period}</p>
                      <p className="text-slate-600 mt-1 leading-relaxed">{exp.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-span-4 space-y-custom bg-slate-50 p-4 border border-slate-200">
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b" style={{ color: theme.headerText }}>// Skills</h3>
                <div className="flex flex-wrap gap-1">
                  {cvData.skills.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-white border border-slate-250 font-mono">{s}</span>
                  ))}
                </div>
              </div>
              {cvData.education.length > 0 && (
                <div className="space-y-custom">
                  <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b" style={{ color: theme.headerText }}>// Education</h3>
                  <div className="space-y-2">
                    {cvData.education.map((edu, i) => (
                      <div key={i} className="text-xs">
                        <p className="font-bold">{edu.degree}</p>
                        <p className="text-[10px] text-slate-500">{edu.school}</p>
                        <p className="text-[9px] text-slate-400 font-mono">{edu.period}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ── Template: Gold Classic (Gold highlights + right-side sidebar) ──
    if (selectedTemplate === "gold") {
      return (
        <div style={sharedStyles} className="grid grid-cols-[1fr_240px] min-h-0 bg-white">
          <div className="p-8 space-y-custom text-left border-r border-slate-100">
            <div>
              <h2 className="text-3xl font-serif font-bold tracking-tight text-amber-900">{cvData.name}</h2>
              {cvData.title && <p className="text-xs font-serif font-semibold tracking-widest text-slate-400 uppercase mt-1">{cvData.title}</p>}
            </div>
            <div className="space-y-2">
              <h3 className="text-xs font-serif font-bold uppercase tracking-widest text-amber-900 border-b border-amber-200 pb-1">Professional Summary</h3>
              <p className="text-xs text-slate-655 leading-relaxed font-serif">{cvData.profileSummary}</p>
            </div>
            <div className="space-y-custom">
              <h3 className="text-xs font-serif font-bold uppercase tracking-widest text-amber-900 border-b border-amber-200 pb-1">Experience</h3>
              <div className="space-y-custom">
                {cvData.experience.map((exp, i) => (
                  <div key={i} className="text-xs font-serif">
                    <div className="flex justify-between font-bold text-slate-900">
                      <span>{exp.role} <span className="font-normal text-slate-500">at {exp.company}</span></span>
                      <span className="text-slate-400 font-normal shrink-0 ml-2">{exp.period}</span>
                    </div>
                    <p className="text-slate-550 leading-relaxed mt-1">{exp.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ backgroundColor: "#fdfcfa" }} className="p-7 space-y-custom text-left border-l border-amber-100">
            {hasPhoto && (
              <div className="w-24 h-24 rounded-full mx-auto overflow-hidden border border-amber-200 flex items-center justify-center bg-white shadow">
                {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <User className="w-10 h-10 text-amber-200" />}
              </div>
            )}
            <div className="space-y-custom font-serif">
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-amber-900 mb-2 pb-1 border-b border-amber-200">Contact</h4>
                <div className="space-y-2 text-xs text-slate-655">
                  <p>{cvData.email}</p>
                  <p>{cvData.phone}</p>
                  {cvData.address && <p>{cvData.address}</p>}
                </div>
              </div>
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-amber-900 mb-2 pb-1 border-b border-amber-200">Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {cvData.skills.map((s, i) => (
                    <span key={i} className="px-2.5 py-0.5 rounded text-[10px] bg-amber-50 text-amber-800 border border-amber-200">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Template: Brock Header ──
    if (selectedTemplate === "brock") {
      return (
        <div style={sharedStyles} className="min-h-0 bg-white text-left">
          <div style={{ backgroundColor: theme.sidebar, color: theme.sidebarText }} className="p-8">
            <h2 className="text-3xl font-extrabold uppercase tracking-tight">{cvData.name}</h2>
            {cvData.title && <p className="text-sm font-semibold tracking-wide uppercase mt-1 opacity-80">{cvData.title}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-xs opacity-75 border-t border-white/10 pt-3">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {cvData.email}</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {cvData.phone}</span>
              {cvData.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {cvData.address}</span>}
            </div>
          </div>
          <div className="p-8 grid grid-cols-12 gap-8">
            <div className="col-span-8 space-y-custom">
              <MainSection title="Profile"><p className="text-xs text-slate-600 leading-relaxed font-medium">{cvData.profileSummary}</p></MainSection>
              <MainSection title="Professional Experience">
                <div className="space-y-custom">
                  {cvData.experience.map((exp, i) => (
                    <div key={i} className="text-xs">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{exp.role} <span className="font-normal text-slate-500">— {exp.company}</span></span>
                        <span className="text-slate-400 font-normal shrink-0 ml-2">{exp.period}</span>
                      </div>
                      <p className="text-slate-500 leading-relaxed mt-1">{exp.details}</p>
                    </div>
                  ))}
                </div>
              </MainSection>
            </div>
            <div className="col-span-4 space-y-custom">
              <MainSection title="Skills">
                <div className="flex flex-wrap gap-1.5">
                  {cvData.skills.map((s, i) => (
                    <span key={i} className="px-2.5 py-1 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">{s}</span>
                  ))}
                </div>
              </MainSection>
              {cvData.education.length > 0 && (
                <MainSection title="Education">
                  <div className="space-y-custom">
                    {cvData.education.map((edu, i) => (
                      <div key={i} className="text-xs">
                        <p className="font-bold text-slate-800">{edu.degree}</p>
                        <p className="text-slate-500">{edu.school}</p>
                        <p className="text-slate-400">{edu.period}</p>
                      </div>
                    ))}
                  </div>
                </MainSection>
              )}
            </div>
          </div>
        </div>
      );
    }

    // ── Template: Timeline Layout ──
    if (selectedTemplate === "timeline") {
      return (
        <div style={sharedStyles} className="grid grid-cols-[240px_1fr] min-h-0 bg-white">
          <div style={{ backgroundColor: theme.sidebar, color: theme.sidebarText }} className="p-7 space-y-custom text-left">
            {hasPhoto && (
              <div className="w-24 h-24 rounded-full mx-auto overflow-hidden border-2 border-white/20 flex items-center justify-center bg-white/5 shadow animate-pulse">
                {photoUrl ? <img src={photoUrl} className="w-full h-full object-cover" /> : <User className="w-10 h-10 opacity-30" />}
              </div>
            )}
            <div className="space-y-custom">
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-white/55 mb-2.5 pb-1 border-b border-white/10">Contact</h4>
                <div className="space-y-2 text-xs text-white/90">
                  <p>{cvData.email}</p>
                  <p>{cvData.phone}</p>
                </div>
              </div>
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-white/55 mb-2.5 pb-1 border-b border-white/10">Skills</h4>
                <div className="flex flex-wrap gap-1">
                  {cvData.skills.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-white/10 border border-white/5">{s}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="p-8 space-y-custom text-left bg-white">
            <div>
              <h2 className="text-3xl font-extrabold uppercase tracking-tight" style={{ color: theme.headerText }}>{cvData.name}</h2>
              {cvData.title && <p className="text-sm font-semibold tracking-wide uppercase mt-1" style={{ color: theme.accent }}>{cvData.title}</p>}
            </div>
            <MainSection title="Profile"><p className="text-xs text-slate-600 leading-relaxed font-medium">{cvData.profileSummary}</p></MainSection>
            <div className="space-y-custom">
              <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b" style={{ color: theme.headerText }}>Experience Timeline</h3>
              <div className="relative border-l-2 pl-6 ml-2 space-y-custom" style={{ borderColor: theme.accent }}>
                {cvData.experience.map((exp, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 bg-white" style={{ borderColor: theme.accent }} />
                    <p className="font-bold text-slate-900 text-xs">{exp.role} <span className="font-normal text-slate-500">at {exp.company}</span></p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{exp.period}</p>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1.5">{exp.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ── Template: Two-Column Modern (50/50 vertical layout split) ──
    if (selectedTemplate === "two_column") {
      return (
        <div style={sharedStyles} className="p-8 space-y-custom min-h-0 bg-white text-left">
          <div className="pb-5 border-b border-slate-200">
            <h2 className="text-3xl font-black uppercase tracking-tight" style={{ color: theme.headerText }}>{cvData.name}</h2>
            {cvData.title && <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mt-1">{cvData.title}</p>}
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {cvData.email}</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {cvData.phone}</span>
              {cvData.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {cvData.address}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-custom">
              <MainSection title="Profile"><p className="text-xs text-slate-655 leading-relaxed font-medium">{cvData.profileSummary}</p></MainSection>
              <MainSection title="Experience">
                <div className="space-y-custom">
                  {cvData.experience.map((exp, i) => (
                    <div key={i} className="text-xs space-y-1">
                      <p className="font-bold text-slate-900">{exp.role} <span className="font-normal text-slate-500">| {exp.company}</span></p>
                      <p className="text-[10px] text-slate-400">{exp.period}</p>
                      <p className="text-slate-500 leading-normal">{exp.details}</p>
                    </div>
                  ))}
                </div>
              </MainSection>
            </div>
            <div className="space-y-custom bg-slate-50 p-5 border border-slate-200">
              <MainSection title="Expertise & Skills">
                <div className="flex flex-wrap gap-1">
                  {cvData.skills.map((s, i) => (
                    <span key={i} className="px-2 py-1 rounded text-[10px] font-bold bg-white border border-slate-350">{s}</span>
                  ))}
                </div>
              </MainSection>
              {cvData.education.length > 0 && (
                <MainSection title="Education">
                  <div className="space-y-3">
                    {cvData.education.map((edu, i) => (
                      <div key={i} className="text-xs">
                        <p className="font-bold text-slate-800">{edu.degree}</p>
                        <p className="text-slate-500">{edu.school} — {edu.period}</p>
                      </div>
                    ))}
                  </div>
                </MainSection>
              )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const MainSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <h3 className="text-xs font-bold uppercase tracking-wider pb-1 border-b" style={{ color: theme.headerText, borderColor: theme.border }}>{title}</h3>
      {children}
    </div>
  );

  /* ═══════════════ ACCORDION HEADER RENDERING ═══════════════ */
  const AccordionHeader = ({ id, label, icon }: { id: string; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => toggleSection(id)}
      className="w-full px-5 py-4 flex justify-between items-center bg-slate-50 hover:bg-slate-100/50 border-b border-slate-100 transition-colors"
    >
      <span className="text-[15px] xl:text-[16px] font-bold text-slate-800 flex items-center gap-2.5">{icon} {label}</span>
      {expandedSections.has(id) ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
    </button>
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full bg-[#f3f4f6] text-slate-800 overflow-hidden print:bg-white print:text-black">

      {/* PDF VIEWER MODAL */}
      {pdfBlobUrl && (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black/80 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) handleClosePdfViewer(); }}
        >
          {/* Header bar */}
          <div className="flex items-center justify-between bg-[#1e1e2e] px-5 py-3 shrink-0 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
                <FileDown className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{cvFilenameBase}_CV.pdf</p>
                <p className="text-white/50 text-[11px]">A4 · Use the toolbar inside the viewer to download or print</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Direct download link as extra safety */}
              <a
                href={pdfBlobUrl}
                download={`${cvFilenameBase}_CV.pdf`}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <FileDown className="w-3.5 h-3.5" /> Download PDF
              </a>
              <button
                onClick={handleClosePdfViewer}
                className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          {/* PDF iframe — browser native viewer with its own toolbar */}
          <iframe
            src={`${pdfBlobUrl}#toolbar=1&navpanes=0&view=FitH`}
            className="flex-1 w-full"
            title="CV PDF Preview"
            style={{ border: 'none', background: '#525659' }}
          />
        </div>
      )}
      
      {/* PERFECT PRINT OVERRIDES */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #cv-preview-container, #cv-preview-container * {
            visibility: visible !important;
          }
          #cv-preview-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          header, footer, nav, aside, .print-hidden, [class*="print:hidden"], [class*="bg-[#f3f4f6]"] {
            display: none !important;
          }
          @page {
            size: A4;
            margin: ${pageMargin === "compact" ? "10mm" : pageMargin === "spacious" ? "20mm" : "15mm"};
          }
        }
        .cv-page-break {
          page-break-before: always;
        }
        .space-y-custom > * + * {
          margin-top: var(--cv-section-gap, 1.25rem) !important;
        }
      `}} />

      {/* NEW CANDIDATE MODAL */}
      {showNewCandidateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[420px] overflow-hidden border border-slate-200">
            <div className="bg-violet-600 px-6 py-4 flex items-center justify-between text-white">
              <span className="font-bold text-lg">Add New Candidate</span>
              <button onClick={() => { setShowNewCandidateModal(false); setNewCandidateName(""); }} className="text-white/80 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-500">Enter the candidate name to create a new CV profile.</p>
              <input
                autoFocus
                type="text"
                placeholder="e.g. A. M. Zahirul Islam"
                value={newCandidateName}
                onChange={e => setNewCandidateName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateNewCandidate()}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowNewCandidateModal(false); setNewCandidateName(""); }} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button onClick={handleCreateNewCandidate} className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold cursor-pointer">Create & Start</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LINKEDIN MOCK POPUP MODAL */}
      {showLinkedInModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-[460px] overflow-hidden border border-slate-200 transform transition-all animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-[#0077B5] px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <LinkedInIcon className="w-6 h-6" />
                <span className="font-bold text-lg tracking-wide">LinkedIn Connect</span>
              </div>
              <button onClick={() => setShowLinkedInModal(false)} className="text-white/80 hover:text-white transition-colors cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>
            {/* Body */}
            <form onSubmit={handleLinkedInSubmit} className="p-6 space-y-4 text-left">
              <div>
                <h4 className="text-base font-extrabold text-slate-800">Sign in & Authorize</h4>
                <p className="text-xs text-slate-500 mt-1">Connect your professional LinkedIn profile to auto-tailor details instantly.</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email or Phone</label>
                  <input required type="email" placeholder="example@linkedin.com" value={linkedInEmail} onChange={e => setLinkedInEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Password</label>
                  <input required type="password" placeholder="••••••••" value={linkedInPassword} onChange={e => setLinkedInPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowLinkedInModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={isLinkedInLoading} className="px-5 py-2 bg-[#0077B5] hover:bg-[#006097] disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer shadow-sm">
                  {isLinkedInLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  {isLinkedInLoading ? "Connecting..." : "Sign In & Import"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. ICON NAV */}
      <div className="w-[76px] 2xl:w-[84px] bg-[#0f172a] flex flex-col items-center justify-between py-6 border-r border-slate-800 print:hidden z-10 shrink-0">
        <div className="space-y-6 flex flex-col items-center w-full">
          <div className="w-11 h-11 rounded-xl bg-violet-600 flex items-center justify-center font-bold text-white tracking-wider text-[11px] shadow-md">SCCG</div>
          <div className="w-full flex flex-col items-center space-y-3">
            <button onClick={() => window.location.href = "/admin/cv-suite"} className="p-3.5 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer" title="Dashboard"><LayoutGrid className="w-5 h-5" /></button>
            <button className="p-3.5 text-violet-400 bg-white/5 rounded-xl" title="CV Maker"><FileText className="w-5 h-5" /></button>
            <button className="p-3.5 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer" title="Translations"><Languages className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex flex-col items-center space-y-3">
          <button className="p-3.5 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer" title="Help"><HelpCircle className="w-5 h-5" /></button>
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-300 font-bold">AD</div>
        </div>
      </div>

      {/* 2. TAB SIDEBAR */}
      <div className="w-[210px] xl:w-[250px] 2xl:w-[270px] bg-white border-r border-slate-200 flex flex-col justify-between py-6 px-4 print:hidden z-10 shrink-0">
        <div className="space-y-5">
          <div>
            <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tailor CV</h2>
            <h3 className="font-bold text-sm 2xl:text-base text-slate-900">SCCG HR Resume</h3>
          </div>
          <div className="flex flex-col space-y-1">
            {([
              { key: "fill", icon: <CheckSquare className="w-4.5 h-4.5" />, label: "Fill In Profile" },
              { key: "design", icon: <Palette className="w-4.5 h-4.5" />, label: "Design Layout" },
              { key: "improve", icon: <Sparkles className="w-4.5 h-4.5" />, label: "AI Improver" },
              { key: "download", icon: <Download className="w-4.5 h-4.5" />, label: "Download & Share" },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} className={`w-full py-3 px-3 rounded-lg text-left text-[14px] xl:text-[15px] 2xl:text-[16px] font-bold flex items-center space-x-3 transition-all cursor-pointer ${activeTab === t.key ? "bg-slate-100 text-slate-950" : "text-slate-500 hover:bg-slate-50"}`}>
                {t.icon}<span>{t.label}</span>
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Candidate</label>
            <select
              value={selectedCandidate}
              onChange={e => handleCandidateChange(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[14px] xl:text-[15px] text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value={BLANK_CANDIDATE_KEY}>+ Blank CV (no candidate)</option>
              <option value={NEW_CANDIDATE_KEY}>+ Add New Candidate</option>
              <optgroup label="Existing Candidates">
                {Object.keys(candidates).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </optgroup>
            </select>
            {selectedCandidate === BLANK_CANDIDATE_KEY && (
              <p className="text-[11px] text-amber-600 font-medium">Creating a CV without linking to a candidate profile.</p>
            )}
          </div>
        </div>

        <button onClick={() => { window.location.href = "/admin/cv-suite"; }} className="w-full py-2.5 text-[14px] font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-2 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to CV Suite
        </button>
      </div>

      {/* 3. CENTER CONTROL PANEL (Form inputs and accordions) */}
      <div className="flex-[0_0_auto] w-[380px] md:w-[420px] lg:w-[460px] xl:w-[500px] 2xl:w-[560px] bg-slate-50 border-r border-slate-200 flex flex-col overflow-y-auto print:hidden z-10 shrink-0">
        <div className="p-5 2xl:p-6 space-y-4">

          {activeTab === "fill" && (
            <div className="space-y-4">

              {/* Upload Card */}
              <div className="bg-white border-2 border-violet-500/20 rounded-2xl p-5 space-y-4 shadow-sm">
                <div>
                  <h4 className="text-[15px] xl:text-[16px] font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4.5 h-4.5 text-violet-500 animate-pulse" /> Upload & AI Extract CV
                  </h4>
                  <p className="text-[12px] text-slate-400 mt-1">Upload PDF/DOCX — Gemini AI will extract and fill all fields.</p>
                </div>

                <input type="file" id="cv-upload-input" className="hidden" accept=".pdf,.doc,.docx" onChange={e => { if (e.target.files?.[0]) setUploadedFile(e.target.files[0]); }} />
                <div onClick={() => document.getElementById("cv-upload-input")?.click()} className="border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 rounded-xl flex flex-col items-center justify-center space-y-2 hover:border-violet-400 transition-all cursor-pointer">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-[14px] font-semibold text-slate-600">{uploadedFile ? uploadedFile.name : "Select Resume File (PDF/DOC)"}</span>
                  <span className="text-[11px] text-slate-400">Max size: 8MB</span>
                </div>

                {uploadedFile && (
                  <button onClick={handleStartExtraction} disabled={isExtracting} className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 shadow cursor-pointer">
                    {isExtracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {isExtracting ? "Extracting..." : "Execute AI Extraction"}
                  </button>
                )}

                {isExtracting && <p className="text-[12px] text-violet-600 font-mono animate-pulse text-center">{extractionStatus}</p>}

                {/* LinkedIn Connect */}
                <div className="pt-2 border-t border-slate-100">
                  {linkedInUser ? (
                    <div className="space-y-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">FA</div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{linkedInUser}</p>
                            <p className="text-[10px] text-emerald-600 font-semibold">LinkedIn Profile Linked</p>
                          </div>
                        </div>
                        <button onClick={handleLinkedInDisconnect} className="text-xs text-red-500 hover:text-red-700 font-bold transition-colors cursor-pointer">Disconnect</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setShowLinkedInModal(true)} className="w-full py-3 bg-[#0077B5] hover:bg-[#006097] text-white rounded-xl text-[14px] font-bold flex items-center justify-center gap-2 shadow cursor-pointer">
                      <LinkedInIcon className="w-4 h-4" /> Connect LinkedIn Profile
                    </button>
                  )}
                </div>
              </div>

              {/* Personal Information */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <AccordionHeader id="personal" label="Personal Information" icon={<User className="w-4.5 h-4.5 text-slate-500" />} />
                {expandedSections.has("personal") && (
                  <div className="p-4 2xl:p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] xl:text-[13px] 2xl:text-[14px] font-bold text-slate-450 uppercase mb-1">Full Name</label>
                        <input type="text" value={cvData.name} onChange={e => setCvData({ ...cvData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[14px] xl:text-[15px] 2xl:text-[16px] text-slate-900 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[12px] xl:text-[13px] 2xl:text-[14px] font-bold text-slate-455 uppercase mb-1">Job Title</label>
                        <input type="text" value={cvData.title} onChange={e => setCvData({ ...cvData, title: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[14px] xl:text-[15px] 2xl:text-[16px] text-slate-900 focus:outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] xl:text-[13px] 2xl:text-[14px] font-bold text-slate-455 uppercase mb-1">Email</label>
                        <input type="text" value={cvData.email} onChange={e => setCvData({ ...cvData, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[14px] xl:text-[15px] 2xl:text-[16px] text-slate-900 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[12px] xl:text-[13px] 2xl:text-[14px] font-bold text-slate-455 uppercase mb-1">Phone</label>
                        <input type="text" value={cvData.phone} onChange={e => setCvData({ ...cvData, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[14px] xl:text-[15px] 2xl:text-[16px] text-slate-900 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] xl:text-[13px] 2xl:text-[14px] font-bold text-slate-455 uppercase mb-1">Address</label>
                      <input type="text" value={cvData.address} onChange={e => setCvData({ ...cvData, address: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[14px] xl:text-[15px] 2xl:text-[16px] text-slate-900 focus:outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[12px] xl:text-[13px] 2xl:text-[14px] font-bold text-slate-455 uppercase mb-1">Nationality</label>
                        <input type="text" value={cvData.nationality} onChange={e => setCvData({ ...cvData, nationality: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[14px] xl:text-[15px] 2xl:text-[16px] text-slate-900 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[12px] xl:text-[13px] 2xl:text-[14px] font-bold text-slate-455 uppercase mb-1">Birth Date</label>
                        <input type="text" value={cvData.birthDate} onChange={e => setCvData({ ...cvData, birthDate: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[14px] xl:text-[15px] 2xl:text-[16px] text-slate-900 focus:outline-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[12px] xl:text-[13px] 2xl:text-[14px] font-bold text-slate-455 uppercase mb-1">Website / LinkedIn</label>
                      <input type="text" value={cvData.website} onChange={e => setCvData({ ...cvData, website: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[14px] xl:text-[15px] 2xl:text-[16px] text-slate-900 focus:outline-none" />
                    </div>
                    <div className="pt-2">
                      <label className="block text-[12px] xl:text-[13px] 2xl:text-[14px] font-bold text-slate-455 uppercase mb-1">Applicant Portrait Image</label>
                      <input type="file" id="photo-upload" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                      <button onClick={() => document.getElementById("photo-upload")?.click()} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[14px] font-semibold flex items-center gap-2 cursor-pointer"><ImageIcon className="w-4 h-4 text-slate-500" />{photoUrl ? "Replace Photo" : "Upload Picture"}</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Summary */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <AccordionHeader id="profile" label="Profile Summary" icon={<FileText className="w-4.5 h-4.5 text-slate-500" />} />
                {expandedSections.has("profile") && (
                  <div className="p-4 2xl:p-5 space-y-3">
                    <textarea value={cvData.profileSummary} onChange={e => setCvData({ ...cvData, profileSummary: e.target.value })} rows={5} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-[14px] xl:text-[15px] 2xl:text-[16px] focus:outline-none focus:ring-1 focus:ring-violet-400" />
                    <button onClick={() => handleAiImprove("summary")} disabled={isImproving} className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 cursor-pointer">
                      {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} AI Improve Summary
                    </button>
                  </div>
                )}
              </div>

              {/* Work Experience */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <AccordionHeader id="experience" label="Work Experience" icon={<Briefcase className="w-4.5 h-4.5 text-slate-500" />} />
                {expandedSections.has("experience") && (
                  <div className="p-4 2xl:p-5 space-y-3">
                    {cvData.experience.map((exp, idx) => (
                      <div key={idx} className="p-3 2xl:p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200 relative">
                        <button onClick={() => handleRemoveExperience(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4.5 h-4.5" /></button>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="block text-[11px] font-bold text-slate-400 uppercase">Role</label><input type="text" value={exp.role} onChange={e => { const n = [...cvData.experience]; n[idx].role = e.target.value; setCvData({ ...cvData, experience: n }); }} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[14px] focus:outline-none" /></div>
                          <div><label className="block text-[11px] font-bold text-slate-400 uppercase">Company</label><input type="text" value={exp.company} onChange={e => { const n = [...cvData.experience]; n[idx].company = e.target.value; setCvData({ ...cvData, experience: n }); }} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[14px] focus:outline-none" /></div>
                        </div>
                        <div><label className="block text-[11px] font-bold text-slate-400 uppercase">Period</label><input type="text" value={exp.period} onChange={e => { const n = [...cvData.experience]; n[idx].period = e.target.value; setCvData({ ...cvData, experience: n }); }} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[14px] focus:outline-none" /></div>
                        <div className="space-y-1.5">
                          <label className="block text-[11px] font-bold text-slate-400 uppercase">Description</label>
                          <textarea value={exp.details} onChange={e => { const n = [...cvData.experience]; n[idx].details = e.target.value; setCvData({ ...cvData, experience: n }); }} rows={3} className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-[14px] focus:outline-none" />
                          <button
                            type="button"
                            onClick={() => handleOptimizeBullet(idx)}
                            disabled={improvingBullets[idx] || !exp.details.trim()}
                            className="py-1 px-2.5 text-[11px] font-bold bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50 rounded border border-violet-200 flex items-center gap-1 transition-all cursor-pointer"
                          >
                            {improvingBullets[idx] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            AI Optimize Bullet Points
                          </button>
                        </div>
                      </div>
                    ))}
                    <button onClick={handleAddExperience} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1 cursor-pointer"><Plus className="w-4 h-4" /> Add Experience</button>
                  </div>
                )}
              </div>

              {/* Education */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <AccordionHeader id="education" label="Education" icon={<BookOpen className="w-4.5 h-4.5 text-slate-500" />} />
                {expandedSections.has("education") && (
                  <div className="p-4 2xl:p-5 space-y-3">
                    {cvData.education.map((edu, idx) => (
                      <div key={idx} className="p-3 2xl:p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-200 relative">
                        <button onClick={() => handleRemoveEducation(idx)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4.5 h-4.5" /></button>
                        <div className="grid grid-cols-2 gap-2">
                          <div><label className="block text-[11px] font-bold text-slate-400 uppercase">Degree</label><input type="text" value={edu.degree} onChange={e => { const n = [...cvData.education]; n[idx].degree = e.target.value; setCvData({ ...cvData, education: n }); }} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[14px] focus:outline-none" /></div>
                          <div><label className="block text-[11px] font-bold text-slate-400 uppercase">School</label><input type="text" value={edu.school} onChange={e => { const n = [...cvData.education]; n[idx].school = e.target.value; setCvData({ ...cvData, education: n }); }} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[14px] focus:outline-none" /></div>
                        </div>
                        <div><label className="block text-[11px] font-bold text-slate-400 uppercase">Period</label><input type="text" value={edu.period} onChange={e => { const n = [...cvData.education]; n[idx].period = e.target.value; setCvData({ ...cvData, education: n }); }} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[14px] focus:outline-none" /></div>
                      </div>
                    ))}
                    <button onClick={handleAddEducation} className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1 cursor-pointer"><Plus className="w-4 h-4" /> Add Education</button>
                  </div>
                )}
              </div>

              {/* Skills & Expertise */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <AccordionHeader id="skills" label="Skills & Expertise" icon={<Layers className="w-4.5 h-4.5 text-slate-500" />} />
                {expandedSections.has("skills") && (
                  <div className="p-4 2xl:p-5 space-y-3">
                    <label className="block text-[12px] xl:text-[13px] font-bold text-slate-400 uppercase mb-1">Expertise keywords (comma separated)</label>
                    <input type="text" value={cvData.skills.join(", ")} onChange={e => setCvData({ ...cvData, skills: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-[14px] xl:text-[15px] focus:outline-none" />
                    <div className="flex flex-wrap gap-1.5">{cvData.skills.map((s, i) => <span key={i} className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded text-[11px] 2xl:text-xs text-slate-700 font-semibold">{s}</span>)}</div>
                  </div>
                )}
              </div>

              {/* Add New Section */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-900 flex items-center gap-2"><Plus className="w-4 h-4 text-slate-500" /> Add New Section</span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-2">
                  {availableCustomSections.map(sec => (
                    <button key={sec.title} onClick={() => handleAddCustomSection(sec.title)} className="py-2.5 px-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white hover:border-violet-400 text-[12px] xl:text-[13px] font-bold text-slate-700 hover:text-slate-950 flex items-center gap-2 transition-all cursor-pointer">
                      <span className="text-slate-500">{sec.icon}</span><span>{sec.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Sections */}
              {cvData.customSections.map((sec, idx) => (
                <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-800">{sec.title}</span>
                    <button onClick={() => handleRemoveCustomSection(idx)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4.5 h-4.5" /></button>
                  </div>
                  <div className="p-4"><textarea value={sec.content} onChange={e => { const n = [...cvData.customSections]; n[idx].content = e.target.value; setCvData({ ...cvData, customSections: n }); }} rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-[14px] xl:text-[15px] focus:outline-none" /></div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "design" && (
            <div className="space-y-5">
              <h3 className="font-bold text-base xl:text-lg text-slate-900">Design Layout</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-[12px] xl:text-[13px] font-bold text-slate-400 uppercase mb-2">Template</label>
                  <div className="space-y-2">
                    {TEMPLATES.map(t => (
                      <button key={t.id} onClick={() => setSelectedTemplate(t.id)} className={`w-full p-3.5 rounded-xl border text-left transition-all cursor-pointer ${selectedTemplate === t.id ? "border-violet-500 bg-violet-50/50 ring-1 ring-violet-500" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                        <span className="text-[15px] xl:text-[16px] font-bold text-slate-900">{t.label}</span>
                        <p className="text-[12px] text-slate-500 mt-0.5">{t.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] xl:text-[13px] font-bold text-slate-400 uppercase mb-2">Color Scheme</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.keys(COLOR_THEMES).map(name => (
                      <button key={name} onClick={() => setSelectedColor(name)} className={`p-2.5 rounded-xl border text-center text-[12px] xl:text-[13px] font-bold transition-all cursor-pointer ${selectedColor === name ? "border-violet-500 ring-1 ring-violet-500" : "border-slate-200 hover:border-slate-300"}`}>
                        <div className="w-6 h-6 rounded-full mx-auto mb-1" style={{ backgroundColor: COLOR_THEMES[name].sidebar }} />
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] xl:text-[13px] font-bold text-slate-400 uppercase mb-2">Font Family</label>
                  <select value={selectedFont} onChange={e => setSelectedFont(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none">
                    <option value="Inter">Inter</option>
                    <option value="Outfit">Outfit</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Poppins">Poppins</option>
                    <option value="Open Sans">Open Sans</option>
                  </select>
                </div>

                {/* ADVANCED SPACING CONTROLS */}
                <div className="pt-4 border-t border-slate-150 space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Formatting &amp; Spacing</h4>
                  
                  {/* Font Size */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Text Sizing</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["small", "medium", "large"] as const).map(size => (
                        <button
                          key={size}
                          onClick={() => setFontSize(size)}
                          className={`py-2 text-xs font-semibold rounded-lg border capitalize transition-all cursor-pointer ${fontSize === size ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Line Height */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Line Spacing</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["tight", "normal", "loose"] as const).map(lh => (
                        <button
                          key={lh}
                          onClick={() => setLineHeight(lh)}
                          className={`py-2 text-xs font-semibold rounded-lg border capitalize transition-all cursor-pointer ${lineHeight === lh ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                        >
                          {lh}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Page Margins */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Page Margins</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["compact", "standard", "spacious"] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setPageMargin(m)}
                          className={`py-2 text-xs font-semibold rounded-lg border capitalize transition-all cursor-pointer ${pageMargin === m ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Section Spacing */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase">Section Spacing</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["compact", "normal", "spacious"] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setSectionSpacing(s)}
                          className={`py-2 text-xs font-semibold rounded-lg border capitalize transition-all cursor-pointer ${sectionSpacing === s ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === "improve" && (
            <div className="space-y-5">
              <h3 className="font-bold text-base xl:text-lg text-slate-900 font-[family-name:var(--font-outfit)]">AI Resume Optimizer</h3>
              <p className="text-[13px] text-slate-500">Powered by Gemini AI — optimize your summary, skills, and ATS rating.</p>
              
              <div className="space-y-3">
                <button onClick={() => handleAiImprove("summary")} disabled={isImproving} className="w-full py-3 bg-violet-600 hover:bg-violet-750 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors">
                  {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4.5 h-4.5" />} Rewrite Profile Summary
                </button>
                <button onClick={() => handleAiImprove("full")} disabled={isImproving} className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors">
                  {isImproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4.5 h-4.5" />} Full CV Analysis &amp; Optimization
                </button>
              </div>

              {aiAnalysis && (
                <div className="space-y-4 pt-2 border-b border-slate-200 pb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-black text-violet-600">{aiAnalysis.overall_score ?? "—"}</p>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">Overall Score</p>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                      <p className="text-3xl font-black text-emerald-600">{aiAnalysis.ats_score ?? "—"}</p>
                      <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mt-1">ATS Score</p>
                    </div>
                  </div>
                  {aiAnalysis.suggestions?.length ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Suggestions</h4>
                      {aiAnalysis.suggestions.map((s, i) => (
                        <p key={i} className="text-xs text-slate-600 flex items-start gap-2 leading-relaxed">
                          <Star className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />{s}
                        </p>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}

              {/* ATS JOB DESCRIPTION MATCHING SYSTEM */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-4 shadow-sm">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" /> ATS Keyword &amp; Fit Scan
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1">Paste a target job description below to check your keyword matches and parser compatibilities.</p>
                </div>

                <textarea
                  placeholder="Paste job posting text here..."
                  value={targetJobDesc}
                  onChange={e => setTargetJobDesc(e.target.value)}
                  rows={5}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-400"
                />

                <button
                  onClick={handleAtsCheck}
                  disabled={isAtsAnalyzing || !targetJobDesc.trim()}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-colors"
                >
                  {isAtsAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isAtsAnalyzing ? "Analyzing ATS match..." : "Scan CV Against Job Post"}
                </button>

                {atsAnalysisResult && (
                  <div className="space-y-4 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Match Rating</p>
                        <p className="text-xs text-slate-600 font-semibold mt-0.5">Semantic Fit Index</p>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black text-emerald-600">{atsAnalysisResult.overall_score ?? 0}%</span>
                      </div>
                    </div>

                    {/* Keywords matched / missing */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Keyword Analysis</p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-[10px] text-emerald-600 font-bold mb-1">Matched Keywords ({atsAnalysisResult.matched_keywords?.length ?? 0}):</p>
                          <div className="flex flex-wrap gap-1">
                            {atsAnalysisResult.matched_keywords?.map((kw, i) => (
                              <span key={i} className="px-2 py-0.5 bg-emerald-55 text-emerald-800 border border-emerald-200 rounded text-[9px] font-medium">{kw}</span>
                            )) ?? <span className="text-[10px] text-slate-400">None found</span>}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-amber-600 font-bold mb-1">Missing Keywords ({atsAnalysisResult.missing_keywords?.length ?? 0}):</p>
                          <div className="flex flex-wrap gap-1">
                            {atsAnalysisResult.missing_keywords?.map((kw, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-[9px] font-medium">{kw}</span>
                            )) ?? <span className="text-[10px] text-slate-400">None found</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Parser checks */}
                    {atsAnalysisResult.formatting_issues?.length ? (
                      <div className="space-y-1.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5" /> Parser Compliance Alert
                        </p>
                        <ul className="list-disc pl-4 space-y-1">
                          {atsAnalysisResult.formatting_issues.map((issue, i) => (
                            <li key={i} className="text-[10px] text-slate-600 leading-normal">{issue}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                        <p className="text-[10px] text-emerald-700 font-bold flex items-center justify-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Parsers (Workday, Lever) will read cleanly
                        </p>
                      </div>
                    )}

                    {/* Recommendations */}
                    {atsAnalysisResult.suggestions?.length ? (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-slate-400 uppercase">ATS Improvement Tips</p>
                        <div className="space-y-1.5">
                          {atsAnalysisResult.suggestions.map((tip, i) => (
                            <div key={i} className="flex gap-2 items-start text-xs text-slate-655 leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-150">
                              <span className="text-emerald-600 font-bold shrink-0">#{i+1}</span>
                              <p className="text-[11px]">{tip}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "download" && (
            <div className="space-y-5">
              <h3 className="font-bold text-base xl:text-lg text-slate-900">Download &amp; Share</h3>
              <p className="text-[14px] text-slate-500">Generate your CV as a PDF — opens in a built-in viewer so you can review it before downloading.</p>
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 text-[12px] text-slate-600 space-y-1">
                <p><strong>Format:</strong> A4 (210 × 297 mm)</p>
                <p><strong>Margins:</strong> 15 mm all sides</p>
                <p><strong>Output:</strong> Full-color PDF with all template styles</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                  <span>Download PDF</span>
                </button>
                <button
                  onClick={handleDownloadDocx}
                  disabled={isDownloading}
                  className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex flex-col items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
                >
                  {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                  <span>Download DOCX</span>
                </button>
              </div>
              {downloadError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                  <p className="text-[13px] text-red-700 font-semibold">{downloadError}</p>
                  <button
                    onClick={() => window.print()}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[13px] font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileDown className="w-4 h-4" /> Browser Print (Ctrl+P)
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* 4. PREVIEW PANEL (Full screen height, block any outer layout elements) */}
      <div className="flex-1 bg-[#f3f4f6] z-20 flex flex-col items-center justify-start overflow-y-auto py-6 2xl:py-8 px-4 md:px-8 lg:px-12 relative print:bg-white print:p-0 h-screen">
        
        <div className="w-full flex justify-between items-center mb-4 print:hidden shrink-0" style={{ maxWidth: A4_WIDTH_PX }}>
          <div>
            <h3 className="text-sm xl:text-base font-bold text-slate-700">Live Preview</h3>
            <p className="text-[11px] text-slate-400">A4 · 210 × 297 mm · 15 mm margins</p>
          </div>
          <button onClick={handleFinishSave} className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[14px] xl:text-[15px] font-bold flex items-center gap-2 cursor-pointer shadow-sm">
            <Save className="w-4.5 h-4.5" /> Finish & Save CV
          </button>
        </div>

        {/* A4 Paper Container */}
        {(() => {
          const fontSizes = { small: "11px", medium: "12px", large: "13.5px" };
          const lineHeights = { tight: "1.25", normal: "1.5", loose: "1.75" };
          const pageMargins = { compact: "10mm", standard: "15mm", spacious: "20mm" };
          const sectionSpacings = { compact: "0.75rem", normal: "1.25rem", spacious: "2.0rem" };

          return (
            <div
              ref={previewRef}
              id="cv-preview-container"
              className="relative bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden select-text print:shadow-none print:border-none mb-8 transition-all box-border"
              style={{
                width: A4_WIDTH_PX,
                maxWidth: A4_WIDTH_PX,
                minHeight: A4_HEIGHT_PX,
                boxSizing: "border-box",
                fontSize: fontSizes[fontSize],
                lineHeight: lineHeights[lineHeight],
                padding: pageMargins[pageMargin],
                ["--cv-section-gap" as any]: sectionSpacings[sectionSpacing],
              }}
            >
              <CvPreview />

              {/* Dynamic Page Break Indicators */}
              <div className="absolute left-0 right-0 pointer-events-none print:hidden" style={{ top: A4_HEIGHT_PX }}>
                <div className="w-full border-t border-dashed border-violet-400/50 flex items-center justify-between px-6">
                  <span className="text-[9px] text-violet-500 bg-violet-50/90 px-2 py-0.5 rounded border border-violet-200/60 font-bold -mt-2.5 shadow-sm">Page 1 End</span>
                  <span className="text-[9px] text-violet-500 bg-violet-50/90 px-2 py-0.5 rounded border border-violet-200/60 font-bold -mt-2.5 shadow-sm">Page 2 Start</span>
                </div>
              </div>
              <div className="absolute left-0 right-0 pointer-events-none print:hidden" style={{ top: A4_HEIGHT_PX * 2 }}>
                <div className="w-full border-t border-dashed border-violet-400/50 flex items-center justify-between px-6">
                  <span className="text-[9px] text-violet-500 bg-violet-50/90 px-2 py-0.5 rounded border border-violet-200/60 font-bold -mt-2.5 shadow-sm">Page 2 End</span>
                  <span className="text-[9px] text-violet-500 bg-violet-50/90 px-2 py-0.5 rounded border border-violet-200/60 font-bold -mt-2.5 shadow-sm">Page 3 Start</span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
