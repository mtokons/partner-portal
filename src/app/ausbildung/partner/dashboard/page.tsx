"use client";

import React, { useState } from "react";
import { 
  Building, 
  GraduationCap, 
  Users, 
  Briefcase, 
  Plus, 
  ArrowRight,
  TrendingUp
} from "lucide-react";

export default function AusbildungPartnerDashboard() {
  const [positions, setPositions] = useState([
    { id: 1, title: "Fachinformatiker Anwendungsentwicklung (m/w/d)", applicantsCount: 4, location: "München" },
    { id: 2, title: "Anlagenmechaniker SHK (m/w/d)", applicantsCount: 2, location: "Augsburg" }
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-600 via-emerald-600 to-green-600 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-40" />
        <div className="relative z-10 space-y-2">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase text-white/90">
            Ausbildung Console
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight">Ausbildungsplätze koordinieren</h1>
          <p className="text-lg text-emerald-100 max-w-2xl">
            Sichten Sie Bewerbungsmappen von Schulabgängern und prüfen Sie deren Bereitschaftsberichte.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex items-center space-x-4 shadow-lg">
          <div className="p-4 bg-teal-500/10 rounded-xl text-teal-400">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{positions.length}</div>
            <div className="text-slate-400 text-sm">Angebotene Ausbildungsberufe</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex items-center space-x-4 shadow-lg">
          <div className="p-4 bg-emerald-500/10 rounded-xl text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">6</div>
            <div className="text-slate-400 text-sm">Eingegangene Bewerbungen</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex items-center space-x-4 shadow-lg">
          <div className="p-4 bg-green-500/10 rounded-xl text-green-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">85%</div>
            <div className="text-slate-400 text-sm">Durchschnittlicher Bewerber-Score</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: List of apprenticeship spots */}
        <div className="lg:col-span-2 bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex justify-between items-center pb-3 border-b border-slate-700/50">
            <h2 className="text-lg font-bold flex items-center space-x-2">
              <Briefcase className="w-5 h-5 text-teal-400" />
              <span>Veröffentlichte Lehrstellen</span>
            </h2>
            <button className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all">
              <Plus className="w-3.5 h-3.5" />
              <span>Ausschreiben</span>
            </button>
          </div>

          <div className="space-y-3">
            {positions.map(p => (
              <div key={p.id} className="p-4 bg-slate-900/50 border border-slate-750 rounded-xl flex justify-between items-center hover:border-teal-500/30 transition-all">
                <div>
                  <h3 className="font-semibold text-xs text-slate-100">{p.title}</h3>
                  <div className="text-[11px] text-slate-400">{p.location}</div>
                </div>
                <a 
                  href="/ausbildung/partner/applicants" 
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded border border-slate-700 text-[10px] font-semibold flex items-center space-x-1 transition-all"
                >
                  <span>{p.applicantsCount} Bewerber sichten</span>
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: General notes */}
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-4 shadow-xl">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <GraduationCap className="w-5 h-5 text-teal-400" />
            <span>IHK/HWK Bestimmungen</span>
          </h2>
          <p className="text-xs text-slate-350 leading-relaxed">
            Als registrierter Ausbildungsbetrieb können Sie den Eignungsnachweis bzw. den Readiness-Score von Bewerbern direkt einsehen. 
            So sparen Sie administrativen Aufwand bei der Vorauswahl für das duale Studium oder die klassische Lehre.
          </p>
        </div>
      </div>
    </div>
  );
}
