"use client";

import React, { useState } from "react";
import { 
  Users, 
  Briefcase, 
  Calendar, 
  Plus, 
  Clock, 
  CheckCircle,
  Video,
  ExternalLink,
  ChevronRight
} from "lucide-react";

export default function JobPartnerDashboard() {
  const [activeJobsCount, setActiveJobsCount] = useState(3);
  const [candidatesCount, setCandidatesCount] = useState(14);
  const [slots, setSlots] = useState([
    { id: 1, time: "14. Juli, 10:00 - 10:45", status: "booked", candidate: "Max Mustermann (Master CV - Tech)" },
    { id: 2, time: "14. Juli, 14:00 - 14:45", status: "available", candidate: null },
    { id: 3, time: "15. Juli, 11:00 - 11:45", status: "available", candidate: null }
  ]);

  const [newTime, setNewTime] = useState("");

  const handleAddSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTime) return;
    setSlots(prev => [...prev, { id: Date.now(), time: newTime, status: "available", candidate: null }]);
    setNewTime("");
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-indigo-600 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent opacity-40" />
        <div className="relative z-10 space-y-2">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide uppercase text-white/90">
            Partner Portal
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight">Recruiter Workspace</h1>
          <p className="text-lg text-sky-100 max-w-2xl">
            Suchen Sie im Master-Lebenslauf-Pool, verwalten Sie Stellenanzeigen und koordinieren Sie Ihre Kennenlerngespräche.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex items-center space-x-4 shadow-lg">
          <div className="p-4 bg-sky-500/10 rounded-xl text-sky-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{activeJobsCount}</div>
            <div className="text-slate-400 text-sm">Aktive Ausschreibungen</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex items-center space-x-4 shadow-lg">
          <div className="p-4 bg-blue-500/10 rounded-xl text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">{candidatesCount}</div>
            <div className="text-slate-400 text-sm">Verfügbare Fachkräfte</div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex items-center space-x-4 shadow-lg">
          <div className="p-4 bg-indigo-500/10 rounded-xl text-indigo-400">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold">
              {slots.filter(s => s.status === "booked").length} gebucht
            </div>
            <div className="text-slate-400 text-sm">Gesprächstermine</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scheduler / Booking Manager */}
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-6 shadow-xl">
          <h2 className="text-xl font-bold flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-sky-400" />
            <span>Vorstellungsgespräche koordinieren</span>
          </h2>

          <form onSubmit={handleAddSlot} className="flex gap-2">
            <input 
              type="text" 
              value={newTime} 
              onChange={(e) => setNewTime(e.target.value)}
              placeholder="z.B. 16. Juli, 15:00 - 15:45"
              className="flex-1 bg-slate-900 border border-slate-750 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              required
            />
            <button 
              type="submit"
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Terminslot freigeben</span>
            </button>
          </form>

          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider">Aktuelle Zeitfenster</h3>
            <div className="space-y-2">
              {slots.map(s => (
                <div 
                  key={s.id}
                  className={`p-4 rounded-xl border flex justify-between items-center ${
                    s.status === "booked"
                      ? "bg-indigo-950/20 border-indigo-500/30 text-indigo-200"
                      : "bg-slate-900/50 border-slate-700/50 text-slate-300"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-xs font-bold flex items-center space-x-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{s.time}</span>
                    </div>
                    {s.candidate && (
                      <div className="text-[11px] text-indigo-300 flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        <span>Gebucht von: {s.candidate}</span>
                      </div>
                    )}
                  </div>
                  
                  {s.status === "booked" && (
                    <button className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 rounded text-[10px] font-semibold flex items-center space-x-1 transition-all">
                      <Video className="w-3 h-3" />
                      <span>Konferenzraum</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recruiter guidelines */}
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-6 shadow-xl">
          <h2 className="text-xl font-bold">Kandidaten-Matching & DSGVO</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Wir wahren die EU-Datenschutzvorgaben strikt. Profile im Lebenslauf-Pool können als anonymisiert (ohne Foto, Name und E-Mail) dargestellt werden. 
            Sie können für passende Kandidaten direkt ein Angebot oder eine Freischaltungsanfrage platzieren.
          </p>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-slate-200">Suchfilter-Features im Master-Pool:</h3>
            <ul className="text-xs space-y-2 text-slate-400 list-disc list-inside">
              <li>Radius-Filter basierend auf Postleitzahlen.</li>
              <li>Sprachniveau (CEFR Standard A1–C2).</li>
              <li>Aufenthaltstitel / Arbeitserlaubnis für Drittstaaten.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
