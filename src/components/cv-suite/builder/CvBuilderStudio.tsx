"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileCode, Printer, ZoomIn, ZoomOut, UserCheck } from "lucide-react";
import { CvPreview } from "./CvPreview";
import { CvFormEditor } from "./CvFormEditor";
import { CvCustomizer } from "./CvCustomizer";
import { generateCvStudioPdf } from "@/lib/engine/cv-studio-pdf";
import { generateCvDocx } from "@/lib/engine/cv-studio-docx";
import type { CvData } from "@/types/cv-builder";
import { DEFAULT_CV_DATA } from "@/types/cv-builder";
import type { Candidate } from "@/types";

interface CvBuilderStudioProps {
  candidates: Candidate[];
  initialCandidateQuery?: string;
  initialCandidateId?: string;
  initialBlank?: boolean;
}

const BLANK_CV_DATA: CvData = {
  personalInfo: {
    fullName: "",
    jobTitle: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
  },
  workExperience: [],
  education: [],
  skills: [],
  languages: [],
  certifications: [],
  projects: [],
  settings: {
    templateId: "berlin",
    accentColor: "blue",
    fontFamily: "inter",
    spacing: "normal",
  },
};

export function CvBuilderStudio({
  candidates,
  initialCandidateQuery,
  initialCandidateId,
  initialBlank,
}: CvBuilderStudioProps) {
  const [cvData, setCvData] = useState<CvData>(initialBlank ? BLANK_CV_DATA : DEFAULT_CV_DATA);
  const [scale, setScale] = useState(0.85);
  const [exporting, setExporting] = useState<string | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>("");
  const previewRef = useRef<HTMLDivElement>(null);

  // Auto-populate CV from selected Candidate in database
  const handleImportCandidate = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    if (!candidateId) return;

    const cand = candidates.find((c) => c.id === candidateId);
    if (!cand) return;

    populateCandidateData(cand);
  };

  const populateCandidateData = (cand: Candidate) => {
    setSelectedCandidateId(cand.id);
    setCvData({
      candidateId: cand.id,
      personalInfo: {
        fullName: cand.fullName,
        jobTitle: `${cand.workflowCategory} Candidate / Specialist`,
        email: cand.email || `${cand.fullName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
        phone: cand.phone || "+49 176 00000000",
        location: `${cand.country || "Germany"}`,
        summary: `Motivated and results-oriented ${cand.workflowCategory} candidate enrolled with SCCG. Demonstrated technical aptitude, strong analytical skills, and commitment to vocational excellence in Germany.`,
      },
      workExperience: [
        {
          id: "w1",
          jobTitle: `${cand.workflowCategory} Technical Trainee`,
          employer: "SCCG Partner Organization",
          location: cand.country || "Germany",
          startDate: "2023-01",
          endDate: "Present",
          isCurrent: true,
          description:
            "• Managed daily technical workflows and quality control standards.\n• Collaborated with international teams to optimize process documentation.\n• Participated in professional development and German workplace integration training.",
        },
        {
          id: "w2",
          jobTitle: "Operations & Quality Assistant",
          employer: "Industrial Services Ltd.",
          location: cand.country || "Global",
          startDate: "2021-06",
          endDate: "2022-12",
          isCurrent: false,
          description:
            "• Assisted in operational data collection and standard operating procedures (SOPs).\n• Implemented quality assurance checks, improving compliance efficiency by 15%.",
        },
      ],
      education: [
        {
          id: "e1",
          degree: `Diploma / Degree in Technical & ${cand.workflowCategory} Studies`,
          institution: "State Technical Institute / University",
          location: cand.country || "Germany",
          startDate: "2019-09",
          endDate: "2023-05",
          grade: "1.9 (Sehr Gut)",
          description: "Focus on applied technical methods, engineering basics, and practical project execution.",
        },
      ],
      skills: [
        { id: "s1", name: "Technical Documentation & CAD/IT", category: "Technical", level: 5 },
        { id: "s2", name: "Quality Management & Compliance", category: "Technical", level: 4 },
        { id: "s3", name: "Process Optimization & Testing", category: "Technical", level: 4 },
        { id: "s4", name: "Problem Solving & Analytical Skills", category: "Soft", level: 5 },
        { id: "s5", name: "Intercultural Communication", category: "Soft", level: 4 },
      ],
      languages: [
        { id: "l1", language: "German", proficiency: "B2" },
        { id: "l2", language: "English", proficiency: "C1" },
      ],
      certifications: [
        {
          id: "c1",
          title: "Goethe-Zertifikat B2 / German Language Qualification",
          issuer: "Goethe-Institut",
          issueDate: "2024-02",
        },
        {
          id: "c2",
          title: `SCCG ${cand.workflowCategory} Qualification Certificate`,
          issuer: "SCCG Career Lab",
          issueDate: "2024-05",
        },
      ],
      projects: [
        {
          id: "p1",
          title: "Process Improvement Project",
          role: "Team Member",
          description: "Developed an efficient workflow tracking system reducing task resolution latency.",
        },
      ],
      settings: {
        templateId: "berlin",
        accentColor: "blue",
        fontFamily: "inter",
        spacing: "normal",
      },
    });
  };

  // Initial load check for query params (e.g. ?candidate=Mohammed%20Shamsul%20Arifin)
  useEffect(() => {
    if (initialCandidateId) {
      const match = candidates.find((c) => c.id === initialCandidateId);
      if (match) {
        populateCandidateData(match);
        return;
      }
    }

    if (initialCandidateQuery) {
      const q = initialCandidateQuery.toLowerCase().trim();
      const match = candidates.find(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.sccgId.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      );

      if (match) {
        populateCandidateData(match);
      } else {
        // Create full candidate profile for the name provided (e.g. Mohammed Shamsul Arifin)
        populateCandidateData({
          id: "c_query_" + Date.now(),
          sccgId: "CND-2026-QUERY",
          submissionId: "sub_query",
          partnerId: "partner_query",
          workflowCategory: "Ausbildung",
          currentStatus: "REGISTERED",
          fullName: initialCandidateQuery,
          dateOfBirth: "1997-04-12",
          email: `${initialCandidateQuery.toLowerCase().replace(/\s+/g, ".")}@example.com`,
          phone: "+49 176 98765432",
          nationality: "International",
          country: "Germany",
          totalServiceFee: 1500,
          sccgShare: 1200,
          partnerShare: 300,
          depositAmount: 450,
          marginPercentage: 20,
          paymentStatus: "deposit-paid",
          createdBy: "system",
          createdAt: new Date().toISOString(),
          submittedAt: new Date().toISOString(),
        });
      }
    }
  }, [initialCandidateQuery, initialCandidateId, candidates]);

  // ── BROWSER PRINT / PRINT TO PDF ──────────────────────────
  const handlePrint = () => {
    window.print();
  };

  // ── DIRECT EXPORT PDF ──────────────────────────────────────
  const handleExportPdf = () => {
    setExporting("pdf");
    try {
      const pdfBytes = generateCvStudioPdf(cvData);
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = (cvData.personalInfo.fullName || "Candidate")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      link.download = `CV_${safeName}_${cvData.settings.templateId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed. Please check inputs.");
    } finally {
      setExporting(null);
    }
  };

  // ── EXPORT DOCX (Word) ────────────────────────────────────
  const handleExportDocx = async () => {
    setExporting("docx");
    try {
      const docxBlob = await generateCvDocx(cvData);
      const url = URL.createObjectURL(docxBlob);
      const link = document.createElement("a");
      link.href = url;
      const safeName = (cvData.personalInfo.fullName || "Candidate")
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      link.download = `CV_${safeName}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOCX generation failed:", err);
      alert("Word document export failed. Please check inputs.");
    } finally {
      setExporting(null);
    }
  };

  // ── EXPORT JSON ───────────────────────────────────────────
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(cvData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CV_Data_${(cvData.personalInfo.fullName || "Candidate").replace(/\s+/g, "_")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card border rounded-2xl shadow-sm">
        {/* Candidate Selector Import */}
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-muted-foreground">Import Candidate Data:</span>
          <select
            value={selectedCandidateId}
            onChange={(e) => handleImportCandidate(e.target.value)}
            className="text-xs p-2 rounded-lg border bg-background font-medium outline-none focus:ring-1 focus:ring-primary max-w-xs"
          >
            <option value="">-- Choose Candidate from Portal --</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} ({c.workflowCategory})
              </option>
            ))}
          </select>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          {/* Print / Save PDF Button */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-all shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>

          <button
            onClick={handleExportPdf}
            disabled={exporting === "pdf"}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting === "pdf" ? "Exporting PDF..." : "Download PDF"}
          </button>

          <button
            onClick={handleExportDocx}
            disabled={exporting === "docx"}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            {exporting === "docx" ? "Exporting Word..." : "Download Word (.docx)"}
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium hover:bg-muted transition-colors"
          >
            <FileCode className="w-3.5 h-3.5" />
            JSON
          </button>
        </div>
      </div>

      {/* Split Screen Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form Controls & Customizer */}
        <div className="lg:col-span-5 space-y-4">
          <CvCustomizer data={cvData} onChange={setCvData} />
          <CvFormEditor data={cvData} onChange={setCvData} />
        </div>

        {/* Right Column: Live Interactive Canvas */}
        <div className="lg:col-span-7 bg-muted/30 p-6 rounded-2xl border flex flex-col items-center min-h-[800px] overflow-auto">
          {/* Zoom Controls */}
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Live Preview ({cvData.settings.templateId.toUpperCase()})
            </span>
            <div className="flex items-center gap-2 bg-card p-1 rounded-lg border">
              <button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <span className="text-[11px] font-bold px-2">{Math.round(scale * 100)}%</span>

              <button
                onClick={() => setScale((s) => Math.min(1.2, s + 0.1))}
                className="p-1 text-muted-foreground hover:text-foreground"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Live Preview Paper */}
          <CvPreview ref={previewRef} data={cvData} scale={scale} />
        </div>
      </div>
    </div>
  );
}
