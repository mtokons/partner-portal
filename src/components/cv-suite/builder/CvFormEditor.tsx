"use client";

import { useState } from "react";
import { Plus, Trash2, User, Briefcase, GraduationCap, Code, Globe, Award, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CvData, CvWorkExperience, CvEducation, CvSkill, CvLanguage, CvCertification } from "@/types/cv-builder";

interface CvFormEditorProps {
  data: CvData;
  onChange: (newData: CvData) => void;
}

export function CvFormEditor({ data, onChange }: CvFormEditorProps) {
  const [activeSection, setActiveSection] = useState<
    "personal" | "experience" | "education" | "skills" | "languages" | "certifications"
  >("personal");

  const updatePersonal = (field: string, value: string) => {
    onChange({
      ...data,
      personalInfo: {
        ...data.personalInfo,
        [field]: value,
      },
    });
  };

  // ── Work Experience Handlers ──────────────────────────────
  const addWorkExperience = () => {
    const newExp: CvWorkExperience = {
      id: "w_" + Date.now(),
      jobTitle: "Software Engineer / Specialist",
      employer: "Tech Company",
      startDate: "2023-01",
      isCurrent: true,
      description: "• Managed core deliverables and implemented features.",
    };
    onChange({ ...data, workExperience: [...data.workExperience, newExp] });
  };

  const updateWorkExperience = (id: string, field: keyof CvWorkExperience, value: unknown) => {
    onChange({
      ...data,
      workExperience: data.workExperience.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)),
    });
  };

  const deleteWorkExperience = (id: string) => {
    onChange({
      ...data,
      workExperience: data.workExperience.filter((exp) => exp.id !== id),
    });
  };

  // ── Education Handlers ─────────────────────────────────────
  const addEducation = () => {
    const newEdu: CvEducation = {
      id: "e_" + Date.now(),
      degree: "Bachelor of Science",
      institution: "University",
      endDate: "2023-06",
    };
    onChange({ ...data, education: [...data.education, newEdu] });
  };

  const updateEducation = (id: string, field: keyof CvEducation, value: string) => {
    onChange({
      ...data,
      education: data.education.map((edu) => (edu.id === id ? { ...edu, [field]: value } : edu)),
    });
  };

  const deleteEducation = (id: string) => {
    onChange({ ...data, education: data.education.filter((edu) => edu.id !== id) });
  };

  // ── Skill Handlers ─────────────────────────────────────────
  const addSkill = () => {
    const newSkill: CvSkill = {
      id: "s_" + Date.now(),
      name: "New Skill",
      category: "Technical",
      level: 4,
    };
    onChange({ ...data, skills: [...data.skills, newSkill] });
  };

  const updateSkill = (id: string, field: keyof CvSkill, value: unknown) => {
    onChange({
      ...data,
      skills: data.skills.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    });
  };

  const deleteSkill = (id: string) => {
    onChange({ ...data, skills: data.skills.filter((s) => s.id !== id) });
  };

  // ── Language Handlers ──────────────────────────────────────
  const addLanguage = () => {
    const newLang: CvLanguage = {
      id: "l_" + Date.now(),
      language: "German",
      proficiency: "B2",
    };
    onChange({ ...data, languages: [...data.languages, newLang] });
  };

  const updateLanguage = (id: string, field: keyof CvLanguage, value: string) => {
    onChange({
      ...data,
      languages: data.languages.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    });
  };

  const deleteLanguage = (id: string) => {
    onChange({ ...data, languages: data.languages.filter((l) => l.id !== id) });
  };

  // ── Certifications Handlers ────────────────────────────────
  const addCert = () => {
    const newCert: CvCertification = {
      id: "c_" + Date.now(),
      title: "German B2 Certificate",
      issuer: "Goethe-Institut",
      issueDate: "2024-01",
    };
    onChange({ ...data, certifications: [...data.certifications, newCert] });
  };

  const updateCert = (id: string, field: keyof CvCertification, value: string) => {
    onChange({
      ...data,
      certifications: data.certifications.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    });
  };

  const deleteCert = (id: string) => {
    onChange({ ...data, certifications: data.certifications.filter((c) => c.id !== id) });
  };

  const SECTIONS = [
    { key: "personal", label: "Personal", icon: User, count: 0 },
    { key: "experience", label: "Experience", icon: Briefcase, count: data.workExperience.length },
    { key: "education", label: "Education", icon: GraduationCap, count: data.education.length },
    { key: "skills", label: "Skills", icon: Code, count: data.skills.length },
    { key: "languages", label: "Languages", icon: Globe, count: data.languages.length },
    { key: "certifications", label: "Certs", icon: Award, count: data.certifications.length },
  ] as const;

  return (
    <div className="space-y-4">
      {/* Navigation Pills */}
      <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl overflow-x-auto">
        {SECTIONS.map((sec) => (
          <button
            key={sec.key}
            onClick={() => setActiveSection(sec.key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
              activeSection === sec.key
                ? "bg-card text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <sec.icon className="w-3.5 h-3.5" />
            {sec.label}
            {sec.count !== undefined && sec.count > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-primary/10 text-primary font-bold">
                {sec.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── PERSONAL SECTION ─────────────────────────────────── */}
      {activeSection === "personal" && (
        <div className="space-y-3 bg-card p-4 rounded-xl border animate-in fade-in">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary" /> Personal Information
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Full Name</label>
              <input
                type="text"
                value={data.personalInfo.fullName}
                onChange={(e) => updatePersonal("fullName", e.target.value)}
                className="w-full text-xs p-2 rounded-lg border bg-background outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Target Job Title</label>
              <input
                type="text"
                value={data.personalInfo.jobTitle}
                onChange={(e) => updatePersonal("jobTitle", e.target.value)}
                className="w-full text-xs p-2 rounded-lg border bg-background outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                value={data.personalInfo.email}
                onChange={(e) => updatePersonal("email", e.target.value)}
                className="w-full text-xs p-2 rounded-lg border bg-background outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Phone</label>
              <input
                type="text"
                value={data.personalInfo.phone}
                onChange={(e) => updatePersonal("phone", e.target.value)}
                className="w-full text-xs p-2 rounded-lg border bg-background outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">Location (City, Country)</label>
              <input
                type="text"
                value={data.personalInfo.location}
                onChange={(e) => updatePersonal("location", e.target.value)}
                className="w-full text-xs p-2 rounded-lg border bg-background outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-muted-foreground">LinkedIn URL</label>
              <input
                type="text"
                value={data.personalInfo.linkedin || ""}
                onChange={(e) => updatePersonal("linkedin", e.target.value)}
                className="w-full text-xs p-2 rounded-lg border bg-background outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span>Executive Summary / Bio</span>
            </label>
            <textarea
              rows={4}
              value={data.personalInfo.summary}
              onChange={(e) => updatePersonal("summary", e.target.value)}
              placeholder="Write a concise overview of candidate experience and VET goals..."
              className="w-full text-xs p-2 rounded-lg border bg-background outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      )}

      {/* ── WORK EXPERIENCE SECTION ──────────────────────────── */}
      {activeSection === "experience" && (
        <div className="space-y-4 bg-card p-4 rounded-xl border animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-primary" /> Work History
            </h3>
            <button
              onClick={addWorkExperience}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Experience
            </button>
          </div>

          {data.workExperience.map((exp) => (
            <div key={exp.id} className="p-3 rounded-lg border bg-muted/20 space-y-3 relative">
              <button
                onClick={() => deleteWorkExperience(exp.id)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-rose-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="grid grid-cols-2 gap-2 pr-6">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Job Title</label>
                  <input
                    type="text"
                    value={exp.jobTitle}
                    onChange={(e) => updateWorkExperience(exp.id, "jobTitle", e.target.value)}
                    className="w-full text-xs p-1.5 rounded border bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Company / Employer</label>
                  <input
                    type="text"
                    value={exp.employer}
                    onChange={(e) => updateWorkExperience(exp.id, "employer", e.target.value)}
                    className="w-full text-xs p-1.5 rounded border bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Start Date</label>
                  <input
                    type="text"
                    value={exp.startDate}
                    onChange={(e) => updateWorkExperience(exp.id, "startDate", e.target.value)}
                    className="w-full text-xs p-1.5 rounded border bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">End Date</label>
                  <input
                    type="text"
                    disabled={exp.isCurrent}
                    value={exp.isCurrent ? "Present" : exp.endDate || ""}
                    onChange={(e) => updateWorkExperience(exp.id, "endDate", e.target.value)}
                    className="w-full text-xs p-1.5 rounded border bg-background disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`curr_${exp.id}`}
                  checked={exp.isCurrent}
                  onChange={(e) => updateWorkExperience(exp.id, "isCurrent", e.target.checked)}
                  className="rounded border-muted-foreground/30 accent-primary"
                />
                <label htmlFor={`curr_${exp.id}`} className="text-xs font-medium text-muted-foreground">
                  I currently work here
                </label>
              </div>

              <div>
                <label className="text-[10px] font-medium text-muted-foreground">Key Responsibilities / Achievements</label>
                <textarea
                  rows={3}
                  value={exp.description}
                  onChange={(e) => updateWorkExperience(exp.id, "description", e.target.value)}
                  className="w-full text-xs p-1.5 rounded border bg-background"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EDUCATION SECTION ────────────────────────────────── */}
      {activeSection === "education" && (
        <div className="space-y-4 bg-card p-4 rounded-xl border animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-primary" /> Academic Qualifications
            </h3>
            <button
              onClick={addEducation}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Education
            </button>
          </div>

          {data.education.map((edu) => (
            <div key={edu.id} className="p-3 rounded-lg border bg-muted/20 space-y-2 relative">
              <button
                onClick={() => deleteEducation(edu.id)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-rose-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <div className="grid grid-cols-2 gap-2 pr-6">
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Degree / Diploma</label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                    className="w-full text-xs p-1.5 rounded border bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Institution / University</label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => updateEducation(edu.id, "institution", e.target.value)}
                    className="w-full text-xs p-1.5 rounded border bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Graduation Date</label>
                  <input
                    type="text"
                    value={edu.endDate}
                    onChange={(e) => updateEducation(edu.id, "endDate", e.target.value)}
                    className="w-full text-xs p-1.5 rounded border bg-background"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-medium text-muted-foreground">Grade / GPA (Optional)</label>
                  <input
                    type="text"
                    value={edu.grade || ""}
                    onChange={(e) => updateEducation(edu.id, "grade", e.target.value)}
                    className="w-full text-xs p-1.5 rounded border bg-background"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── SKILLS SECTION ───────────────────────────────────── */}
      {activeSection === "skills" && (
        <div className="space-y-4 bg-card p-4 rounded-xl border animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-primary" /> Core Skills
            </h3>
            <button
              onClick={addSkill}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Skill
            </button>
          </div>

          <div className="space-y-2">
            {data.skills.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20">
                <input
                  type="text"
                  value={s.name}
                  onChange={(e) => updateSkill(s.id, "name", e.target.value)}
                  className="flex-1 text-xs p-1.5 rounded border bg-background"
                  placeholder="Skill Name"
                />
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">Level:</span>
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => updateSkill(s.id, "level", lvl)}
                      className={cn(
                        "w-5 h-5 rounded text-[10px] font-bold transition-colors",
                        s.level >= lvl
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => deleteSkill(s.id)}
                  className="text-muted-foreground hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LANGUAGES SECTION ────────────────────────────────── */}
      {activeSection === "languages" && (
        <div className="space-y-4 bg-card p-4 rounded-xl border animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-primary" /> Languages
            </h3>
            <button
              onClick={addLanguage}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Language
            </button>
          </div>

          <div className="space-y-2">
            {data.languages.map((l) => (
              <div key={l.id} className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20">
                <input
                  type="text"
                  value={l.language}
                  onChange={(e) => updateLanguage(l.id, "language", e.target.value)}
                  className="flex-1 text-xs p-1.5 rounded border bg-background"
                  placeholder="Language"
                />
                <select
                  value={l.proficiency}
                  onChange={(e) => updateLanguage(l.id, "proficiency", e.target.value)}
                  className="text-xs p-1.5 rounded border bg-background font-medium"
                >
                  {["A1", "A2", "B1", "B2", "C1", "C2", "Native"].map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => deleteLanguage(l.id)}
                  className="text-muted-foreground hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CERTIFICATIONS SECTION ───────────────────────────── */}
      {activeSection === "certifications" && (
        <div className="space-y-4 bg-card p-4 rounded-xl border animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-primary" /> Certifications & Licenses
            </h3>
            <button
              onClick={addCert}
              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Certification
            </button>
          </div>

          <div className="space-y-2">
            {data.certifications.map((c) => (
              <div key={c.id} className="p-2.5 rounded-lg border bg-muted/20 space-y-2 relative">
                <button
                  onClick={() => deleteCert(c.id)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-rose-500 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="grid grid-cols-3 gap-2 pr-6">
                  <input
                    type="text"
                    value={c.title}
                    onChange={(e) => updateCert(c.id, "title", e.target.value)}
                    className="text-xs p-1.5 rounded border bg-background"
                    placeholder="Certificate Title"
                  />
                  <input
                    type="text"
                    value={c.issuer}
                    onChange={(e) => updateCert(c.id, "issuer", e.target.value)}
                    className="text-xs p-1.5 rounded border bg-background"
                    placeholder="Issuing Organization"
                  />
                  <input
                    type="text"
                    value={c.issueDate}
                    onChange={(e) => updateCert(c.id, "issueDate", e.target.value)}
                    className="text-xs p-1.5 rounded border bg-background"
                    placeholder="Date (e.g. 2024-03)"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
