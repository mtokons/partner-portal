"use client";

import React, { useState } from "react";
import { 
  Save, 
  Trash2, 
  Plus, 
  FileText, 
  Palette, 
  Type, 
  LayoutGrid, 
  Image as ImageIcon,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface CvVariation {
  id: string;
  name: string;
  title: string;
  summary: string;
  templateColor: string;
  templateFont: string;
  layoutType: "tech" | "trade" | "executive" | "creative";
  hasPhoto: boolean;
  experience: string;
  education: string;
  skills: string;
}

export default function CvEditorPage() {
  const [variations, setVariations] = useState<CvVariation[]>([
    {
      id: "var-1",
      name: "Master CV - Tech",
      title: "Senior Full-Stack Cloud Engineer",
      summary: "Erfahrener Softwarearchitekt mit Schwerpunkt auf verteilten Systemen und React/Next.js.",
      templateColor: "bg-indigo-600",
      templateFont: "font-sans",
      layoutType: "tech",
      hasPhoto: true,
      experience: "Antigravity Devs - Lead Developer (2024-Heute)\nSccg GmbH - Fullstack Engineer (2020-2024)",
      education: "TU München - Master of Science Informatik (2018-2020)",
      skills: "React, Next.js, Node.js, Firebase, Cloud Architecture, CI/CD"
    },
    {
      id: "var-2",
      name: "CV - Management Focus",
      title: "Technical Product Manager",
      summary: "Ergebnisorientierter Produktmanager mit tiefem technischem Verständnis für SaaS und Web-Plattformen.",
      templateColor: "bg-slate-700",
      templateFont: "font-serif",
      layoutType: "executive",
      hasPhoto: false,
      experience: "Antigravity Devs - Technical Product Owner (2024-Heute)\nOracle - System Analyst (2021-2024)",
      education: "Universität Stuttgart - B.Sc. Wirtschaftsinformatik (2017-2021)",
      skills: "Product Roadmap, Agile, JIRA, SQL, Systems Architecture"
    }
  ]);

  const [activeId, setActiveId] = useState<string>("var-1");
  const current = variations.find(v => v.id === activeId) || variations[0];

  const updateCurrent = (fields: Partial<CvVariation>) => {
    setVariations(prev => prev.map(v => v.id === activeId ? { ...v, ...fields } : v));
  };

  const handleAddNew = () => {
    if (variations.length >= 10) {
      alert("Maximale Anzahl von 10 Lebenslauf-Variationen erreicht.");
      return;
    }
    const newId = `var-${Date.now()}`;
    const newCv: CvVariation = {
      id: newId,
      name: `Variation ${variations.length + 1}`,
      title: "Neuer Lebenslauf-Titel",
      summary: "Zusammenfassung der Qualifikationen...",
      templateColor: "bg-emerald-600",
      templateFont: "font-sans",
      layoutType: "trade",
      hasPhoto: true,
      experience: "",
      education: "",
      skills: ""
    };
    setVariations(prev => [...prev, newCv]);
    setActiveId(newId);
  };

  const handleDelete = (id: string) => {
    if (variations.length <= 1) {
      alert("Sie müssen mindestens eine Variation behalten.");
      return;
    }
    setVariations(prev => prev.filter(v => v.id !== id));
    if (activeId === id) {
      const remaining = variations.filter(v => v.id !== id);
      setActiveId(remaining[0].id);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">German Lebenslauf (CV) Suite</h1>
          <p className="text-slate-400 text-sm">Passen Sie Ihren Lebenslauf für jede Zielstelle individuell an (max. 10 Versionen).</p>
        </div>
        <button 
          onClick={handleAddNew}
          className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl font-semibold flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Neue Variation</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: List of variations */}
        <div className="lg:col-span-3 bg-slate-800 border border-slate-700/60 p-4 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span>Ihre CV-Varianten</span>
          </h2>
          <div className="space-y-2">
            {variations.map(v => (
              <div 
                key={v.id}
                onClick={() => setActiveId(v.id)}
                className={`group p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center ${
                  v.id === activeId 
                    ? "bg-indigo-600/25 border-indigo-500 text-white" 
                    : "bg-slate-900/40 border-slate-700/50 hover:bg-slate-900/80 text-slate-300"
                }`}
              >
                <div className="truncate pr-2">
                  <div className="font-semibold text-sm truncate">{v.name}</div>
                  <div className="text-xs text-slate-450 truncate">{v.title}</div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(v.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 text-red-400 rounded transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Middle Panel: Editor Form */}
        <div className="lg:col-span-5 bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex justify-between items-center pb-4 border-b border-slate-700/50">
            <h2 className="text-xl font-bold">Variations-Details</h2>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold flex items-center space-x-1.5 transition-all">
              <Save className="w-4 h-4" />
              <span>Speichern</span>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Name der Variante</label>
              <input 
                type="text" 
                value={current.name} 
                onChange={(e) => updateCurrent({ name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Berufstitel</label>
              <input 
                type="text" 
                value={current.title} 
                onChange={(e) => updateCurrent({ title: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Zusammenfassung (Summary)</label>
              <textarea 
                rows={3}
                value={current.summary} 
                onChange={(e) => updateCurrent({ summary: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Layout & Style</label>
                <div className="relative">
                  <select 
                    value={current.layoutType}
                    onChange={(e) => updateCurrent({ layoutType: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="tech">Tech / IT</option>
                    <option value="trade">Handwerk (Trades)</option>
                    <option value="executive">Management</option>
                    <option value="creative">Creative Layout</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Bewerbungsfoto</label>
                <div className="flex items-center space-x-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="hasPhoto" 
                    checked={current.hasPhoto}
                    onChange={(e) => updateCurrent({ hasPhoto: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-slate-900 border-slate-700 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="hasPhoto" className="text-sm text-slate-350 cursor-pointer">Mit Foto (Deutscher Standard)</label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Primärfarbe</label>
                <div className="flex items-center space-x-2 mt-1">
                  {["bg-indigo-600", "bg-emerald-600", "bg-rose-600", "bg-slate-700"].map(color => (
                    <button 
                      key={color}
                      onClick={() => updateCurrent({ templateColor: color })}
                      className={`w-8 h-8 rounded-full border-2 ${color} ${
                        current.templateColor === color ? "border-white scale-110" : "border-transparent"
                      } transition-all`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Schriftart</label>
                <select 
                  value={current.templateFont}
                  onChange={(e) => updateCurrent({ templateFont: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                >
                  <option value="font-sans">Inter (Modern Sans)</option>
                  <option value="font-serif">Georgia (Classic Serif)</option>
                  <option value="font-mono">Fira Mono (Tech)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Berufserfahrung</label>
              <textarea 
                rows={4}
                value={current.experience} 
                onChange={(e) => updateCurrent({ experience: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Ausbildung & Studium</label>
              <textarea 
                rows={3}
                value={current.education} 
                onChange={(e) => updateCurrent({ education: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-all font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Right Panel: Live PDF Mock Render / Layout Preview */}
        <div className="lg:col-span-4 bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-6 shadow-xl flex flex-col">
          <h2 className="text-lg font-bold flex items-center space-x-2 pb-4 border-b border-slate-700/50">
            <LayoutGrid className="w-5 h-5 text-purple-400" />
            <span>Vorschau (DIN 5008 Entwurf)</span>
          </h2>
          
          <div className="flex-1 bg-white text-slate-900 p-6 rounded-xl shadow-inner min-h-[450px] flex flex-col justify-between border-2 border-slate-400/35 relative">
            {/* Template Header band */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-950">{current.name || "Kandidatenname"}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{current.title}</p>
                </div>
                {current.hasPhoto && (
                  <div className="w-14 h-16 bg-slate-200 border border-slate-300 rounded flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Decorative accent divider */}
              <div className={`h-1 w-full rounded ${current.templateColor}`} />

              {/* Summary section */}
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Über Mich</h4>
                <p className={`text-xs text-slate-700 leading-relaxed ${current.templateFont}`}>{current.summary}</p>
              </div>

              {/* Exp section */}
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Werdegang</h4>
                <div className="text-[11px] text-slate-800 whitespace-pre-line leading-relaxed font-mono">
                  {current.experience || "Keine Erfahrung eingetragen."}
                </div>
              </div>

              {/* Edu section */}
              <div className="space-y-1">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bildungsweg</h4>
                <div className="text-[11px] text-slate-800 whitespace-pre-line leading-relaxed font-mono">
                  {current.education || "Keine Ausbildung eingetragen."}
                </div>
              </div>
            </div>

            {/* Bottom DIN Standard notice */}
            <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-[9px] text-slate-400">
              <span>DIN 5008 Layout: {current.layoutType.toUpperCase()}</span>
              <span className="flex items-center text-emerald-600 font-semibold">
                <CheckCircle className="w-3 h-3 mr-0.5" />
                <span>Ready for export</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
