"use client";

import { Palette, Layout, Type, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CvData, CvTemplateId, CvAccentColor, CvFontFamily } from "@/types/cv-builder";
import { DEFAULT_CV_DATA } from "@/types/cv-builder";

interface CvCustomizerProps {
  data: CvData;
  onChange: (newData: CvData) => void;
}

const TEMPLATES: Array<{ id: CvTemplateId; name: string; desc: string }> = [
  { id: "berlin", name: "Berlin", desc: "ATS-Clean 1-column layout" },
  { id: "zurich", name: "Zurich", desc: "Modern split-column with dark sidebar" },
  { id: "munich", name: "Munich", desc: "Executive minimalist serif" },
  { id: "vienna", name: "Vienna", desc: "Creative dual-accent banner" },
];

const COLORS: Array<{ id: CvAccentColor; name: string; hex: string }> = [
  { id: "blue", name: "Royal Blue", hex: "bg-blue-600" },
  { id: "emerald", name: "Emerald", hex: "bg-emerald-600" },
  { id: "indigo", name: "Indigo", hex: "bg-indigo-600" },
  { id: "crimson", name: "Crimson", hex: "bg-rose-700" },
  { id: "slate", name: "Slate Dark", hex: "bg-slate-800" },
  { id: "violet", name: "Amethyst", hex: "bg-violet-600" },
];

const FONTS: Array<{ id: CvFontFamily; name: string }> = [
  { id: "inter", name: "Inter (Modern Sans)" },
  { id: "serif", name: "Playfair (Classic Serif)" },
  { id: "mono", name: "JetBrains (Technical Mono)" },
  { id: "outfit", name: "Outfit (Clean Display)" },
];

export function CvCustomizer({ data, onChange }: CvCustomizerProps) {
  const updateSetting = <K extends keyof CvData["settings"]>(
    key: K,
    val: CvData["settings"][K]
  ) => {
    onChange({
      ...data,
      settings: {
        ...data.settings,
        [key]: val,
      },
    });
  };

  return (
    <div className="space-y-4 bg-card p-4 rounded-xl border">
      {/* Template Selector */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
          <Layout className="w-3.5 h-3.5 text-primary" /> Select Template
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => updateSetting("templateId", t.id)}
              className={cn(
                "p-2.5 rounded-lg border text-left transition-all",
                data.settings.templateId === t.id
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "hover:bg-muted/50"
              )}
            >
              <p className="text-xs font-bold text-foreground">{t.name}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color Palette */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
          <Palette className="w-3.5 h-3.5 text-primary" /> Accent Palette
        </label>
        <div className="flex items-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => updateSetting("accentColor", c.id)}
              title={c.name}
              className={cn(
                "w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center",
                c.hex,
                data.settings.accentColor === c.id ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
              )}
            />
          ))}
        </div>
      </div>

      {/* Font Family */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
          <Type className="w-3.5 h-3.5 text-primary" /> Typography
        </label>
        <select
          value={data.settings.fontFamily}
          onChange={(e) => updateSetting("fontFamily", e.target.value as CvFontFamily)}
          className="w-full text-xs p-2 rounded-lg border bg-background font-medium"
        >
          {FONTS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {/* Preset Action */}
      <div className="pt-2 border-t flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Need sample content?</span>
        <button
          onClick={() => onChange(DEFAULT_CV_DATA)}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <RefreshCw className="w-3 h-3" /> Load Sample VET Applicant Data
        </button>
      </div>
    </div>
  );
}
