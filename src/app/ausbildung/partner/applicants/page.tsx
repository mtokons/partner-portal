"use client";

import React, { useState } from "react";
import { 
  Users, 
  Award, 
  MapPin, 
  Languages, 
  CheckCircle, 
  ArrowRight,
  ClipboardCheck,
  CalendarDays
} from "lucide-react";

interface ApprenticeApplicant {
  id: string;
  name: string;
  targetRole: string;
  schoolQual: string;
  germanLevel: string;
  readinessScore: number;
  location: string;
}

export default function ApplicantsPage() {
  const [applicants, setApplicants] = useState<ApprenticeApplicant[]>([
    {
      id: "app-1",
      name: "Ali Yilmaz",
      targetRole: "Fachinformatiker Anwendungsentwicklung",
      schoolQual: "Abitur (Anerkannt)",
      germanLevel: "B2 (Zertifiziert)",
      readinessScore: 90,
      location: "München"
    },
    {
      id: "app-2",
      name: "Elena Petrova",
      targetRole: "Kauffrau für Büromanagement",
      schoolQual: "Realschulabschluss",
      germanLevel: "B1",
      readinessScore: 75,
      location: "Augsburg"
    },
    {
      id: "app-3",
      name: "Jonas Becker",
      targetRole: "Anlagenmechaniker SHK",
      schoolQual: "Hauptschulabschluss",
      germanLevel: "C1 (Muttersprache)",
      readinessScore: 80,
      location: "Dachau"
    }
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Eingegangene Bewerbungen</h1>
        <p className="text-slate-400 text-sm">Prüfen Sie die Status-Diagnoseberichte Ihrer Ausbildungskandidaten.</p>
      </div>

      <div className="space-y-4">
        {applicants.map(a => (
          <div 
            key={a.id} 
            className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl hover:border-teal-500/25 transition-all"
          >
            {/* Seeker General Details */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">{a.name}</h3>
                  <p className="text-xs text-slate-400 font-medium">Bewerbung für: {a.targetRole}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-slate-350 pt-1">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{a.location}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Award className="w-3.5 h-3.5 text-slate-500" />
                  <span>Abschluss: {a.schoolQual}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Languages className="w-3.5 h-3.5 text-slate-500" />
                  <span>Deutsch: {a.germanLevel}</span>
                </span>
              </div>
            </div>

            {/* Score & Actions */}
            <div className="flex items-center space-x-6 shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-700/50 pt-4 md:pt-0">
              <div className="flex items-center space-x-3 p-3 bg-slate-900/60 rounded-xl border border-slate-750">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status-Score</div>
                  <div className="text-[10px] text-teal-300">HWK / IHK tauglich</div>
                </div>
                <div className="text-3xl font-black text-teal-400">{a.readinessScore}%</div>
              </div>

              <div className="flex gap-2">
                <button className="px-3.5 py-2.5 bg-slate-700 hover:bg-slate-650 text-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer">
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Report einsehen</span>
                </button>
                <button className="px-3.5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer shadow-md">
                  <CalendarDays className="w-4 h-4" />
                  <span>Gespräch planen</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
