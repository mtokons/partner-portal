"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  FileEdit,
  Palette,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  FileUp,
  RefreshCw,
  Eye,
  FileCode,
  Layout,
  Plus,
  Briefcase,
  GraduationCap,
  Wrench,
  User,
  ArrowRight,
  ArrowLeft,
  FileType,
  Check,
} from "lucide-react";

type Phase = 1 | 2 | 3 | 4;

interface TemplateOption {
  id: string;
  name: string;
  desc: string;
  accent: string;
  previewBg: string;
  tag: string;
}

const TEMPLATES: TemplateOption[] = [
  {
    id: "minimal",
    name: "Clean Minimal",
    desc: "Single-column layout with generous whitespace, crisp typography, and subtle blue accents.",
    accent: "from-blue-500 to-indigo-600",
    previewBg: "bg-blue-950/40 border-blue-500/30",
    tag: "Standard",
  },
  {
    id: "corporate",
    name: "Classic Corporate",
    desc: "Two-column sidebar structure with dark navy theme, ideal for executive & corporate roles.",
    accent: "from-slate-600 to-slate-900",
    previewBg: "bg-slate-900/60 border-slate-700/50",
    tag: "Executive",
  },
  {
    id: "modern",
    name: "Modern Grid",
    desc: "Bold purple/indigo gradient banner with card-style section containers and modern badges.",
    accent: "from-purple-600 to-pink-600",
    previewBg: "bg-purple-950/40 border-purple-500/30",
    tag: "Creative / Tech",
  },
];

const DEFAULT_MARKDOWN = `# John Doe
**Senior Software Engineer & Cloud Architect**

📍 Munich, Germany | 📧 john.doe@example.com | 📞 +49 170 1234567 | 🌐 linkedin.com/in/johndoe

---

## Professional Profile
Results-driven Cloud Architect and Senior Full-Stack Engineer with 8+ years of experience designing and deploying scalable web applications, microservices, and automated CI/CD pipelines.

---

## Technical Skills
- **Languages:** TypeScript, JavaScript, Python, Go, SQL, HTML5/CSS3
- **Frameworks:** Next.js, React, Node.js, FastAPI, Express, TailwindCSS
- **Cloud & DevOps:** AWS, Docker, Kubernetes, Terraform, GitHub Actions, Linux
- **Databases:** PostgreSQL, MongoDB, Redis, Cloud Firestore

---

## Work Experience

### **Lead Cloud Architect** | Tech Solutions GmbH
*Munich, Germany | Jan 2022 – Present*
- Architected enterprise cloud microservices serving over 500,000 active monthly users.
- Reduced cloud infrastructure overhead by 35% through containerization and auto-scaling.
- Led a cross-functional team of 6 engineers across high-priority client deployments.

### **Senior Full-Stack Developer** | Innovate IT Solutions
*Berlin, Germany | Mar 2018 – Dec 2021*
- Developed responsive web applications using React, Next.js, and Node.js REST APIs.
- Integrated automated testing suites, improving deployment stability and reducing bug rate by 40%.

---

## Education

### **Master of Science in Computer Science**
*Technical University of Munich (TUM) | 2016 – 2018*

### **Bachelor of Science in Software Engineering**
*University of Stuttgart | 2012 – 2016*
`;

