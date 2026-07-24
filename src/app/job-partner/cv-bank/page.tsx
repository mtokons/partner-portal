"use client";

import React, { useState } from "react";
import { 
  Search, 
  MapPin, 
  ShieldAlert, 
  UserX, 
  UserCheck, 
  Languages, 
  SlidersHorizontal,
  Eye,
  FileDown
} from "lucide-react";

interface CandidateRecord {
  id: string;
  name: string;
  title: string;
  location: string;
  skills: string[];
  germanLevel: string;
  workPermitStatus: string;
  isAnonymous: boolean;
}

export default function CvBankPage() {
  const [search, setSearch] = useState("");
  const [radius, setRadius] = useState("all");
  const [minGerman, setMinGerman] = useState("A1");
  const [candidates, setCandidates] = useState<CandidateRecord[]>([
    {
      id: "cand-1",
      name: "Max Mustermann",
      title: "Senior Full-Stack Engineer",
      location: "München (Schwabing)",
      skills: ["React", "Next.js", "Node.js", "Docker"],
      germanLevel: "C1",
      workPermitStatus: "Bürger der Union (EU)",
      isAnonymous: false
    },
    {
      id: "cand-2",
      name: "Anonymized Seeker",
      title: "DevOps & Kubernetes Specialist",
      location: "Berlin (Mitte)",
      skills: ["Kubernetes", "AWS", "Terraform", "Go"],
      germanLevel: "B2",
      workPermitStatus: "Visum erforderlich (Arbeitserlaubnis beantragt)",
      isAnonymous: true
    },
    {
      id: "cand-3",
      name: "Sabine Schmidt",
      title: "Java Backend Developer",
      location: "Hamburg (Altona)",
      skills: ["Java", "Spring Boot", "PostgreSQL", "Kafka"],
      germanLevel: "C2",
      workPermitStatus: "Bürger der Union (EU)",
      isAnonymous: false
    }
  ]);

  const filtered = candidates.filter(cand => {
    const matchesSearch = cand.title.toLowerCase().includes(search.toLowerCase()) || 
                          cand.skills.some(s => s.toLowerCase().includes(search.toLowerCase()));
    
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    const matchesGerman = levels.indexOf(cand.germanLevel) >= levels.indexOf(minGerman);

    return matchesSearch && matchesGerman;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Job Seeker Master CV Bank</h1>
        <p className="text-slate-400 text-sm">Durchsuchen Sie qualifizierte Fachkräfte unter Wahrung der DSGVO-Richtlinien.</p>
      </div>

      {/* Filter bar */}
      <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 shadow-xl">
        <div className="relative col-span-1 md:col-span-2">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Nach Fähigkeiten oder Rolle filtern... (z.B. React, Java)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <select 
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white cursor-pointer focus:outline-none"
          >
            <option value="all">Gesamtes Bundesgebiet</option>
            <option value="25">Radius 25 km</option>
            <option value="50">Radius 50 km</option>
            <option value="100">Radius 100 km</option>
          </select>
        </div>

        <div>
          <select 
            value={minGerman}
            onChange={(e) => setMinGerman(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white cursor-pointer focus:outline-none"
          >
            <option value="A1">Min. Deutsch: A1</option>
            <option value="A2">Min. Deutsch: A2</option>
            <option value="B1">Min. Deutsch: B1</option>
            <option value="B2">Min. Deutsch: B2</option>
            <option value="C1">Min. Deutsch: C1</option>
            <option value="C2">Min. Deutsch: C2</option>
          </select>
        </div>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(cand => (
          <div 
            key={cand.id}
            className={`bg-slate-800 border p-6 rounded-2xl flex flex-col justify-between shadow-lg relative overflow-hidden ${
              cand.isAnonymous 
                ? "border-teal-500/25 hover:border-teal-500/50" 
                : "border-slate-700/60 hover:border-sky-500/40"
            } transition-all`}
          >
            {/* Anonymous Badge flag */}
            {cand.isAnonymous && (
              <div className="absolute top-0 right-0 bg-teal-600/20 text-teal-400 text-[9px] uppercase font-extrabold px-3 py-1 rounded-bl border-l border-b border-teal-500/30">
                Anonymes Profil (DSGVO)
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className={`p-3 rounded-xl ${cand.isAnonymous ? "bg-teal-500/10 text-teal-400" : "bg-sky-500/10 text-sky-400"}`}>
                  {cand.isAnonymous ? <UserX className="w-6 h-6" /> : <UserCheck className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">
                    {cand.isAnonymous ? "Kandidat (Referenz DevOps)" : cand.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">{cand.title}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-700/50 pt-3">
                <div className="flex items-center text-xs text-slate-350 space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{cand.location}</span>
                </div>

                <div className="flex items-center text-xs text-slate-350 space-x-1.5">
                  <Languages className="w-3.5 h-3.5 text-slate-400" />
                  <span>CEFR Sprachniveau: <strong>{cand.germanLevel}</strong></span>
                </div>

                <div className="text-[11px] text-slate-400 italic">
                  Aufenthaltsstatus: {cand.workPermitStatus}
                </div>
              </div>

              {/* Skills badges */}
              <div className="flex flex-wrap gap-1.5">
                {cand.skills.map(skill => (
                  <span key={skill} className="px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded-md text-[10px] text-slate-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-700/50 pt-4 mt-6 flex gap-2">
              <button className="flex-1 py-2 bg-slate-900 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 border border-slate-700/80 cursor-pointer">
                <Eye className="w-3.5 h-3.5" />
                <span>CV Einsehen</span>
              </button>
              
              {cand.isAnonymous ? (
                <button className="flex-1 py-2 bg-teal-600/15 hover:bg-teal-600/30 text-teal-400 border border-teal-500/30 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer">
                  <span>Name anfragen</span>
                </button>
              ) : (
                <button className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 cursor-pointer">
                  <span>Einladen</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
