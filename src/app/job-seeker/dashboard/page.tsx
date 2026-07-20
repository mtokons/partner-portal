"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Trash2, 
  Download, 
  UserCheck, 
  FileText, 
  Layers, 
  Calendar, 
  ToggleLeft, 
  ToggleRight,
  Info
} from "lucide-react";

export default function JobSeekerDashboard() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ cvs: 2, applications: 3, interviews: 1 });
  const [gdpr, setGdpr] = useState({
    consentDataSharing: true,
    consentVisibility: "full" as "anonymous" | "full"
  });

  const toggleSharing = () => {
    setGdpr(prev => ({ ...prev, consentDataSharing: !prev.consentDataSharing }));
  };

  const toggleVisibility = () => {
    setGdpr(prev => ({ 
      ...prev, 
      consentVisibility: prev.consentVisibility === "full" ? "anonymous" : "full" 
    }));
  };

  const handlePurge = async () => {
    if (confirm("Möchten Sie alle Ihre Daten gemäß DSGVO Art. 17 dauerhaft löschen? Dies kann nicht rückgängig gemacht werden.")) {
      setLoading(true);
      alert("Ihre Daten wurden vollständig gelöscht. Sie werden nun abgemeldet.");
      window.location.href = "/login";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      {/* Hero Header */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 p-8 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-50" />
        <div className="relative z-10 space-y-2">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase text-white/90">
            Kandidaten-Cockpit
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight">Willkommen zurück!</h1>
          <p className="text-lg text-indigo-100 max-w-2xl">
            Verwalten Sie Ihre Bewerbungsmappen, erstellen Sie maßgeschneiderte Lebensläufe und steuern Sie Ihre Karriere in Deutschland.
          </p>
        </div>
      </div>

      {/* Quick Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/80 border border-slate-700/50 backdrop-blur-lg p-6 rounded-2xl flex items-center space-x-4 shadow-lg hover:border-violet-500/35 transition-all">
          <div className="p-4 bg-violet-500/10 rounded-xl text-violet-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.cvs} / 10</div>
            <div className="text-slate-400 text-sm">Lebenslauf-Variationen</div>
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/50 backdrop-blur-lg p-6 rounded-2xl flex items-center space-x-4 shadow-lg hover:border-indigo-500/35 transition-all">
          <div className="p-4 bg-indigo-500/10 rounded-xl text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.applications}</div>
            <div className="text-slate-400 text-sm">Aktive Bewerbungen</div>
          </div>
        </div>

        <div className="bg-slate-800/80 border border-slate-700/50 backdrop-blur-lg p-6 rounded-2xl flex items-center space-x-4 shadow-lg hover:border-purple-500/35 transition-all">
          <div className="p-4 bg-purple-500/10 rounded-xl text-purple-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{stats.interviews}</div>
            <div className="text-slate-400 text-sm">Vorstellungsgespräche</div>
          </div>
        </div>
      </div>

      {/* Main Sections: GDPR compliance & profile options */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* GDPR DSGVO Panel */}
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl" />
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-7 h-7 text-emerald-400" />
            <h2 className="text-xl font-bold">DSGVO & Datenschutz-Einstellungen</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700/40">
              <div className="space-y-1 pr-4">
                <div className="font-semibold text-sm">Datenfreigabe mit Job-Partnern</div>
                <p className="text-xs text-slate-400">Erlauben Sie registrierten Arbeitgebern, Ihr Profil einzusehen und zu kontaktieren.</p>
              </div>
              <button onClick={toggleSharing} className="text-emerald-400 hover:text-emerald-350 transition-colors">
                {gdpr.consentDataSharing ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-slate-500" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700/40">
              <div className="space-y-1 pr-4">
                <div className="font-semibold text-sm">Anonymer CV-Bank-Modus</div>
                <p className="text-xs text-slate-400">Maskiert Namen, Kontaktdaten und Foto für diskrete Erstprüfungen.</p>
              </div>
              <button onClick={toggleVisibility} className="text-emerald-400 hover:text-emerald-350 transition-colors">
                {gdpr.consentVisibility === "anonymous" ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10 text-slate-500" />}
              </button>
            </div>
          </div>

          <div className="border-t border-slate-700/50 pt-4 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handlePurge}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Konto unwiderruflich löschen (Art. 17)</span>
            </button>

            <button className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer">
              <Download className="w-4 h-4" />
              <span>Anonymisierten CV exportieren</span>
            </button>
          </div>
        </div>

        {/* Profile Info / Guidance */}
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex items-center space-x-3">
            <UserCheck className="w-7 h-7 text-indigo-400" />
            <h2 className="text-xl font-bold">Bewerber-Status</h2>
          </div>
          
          <div className="p-4 bg-indigo-950/40 border border-indigo-500/20 rounded-xl flex items-start space-x-3">
            <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-sm">
              <span className="font-semibold text-indigo-200">Deutscher Lebenslauf-Standard (DIN 5008):</span>
              <p className="text-xs text-indigo-300/80 leading-relaxed">
                Achten Sie darauf, dass Anschreiben und Lebenslauf farblich aufeinander abgestimmt sind und ein professionelles Foto hinterlegt ist (auf Wunsch deaktivierbar).
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-300">Empfohlene nächste Schritte:</h3>
            <ul className="text-xs space-y-2 text-slate-400 list-disc list-inside">
              <li>Legen Sie eine neue CV-Variation für IT/Tech oder Handwerk an.</li>
              <li>Erstellen Sie ein DIN-5008-konformes Anschreiben.</li>
              <li>Prüfen Sie im Kanban-Tracker den Status Ihrer Bewerbungen.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
