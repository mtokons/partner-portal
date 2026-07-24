"use client";

import React, { useState } from "react";
import { 
  Briefcase, 
  MapPin, 
  Euro, 
  Languages, 
  CheckSquare, 
  Save, 
  AlertCircle 
} from "lucide-react";

export default function PostJobPage() {
  const [success, setSuccess] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [germanLevel, setGermanLevel] = useState("B2");
  const [permit, setPermit] = useState(false);
  const [type, setType] = useState("Full-time");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setTitle("");
      setDescription("");
      setLocation("");
    }, 2000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stellenangebot inserieren</h1>
        <p className="text-slate-400 text-sm">Veröffentlichen Sie neue Ausschreibungen für Jobsuchende und Ausbildungskandidaten.</p>
      </div>

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center space-x-2 text-sm">
          <CheckSquare className="w-5 h-5 shrink-0" />
          <span>Stellenangebot wurde erfolgreich veröffentlicht!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-6 shadow-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Stellentitel</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. IT-Systemadministrator (m/w/d)"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Anstellungsart</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white cursor-pointer focus:outline-none focus:border-sky-500"
            >
              <option value="Full-time">Vollzeit (Full-time)</option>
              <option value="Part-time">Teilzeit (Part-time)</option>
              <option value="Contract">Freie Mitarbeit / Projekt</option>
              <option value="Apprenticeship">Duale Ausbildung</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Beschreibung & Aufgaben</label>
          <textarea 
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Aufgabenprofil, Anforderungen, Benefits..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500 resize-none"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Einsatzort</label>
            <div className="relative">
              <input 
                type="text" 
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="z.B. München"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Erforderliches Deutsch-Niveau</label>
            <select 
              value={germanLevel}
              onChange={(e) => setGermanLevel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white cursor-pointer focus:outline-none"
            >
              <option value="A1">A1 (Anfänger)</option>
              <option value="A2">A2 (Grundkenntnisse)</option>
              <option value="B1">B1 (Fortgeschritten)</option>
              <option value="B2">B2 (Selbstständig)</option>
              <option value="C1">C1 (Fachkundig)</option>
              <option value="C2">C2 (Muttersprache)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Arbeitserlaubnis / Visum benötigt</label>
            <div className="flex items-center space-x-2 mt-3">
              <input 
                type="checkbox" 
                id="permit"
                checked={permit}
                onChange={(e) => setPermit(e.target.checked)}
                className="w-4 h-4 text-sky-600 bg-slate-900 border-slate-700 rounded focus:ring-sky-550"
              />
              <label htmlFor="permit" className="text-xs text-slate-350 cursor-pointer">Ja (Visumsunterstützung möglich)</label>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-700/50">
          <button 
            type="submit"
            className="px-6 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-550 hover:to-blue-550 rounded-xl text-sm font-semibold flex items-center space-x-2 shadow-lg transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Inserat veröffentlichen</span>
          </button>
        </div>
      </form>
    </div>
  );
}
