"use client";

import { forwardRef } from "react";
import { Mail, Phone, MapPin, Globe, Award, Briefcase, GraduationCap, Code } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CvData } from "@/types/cv-builder";

interface CvPreviewProps {
  data: CvData;
  scale?: number;
}

const ACCENT_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  blue: { bg: "bg-blue-600", text: "text-blue-600", border: "border-blue-600", bar: "bg-blue-600" },
  emerald: { bg: "bg-emerald-600", text: "text-emerald-600", border: "border-emerald-600", bar: "bg-emerald-600" },
  indigo: { bg: "bg-indigo-600", text: "text-indigo-600", border: "border-indigo-600", bar: "bg-indigo-600" },
  crimson: { bg: "bg-rose-700", text: "text-rose-700", border: "border-rose-700", bar: "bg-rose-700" },
  slate: { bg: "bg-slate-800", text: "text-slate-800", border: "border-slate-800", bar: "bg-slate-800" },
  violet: { bg: "bg-violet-600", text: "text-violet-600", border: "border-violet-600", bar: "bg-violet-600" },
};

const FONT_CLASSES: Record<string, string> = {
  inter: "font-sans",
  serif: "font-serif",
  mono: "font-mono",
  outfit: "font-sans tracking-wide",
};

export const CvPreview = forwardRef<HTMLDivElement, CvPreviewProps>(function CvPreview(
  { data, scale = 1 },
  ref
) {
  const { personalInfo, workExperience, education, skills, languages, certifications, projects, settings } = data;
  const colors = ACCENT_COLORS[settings.accentColor] || ACCENT_COLORS.blue;
  const fontClass = FONT_CLASSES[settings.fontFamily] || "font-sans";

  const isZurich = settings.templateId === "zurich";
  const isMunich = settings.templateId === "munich";
  const isVienna = settings.templateId === "vienna";

  return (
    <div
      ref={ref}
      id="cv-preview-canvas"
      style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
      className={cn(
        "w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl rounded-sm p-0 transition-all duration-300 select-text overflow-hidden text-xs",
        fontClass
      )}
    >
      {/* ── ZURICH TEMPLATE (Split Sidebar) ────────────────── */}
      {isZurich ? (
        <div className="grid grid-cols-12 min-h-[297mm]">
          {/* Left Sidebar */}
          <div className={cn("col-span-4 p-6 text-white space-y-6", colors.bg)}>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{personalInfo.fullName}</h1>
              {personalInfo.jobTitle && (
                <p className="text-xs text-white/80 mt-1 font-medium">{personalInfo.jobTitle}</p>
              )}
            </div>

            {/* Contact */}
            <div className="space-y-2 text-[11px] text-white/90">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Contact</p>
              {personalInfo.email && <p className="flex items-center gap-1.5 break-all"><Mail className="w-3 h-3 shrink-0" />{personalInfo.email}</p>}
              {personalInfo.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0" />{personalInfo.phone}</p>}
              {personalInfo.location && <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3 shrink-0" />{personalInfo.location}</p>}
              {personalInfo.linkedin && <p className="flex items-center gap-1.5 break-all"><Globe className="w-3 h-3 shrink-0" />{personalInfo.linkedin}</p>}
              {personalInfo.website && <p className="flex items-center gap-1.5 break-all"><Globe className="w-3 h-3 shrink-0" />{personalInfo.website}</p>}
            </div>

            {/* Languages */}
            {languages.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Languages</p>
                {languages.map((l) => (
                  <div key={l.id} className="flex justify-between text-[11px]">
                    <span>{l.language}</span>
                    <span className="font-semibold text-white/80">{l.proficiency}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {skills.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">Core Skills</p>
                {skills.map((s) => (
                  <div key={s.id} className="space-y-1">
                    <p className="text-[11px] font-medium">{s.name}</p>
                    <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full" style={{ width: `${(s.level / 5) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Main Body */}
          <div className="col-span-8 p-8 space-y-6 bg-slate-50/50">
            {/* Summary */}
            {personalInfo.summary && (
              <div>
                <h2 className={cn("text-xs font-bold uppercase tracking-widest pb-1 border-b-2 mb-2", colors.text, colors.border)}>
                  Profile Overview
                </h2>
                <p className="text-slate-700 leading-relaxed text-xs">{personalInfo.summary}</p>
              </div>
            )}

            {/* Experience */}
            {workExperience.length > 0 && (
              <div>
                <h2 className={cn("text-xs font-bold uppercase tracking-widest pb-1 border-b-2 mb-3", colors.text, colors.border)}>
                  Work Experience
                </h2>
                <div className="space-y-4">
                  {workExperience.map((exp) => (
                    <div key={exp.id} className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <p className="font-bold text-slate-900">{exp.jobTitle}</p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate}
                        </p>
                      </div>
                      <p className="text-slate-600 text-[11px] font-medium">
                        {exp.employer}{exp.location ? ` · ${exp.location}` : ""}
                      </p>
                      {exp.description && (
                        <p className="text-slate-600 leading-relaxed whitespace-pre-line text-xs mt-1">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {education.length > 0 && (
              <div>
                <h2 className={cn("text-xs font-bold uppercase tracking-widest pb-1 border-b-2 mb-3", colors.text, colors.border)}>
                  Education & Training
                </h2>
                <div className="space-y-3">
                  {education.map((edu) => (
                    <div key={edu.id} className="flex justify-between items-baseline">
                      <div>
                        <p className="font-bold text-slate-900">{edu.degree}</p>
                        <p className="text-slate-600 text-[11px]">{edu.institution}{edu.grade ? ` (${edu.grade})` : ""}</p>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">{edu.endDate}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── BERLIN, MUNICH, VIENNA TEMPLATES ────────────────── */
        <div className="p-8 space-y-6">
          {/* Header */}
          {isVienna ? (
            <div className={cn("p-6 -mx-8 -mt-8 text-white mb-6", colors.bg)}>
              <h1 className="text-2xl font-bold tracking-tight">{personalInfo.fullName}</h1>
              {personalInfo.jobTitle && <p className="text-sm text-white/90 font-medium mt-1">{personalInfo.jobTitle}</p>}
            </div>
          ) : isMunich ? (
            <div className="text-center space-y-1 pb-4 border-b">
              <h1 className={cn("text-2xl font-bold tracking-tight", colors.text)}>{personalInfo.fullName}</h1>
              {personalInfo.jobTitle && <p className="text-xs font-medium text-slate-600 italic">{personalInfo.jobTitle}</p>}
            </div>
          ) : (
            /* Berlin ATS */
            <div className="flex items-start gap-4 border-b pb-5">
              <div className={cn("w-1.5 h-12 rounded-full", colors.bg)} />
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{personalInfo.fullName}</h1>
                {personalInfo.jobTitle && <p className="text-xs font-semibold text-slate-600 mt-0.5">{personalInfo.jobTitle}</p>}
              </div>
            </div>
          )}

          {/* Contact Bar */}
          <div className={cn("flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600", isMunich && "justify-center")}>
            {personalInfo.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" />{personalInfo.email}</span>}
            {personalInfo.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{personalInfo.phone}</span>}
            {personalInfo.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{personalInfo.location}</span>}
            {personalInfo.linkedin && <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-slate-400" />{personalInfo.linkedin}</span>}
            {personalInfo.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-slate-400" />{personalInfo.website}</span>}
          </div>

          {/* Summary */}
          {personalInfo.summary && (
            <div>
              <h2 className={cn("text-xs font-bold uppercase tracking-wider pb-1 border-b mb-2", colors.text, colors.border)}>
                Professional Summary
              </h2>
              <p className="text-slate-700 leading-relaxed">{personalInfo.summary}</p>
            </div>
          )}

          {/* Experience */}
          {workExperience.length > 0 && (
            <div>
              <h2 className={cn("text-xs font-bold uppercase tracking-wider pb-1 border-b mb-3", colors.text, colors.border)}>
                Work Experience
              </h2>
              <div className="space-y-4">
                {workExperience.map((exp) => (
                  <div key={exp.id} className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <p className="font-bold text-slate-900 text-xs">{exp.jobTitle}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate}
                      </p>
                    </div>
                    <p className="text-slate-600 text-xs font-medium">
                      {exp.employer}{exp.location ? ` · ${exp.location}` : ""}
                    </p>
                    {exp.description && (
                      <p className="text-slate-600 leading-relaxed whitespace-pre-line text-xs mt-1">
                        {exp.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div>
              <h2 className={cn("text-xs font-bold uppercase tracking-wider pb-1 border-b mb-3", colors.text, colors.border)}>
                Education & Qualifications
              </h2>
              <div className="space-y-3">
                {education.map((edu) => (
                  <div key={edu.id} className="flex justify-between items-baseline">
                    <div>
                      <p className="font-bold text-slate-900">{edu.degree}</p>
                      <p className="text-slate-600 text-xs">{edu.institution}{edu.grade ? ` · Grade: ${edu.grade}` : ""}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold">{edu.endDate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skills & Languages */}
          <div className="grid grid-cols-2 gap-6">
            {skills.length > 0 && (
              <div>
                <h2 className={cn("text-xs font-bold uppercase tracking-wider pb-1 border-b mb-2", colors.text, colors.border)}>
                  Key Skills
                </h2>
                <div className="space-y-1.5">
                  {skills.map((s) => (
                    <div key={s.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-700">{s.name}</span>
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full", colors.bar)} style={{ width: `${(s.level / 5) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {languages.length > 0 && (
              <div>
                <h2 className={cn("text-xs font-bold uppercase tracking-wider pb-1 border-b mb-2", colors.text, colors.border)}>
                  Languages
                </h2>
                <div className="space-y-1 text-xs">
                  {languages.map((l) => (
                    <div key={l.id} className="flex justify-between text-slate-700">
                      <span>{l.language}</span>
                      <span className="font-semibold">{l.proficiency}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Certifications */}
          {certifications.length > 0 && (
            <div>
              <h2 className={cn("text-xs font-bold uppercase tracking-wider pb-1 border-b mb-2", colors.text, colors.border)}>
                Certifications
              </h2>
              <div className="space-y-1.5">
                {certifications.map((c) => (
                  <div key={c.id} className="flex justify-between text-xs">
                    <span className="font-medium text-slate-900">{c.title} <span className="text-slate-500 font-normal">({c.issuer})</span></span>
                    <span className="text-[10px] text-slate-500">{c.issueDate}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});
