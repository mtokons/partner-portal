"use client";

import React, { useState } from "react";
import { 
  GraduationCap, 
  ClipboardCheck, 
  BookOpen, 
  Users, 
  Award, 
  FileText,
  AlertCircle
} from "lucide-react";

export default function AusbildungSeekerDashboard() {
  const [readinessScore, setReadinessScore] = useState<number | null>(85); // pre-populated check
  const [cvCompleted, setCvCompleted] = useState(true);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-40" />
        <div className="relative z-10 space-y-2">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase text-white/90">
            Ausbildung Console
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight">Duale Ausbildung in Deutschland</h1>
          <p className="text-lg text-emerald-100 max-w-2xl">
            Ihr Einstieg in das deutsche Berufsbildungssystem. Absolvieren Sie den Bereitschaftstest und pflegen Sie Ihre Bewerbermappe.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Diagnostic Status Box */}
        <div className="lg:col-span-1 bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center space-x-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-400" />
              <span>Diagnose Bereitschaft</span>
            </h2>
            
            {readinessScore !== null ? (
              <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-750 flex flex-col items-center justify-center space-y-2">
                <div className="text-5xl font-black text-emerald-400">{readinessScore}%</div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Bereitschafts-Score</div>
                <div className="text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full mt-2 font-medium">
                  Sehr gut vorbereitet
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-750 flex flex-col items-center justify-center space-y-2 text-center text-slate-400">
                <AlertCircle className="w-8 h-8 text-amber-500" />
                <span className="text-xs">Noch kein Testergebnis vorhanden.</span>
              </div>
            )}

            <p className="text-xs text-slate-400 leading-relaxed text-center">
              Der Bereitschafts-Score bewertet Schulabschlüsse, Sprachkenntnisse (B1/B2 Mindeststandard) und Fachvoraussetzungen nach IHK/HWK Richtlinien.
            </p>
          </div>

          <a 
            href="/ausbildung/seeker/diagnostic"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold flex items-center justify-center space-x-1.5 transition-all text-xs cursor-pointer shadow-md mt-6"
          >
            <span>Ready-Test durchführen / wiederholen</span>
          </a>
        </div>

        {/* Specialized Ausbildung CV and Cover Letter Card */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-6 shadow-xl">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-teal-400" />
            <span>Spezial-CV für Schulabgänger & Einsteiger</span>
          </h2>
          <p className="text-xs text-slate-350 leading-relaxed">
            Für eine Ausbildung ist oft weniger die Berufserfahrung entscheidend. Unser Ausbildung-CV hebt Ihre schulischen Leistungen, 
            Schülerpraktika, Soft Skills und Ihre persönliche Motivation hervor.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/40 flex items-center space-x-3">
              <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-xs text-slate-200">Schülerpraktika</div>
                <p className="text-[10px] text-slate-400">Pflegen Sie absolvierte Werkstatttage.</p>
              </div>
            </div>

            <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700/40 flex items-center space-x-3">
              <div className="p-2 bg-teal-500/10 rounded-lg text-teal-400">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-xs text-slate-200">Zeugnisse & Zertifikate</div>
                <p className="text-[10px] text-slate-400">B1/B2 Zertifikat & Schulabschluss hochladen.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-4 flex gap-4">
            <button className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer">
              <FileText className="w-3.5 h-3.5" />
              <span>Ausbildungs-CV bearbeiten</span>
            </button>
            <button className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer">
              <span>Bewerbung absenden</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