export default function CvMakerPage() {
  const [currentPhase, setCurrentPhase] = useState<Phase>(1);
  const [file, setFile] = useState<File | null>(null);
  const [markdown, setMarkdown] = useState<string>(DEFAULT_MARKDOWN);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("minimal");
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  
  // Loading states
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  // Notification / Alert
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Render HTML preview whenever template or phase changes to 3
  useEffect(() => {
    if (currentPhase === 3 || currentPhase === 4) {
      renderPreviewHtml(markdown, selectedTemplate);
    }
  }, [currentPhase, selectedTemplate]);

  const renderPreviewHtml = async (mdText: string, templateId: string) => {
    setIsRendering(true);
    try {
      const res = await fetch("/api/cv-maker/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: mdText, template_id: templateId }),
      });
      if (res.ok) {
        const data = await res.json();
        setRenderedHtml(data.html || "");
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Failed to render template preview." });
      }
    } catch {
      setMessage({ type: "error", text: "Error contacting preview render engine." });
    } finally {
      setIsRendering(false);
    }
  };

  const handleFileUpload = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/cv-maker/parse", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.markdown) {
          setMarkdown(data.markdown);
          setMessage({
            type: "success",
            text: `Successfully extracted ${data.chars} characters using MarkItDown!`,
          });
          setCurrentPhase(2);
        }
      } else {
        const errData = await res.json();
        setMessage({ type: "error", text: errData.error || "Failed to extract text from file." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error while uploading file." });
    } finally {
      setIsParsing(false);
    }
  };

  const handleExport = async (format: "pdf" | "docx") => {
    setIsExporting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/cv-maker/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown,
          template_id: selectedTemplate,
          format,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `CV_${selectedTemplate}_${new Date().toISOString().slice(0, 10)}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        setMessage({
          type: "success",
          text: `CV exported as ${format.toUpperCase()} successfully!`,
        });
      } else {
        const errData = await res.json();
        setMessage({ type: "error", text: errData.error || `Failed to export ${format.toUpperCase()}.` });
      }
    } catch {
      setMessage({ type: "error", text: `Network error during ${format.toUpperCase()} export.` });
    } finally {
      setIsExporting(false);
    }
  };

  // Helper snippet appenders for Markdown editor
  const appendSnippet = (snippet: string) => {
    setMarkdown((prev) => prev.trim() + "\n\n" + snippet);
  };

  return (
    <div className="min-h-screen bg-[#0b0f17] text-gray-100 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                <FileEdit className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  CV Maker
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                    MarkItDown Engine
                  </span>
                </h1>
                <p className="text-sm text-gray-400">
                  Transform existing CV files into clean Markdown, edit details, apply templates, and export PDF/DOCX.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {currentPhase > 1 && (
              <button
                onClick={() => setCurrentPhase((p) => Math.max(1, p - 1) as Phase)}
                className="px-3.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-gray-700"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            )}
            {currentPhase < 4 && (
              <button
                onClick={() => setCurrentPhase((p) => Math.min(4, p + 1) as Phase)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-md shadow-blue-600/30"
              >
                Next Phase <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Phase Stepper Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { step: 1, title: "1. Upload CV", desc: "PDF / DOCX / TXT", icon: Upload },
            { step: 2, title: "2. Content Edit", desc: "Markdown Live Editor", icon: FileCode },
            { step: 3, title: "3. Template Style", desc: "Live HTML Preview", icon: Palette },
            { step: 4, title: "4. Export Engine", desc: "PDF & DOCX Output", icon: Download },
          ].map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPhase === item.step;
            const isCompleted = currentPhase > item.step;

            return (
              <button
                key={item.step}
                onClick={() => setCurrentPhase(item.step as Phase)}
                className={`p-3.5 rounded-xl text-left border transition-all relative overflow-hidden ${
                  isActive
                    ? "bg-blue-950/40 border-blue-500/50 shadow-lg shadow-blue-500/10"
                    : isCompleted
                    ? "bg-gray-900/60 border-emerald-500/30 text-gray-300"
                    : "bg-gray-900/40 border-gray-800 text-gray-500 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg ${
                        isActive
                          ? "bg-blue-500 text-white"
                          : isCompleted
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-gray-800 text-gray-500"
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : <IconComponent className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3
                        className={`text-xs font-semibold ${
                          isActive ? "text-blue-400" : isCompleted ? "text-gray-200" : "text-gray-400"
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                </div>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div className="max-w-7xl mx-auto mb-6">
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
              message.type === "success"
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                : "bg-red-950/40 border-red-500/30 text-red-300"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
            <button
              onClick={() => setMessage(null)}
              className="text-gray-400 hover:text-white text-xs px-2 py-0.5"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
        {/* PHASE 1: INGESTION & TEXT EXTRACTION */}
        {currentPhase === 1 && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 md:p-10 text-center">
            <div className="max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto mb-4">
                <FileUp className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Upload Existing CV</h2>
              <p className="text-xs text-gray-400 mb-6">
                Upload your CV in PDF, DOCX, or text format. Our backend uses{" "}
                <strong className="text-blue-400">MarkItDown</strong> to strip formatting chaos and
                convert it into clean, uniform Markdown.
              </p>

              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.docx,.doc,.txt,.md"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-gray-700 hover:border-blue-500/50 rounded-2xl p-8 cursor-pointer bg-gray-950/40 transition-all group mb-6"
              >
                {isParsing ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    <p className="text-xs text-gray-300 font-medium">
                      Extracting text via MarkItDown engine...
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-gray-500 group-hover:text-blue-400 transition-colors mb-1" />
                    <p className="text-xs font-semibold text-gray-200">
                      Click to choose file or drag & drop here
                    </p>
                    <p className="text-[11px] text-gray-500">Supports PDF, DOCX, DOC, TXT, MD</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-800 pt-6 text-xs text-gray-400">
                <span>Or start from sample standard Markdown CV</span>
                <button
                  onClick={() => setCurrentPhase(2)}
                  className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  Use Sample Template <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 2: CONTENT MANAGEMENT & EDITING */}
        {currentPhase === 2 && (
          <div className="space-y-4">
            {/* Quick Action Snippet Bar */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-gray-200">Quick Insertion Helpers:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  onClick={() =>
                    appendSnippet(
                      `## Skills & Competencies\n- **Core:** Skill 1, Skill 2, Skill 3\n- **Tools:** Tool A, Tool B`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center gap-1.5 border border-gray-700 transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5 text-blue-400" /> + Add Skills
                </button>
                <button
                  onClick={() =>
                    appendSnippet(
                      `### **Job Title** | Company Name\n*City, Country | Start Date – End Date*\n- Key achievement or responsibility point 1.\n- Key achievement or responsibility point 2.`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center gap-1.5 border border-gray-700 transition-colors"
                >
                  <Briefcase className="w-3.5 h-3.5 text-purple-400" /> + Add Experience
                </button>
                <button
                  onClick={() =>
                    appendSnippet(
                      `### **Degree Name**\n*Institution / University | Years*`
                    )
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 flex items-center gap-1.5 border border-gray-700 transition-colors"
                >
                  <GraduationCap className="w-3.5 h-3.5 text-emerald-400" /> + Add Education
                </button>
              </div>
            </div>

            {/* Split Editor Pane */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Markdown Input Textarea */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex flex-col h-[650px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-blue-400" />
                    <h3 className="text-xs font-semibold text-gray-200">Markdown Editor</h3>
                  </div>
                  <span className="text-[11px] text-gray-500">
                    {markdown.length} chars | {markdown.split("\n").length} lines
                  </span>
                </div>
                <textarea
                  value={markdown}
                  onChange={(e) => setMarkdown(e.target.value)}
                  placeholder="Type or paste your Markdown CV content here..."
                  className="w-full flex-1 bg-gray-950 text-gray-200 font-mono text-xs p-4 rounded-lg border border-gray-800 focus:border-blue-500 focus:outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Raw Text Stream Preview */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex flex-col h-[650px]">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold text-gray-200">
                      Live Markdown Stream Preview
                    </h3>
                  </div>
                  <span className="text-[11px] text-gray-500">Real-time view</span>
                </div>
                <div className="w-full flex-1 bg-gray-950 p-6 rounded-lg border border-gray-800 overflow-y-auto prose prose-invert prose-xs max-w-none">
                  {markdown ? (
                    <div
                      dangerouslySetInnerHTML={{
                        __html: markdown
                          .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold text-blue-400 mb-2">$1</h1>')
                          .replace(/^## (.*$)/gim, '<h2 class="text-sm font-bold text-gray-200 border-b border-gray-800 pb-1 mt-4 mb-2">$1</h2>')
                          .replace(/^### (.*$)/gim, '<h3 class="text-xs font-semibold text-gray-300 mt-2 mb-1">$1</h3>')
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em class="text-gray-400">$1</em>')
                          .replace(/^- (.*$)/gim, '<li class="ml-4 text-gray-300 text-xs">$1</li>')
                          .replace(/\n\n/g, '<br/>'),
                      }}
                    />
                  ) : (
                    <p className="text-xs text-gray-600 italic">No content to preview.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCurrentPhase(3)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                Proceed to Template Styling <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PHASE 3: TEMPLATE STYLING & PREVIEW */}
        {currentPhase === 3 && (
          <div className="space-y-6">
            {/* Template Cards Selection */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Select Visual Template
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate === tmpl.id;
                  return (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? `bg-gray-900 border-blue-500 shadow-lg shadow-blue-500/10`
                          : "bg-gray-900/40 border-gray-800 hover:border-gray-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-white">{tmpl.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-medium">
                          {tmpl.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed mb-4">{tmpl.desc}</p>
                      <div
                        className={`h-2 rounded-full bg-gradient-to-r ${tmpl.accent} opacity-80`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Live Styled HTML Preview Window */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-semibold text-gray-200">
                    Live HTML / CSS Template Preview
                  </h3>
                </div>
                {isRendering && (
                  <div className="flex items-center gap-1.5 text-xs text-blue-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rendering...</span>
                  </div>
                )}
              </div>

              <div className="bg-gray-950 rounded-xl overflow-hidden border border-gray-800 h-[700px]">
                {renderedHtml ? (
                  <iframe
                    srcDoc={renderedHtml}
                    title="CV Preview"
                    className="w-full h-full border-0 bg-white"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                    <p className="text-xs">Generating styled preview...</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setCurrentPhase(4)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-2 shadow-lg shadow-blue-600/20"
              >
                Proceed to Export Engine <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PHASE 4: EXPORT ENGINE */}
        {currentPhase === 4 && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 md:p-10 text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Export CV Document</h2>
            <p className="text-xs text-gray-400 mb-8 max-w-md mx-auto">
              Your CV is formatted and styled with the{" "}
              <strong className="text-white">
                {TEMPLATES.find((t) => t.id === selectedTemplate)?.name}
              </strong>{" "}
              template. Choose your preferred export format.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {/* PDF Button */}
              <button
                onClick={() => handleExport("pdf")}
                disabled={isExporting}
                className="p-6 rounded-xl bg-gradient-to-b from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border border-gray-700 hover:border-blue-500/50 transition-all flex flex-col items-center gap-3 group text-center disabled:opacity-50"
              >
                <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                  <FileType className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Export as PDF</h3>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Via WeasyPrint CSS layout engine
                  </p>
                </div>
              </button>

              {/* DOCX Button */}
              <button
                onClick={() => handleExport("docx")}
                disabled={isExporting}
                className="p-6 rounded-xl bg-gradient-to-b from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 border border-gray-700 hover:border-purple-500/50 transition-all flex flex-col items-center gap-3 group text-center disabled:opacity-50"
              >
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Export as DOCX</h3>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Editable Microsoft Word document
                  </p>
                </div>
              </button>
            </div>

            {isExporting && (
              <div className="flex items-center justify-center gap-2 text-xs text-blue-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Compiling and preparing download...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
