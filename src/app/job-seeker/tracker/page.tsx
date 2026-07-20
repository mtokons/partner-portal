"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  MessageSquare, 
  Link as LinkIcon, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText,
  User,
  ArrowRight
} from "lucide-react";

interface ApplicationCard {
  id: string;
  company: string;
  role: string;
  stage: "Applied" | "Under Review" | "Interviewing" | "Offered" | "Rejected";
  cvVariation: string;
  notes: string[];
}

export default function KanbanTrackerPage() {
  const [apps, setApps] = useState<ApplicationCard[]>([
    {
      id: "app-1",
      company: "SCCG Solution Partner",
      role: "Senior Cloud Architect",
      stage: "Interviewing",
      cvVariation: "Master CV - Tech",
      notes: ["1. Interview war am 05.07. positiv.", "Nächstes Technical assessment steht aus."]
    },
    {
      id: "app-2",
      company: "Educraft GmbH",
      role: "Full-Stack Engineer",
      stage: "Applied",
      cvVariation: "Master CV - Tech",
      notes: ["Bewerbung eingereicht am 08.07. über das Portal."]
    },
    {
      id: "app-3",
      company: "Handwerk Service AG",
      role: "Systemadministrator",
      stage: "Under Review",
      cvVariation: "CV - Management Focus",
      notes: ["Unterlagen wurden gesichtet."]
    }
  ]);

  const [newCompany, setNewCompany] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newCv, setNewCv] = useState("Master CV - Tech");
  const [isAdding, setIsAdding] = useState(false);

  const columns: { key: ApplicationCard["stage"]; label: string; color: string }[] = [
    { key: "Applied", label: "Eingereicht", color: "border-t-indigo-500 bg-indigo-500/5 text-indigo-400" },
    { key: "Under Review", label: "In Sichtung", color: "border-t-amber-500 bg-amber-500/5 text-amber-400" },
    { key: "Interviewing", label: "Gespräche", color: "border-t-violet-500 bg-violet-500/5 text-violet-400" },
    { key: "Offered", label: "Angebot", color: "border-t-emerald-500 bg-emerald-500/5 text-emerald-400" },
    { key: "Rejected", label: "Absage", color: "border-t-rose-500 bg-rose-500/5 text-rose-400" }
  ];

  const handleMoveStage = (id: string, currentStage: ApplicationCard["stage"], direction: "next" | "prev") => {
    const stageOrder: ApplicationCard["stage"][] = ["Applied", "Under Review", "Interviewing", "Offered", "Rejected"];
    const idx = stageOrder.indexOf(currentStage);
    let nextIdx = idx;
    if (direction === "next" && idx < stageOrder.length - 1) nextIdx = idx + 1;
    if (direction === "prev" && idx > 0) nextIdx = idx - 1;
    
    if (nextIdx !== idx) {
      setApps(prev => prev.map(a => a.id === id ? { ...a, stage: stageOrder[nextIdx] } : a));
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newRole) return;
    const newCard: ApplicationCard = {
      id: `card-${Date.now()}`,
      company: newCompany,
      role: newRole,
      stage: "Applied",
      cvVariation: newCv,
      notes: ["Bewerbung manuell erfasst."]
    };
    setApps(prev => [...prev, newCard]);
    setNewCompany("");
    setNewRole("");
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Möchten Sie diesen Tracker-Eintrag löschen?")) {
      setApps(prev => prev.filter(a => a.id !== id));
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bewerbungs-Tracker (Kanban)</h1>
          <p className="text-slate-400 text-sm">Verwalten Sie Ihre laufenden Bewerbungen und Gesprächsphasen.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-semibold flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Bewerbung hinzufügen</span>
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreate} className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl max-w-lg space-y-4 shadow-xl">
          <h2 className="text-lg font-bold">Neue Bewerbung protokollieren</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Firma</label>
              <input 
                type="text" 
                value={newCompany} 
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="z.B. SCCG Partner"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-white"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Stelle</label>
              <input 
                type="text" 
                value={newRole} 
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="z.B. Fullstack Engineer"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-white"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Verknüpfter Lebenslauf (CV)</label>
            <select 
              value={newCv}
              onChange={(e) => setNewCv(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-indigo-500 text-white cursor-pointer"
            >
              <option value="Master CV - Tech">Master CV - Tech</option>
              <option value="CV - Management Focus">CV - Management Focus</option>
            </select>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-650 rounded-xl text-xs font-semibold"
            >
              Abbrechen
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold"
            >
              Speichern
            </button>
          </div>
        </form>
      )}

      {/* Kanban Board Container */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {columns.map(col => {
          const colApps = apps.filter(a => a.stage === col.key);
          return (
            <div 
              key={col.key}
              className={`rounded-2xl border-t-4 p-4 min-h-[500px] flex flex-col space-y-4 shadow-xl ${col.color}`}
            >
              {/* Column Header */}
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="font-bold text-sm text-slate-200">{col.label}</span>
                <span className="px-2 py-0.5 bg-slate-800/80 rounded-full text-xs font-bold">{colApps.length}</span>
              </div>

              {/* Cards Loop */}
              <div className="flex-1 space-y-4 overflow-y-auto">
                {colApps.map(card => (
                  <div 
                    key={card.id}
                    className="bg-slate-800 border border-slate-750 p-4 rounded-xl space-y-3 shadow-md hover:border-slate-600 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] uppercase font-bold text-slate-450 tracking-wider truncate pr-2">{card.company}</span>
                        <button 
                          onClick={() => handleDelete(card.id)}
                          className="text-slate-500 hover:text-red-400 p-0.5 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h3 className="font-semibold text-sm mt-0.5 text-slate-100">{card.role}</h3>
                      
                      {/* Attached items */}
                      <div className="mt-3 flex items-center space-x-1.5 text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded w-fit">
                        <FileText className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{card.cvVariation}</span>
                      </div>
                    </div>

                    {/* Footer card controls to shift columns */}
                    <div className="border-t border-slate-700/50 pt-3 mt-3 flex justify-between items-center">
                      <button 
                        onClick={() => handleMoveStage(card.id, card.stage, "prev")}
                        disabled={card.stage === "Applied"}
                        className="text-[10px] font-semibold px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-400 hover:bg-slate-750 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        ◀
                      </button>
                      <button 
                        onClick={() => handleMoveStage(card.id, card.stage, "next")}
                        disabled={card.stage === "Rejected"}
                        className="text-[10px] font-semibold px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-400 hover:bg-slate-750 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
