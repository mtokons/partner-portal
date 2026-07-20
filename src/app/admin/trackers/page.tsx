"use client";

import React, { useState } from "react";
import { FolderKanban, Search, Trash2, SlidersHorizontal, RefreshCw } from "lucide-react";

interface AdminTrackerRecord {
  id: string;
  candidateName: string;
  company: string;
  role: string;
  stage: "Applied" | "Under Review" | "Interviewing" | "Offered" | "Rejected";
  lastActivity: string;
}

export default function AdminTrackersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [trackers, setTrackers] = useState<AdminTrackerRecord[]>([
    { id: "t-1", candidateName: "Max Mustermann", company: "SCCG Solution Partner", role: "Senior Cloud Architect", stage: "Interviewing", lastActivity: "10.07.2026" },
    { id: "t-2", candidateName: "Max Mustermann", company: "Educraft GmbH", role: "Full-Stack Engineer", stage: "Applied", lastActivity: "09.07.2026" },
    { id: "t-3", candidateName: "Elena Petrova", company: "Handwerk Service AG", role: "System Administrator", stage: "Under Review", lastActivity: "08.07.2026" },
    { id: "t-4", candidateName: "Ali Yilmaz", company: "IHK Bildungshaus Bayern", role: "Fachinformatiker AE Apprentice", stage: "Interviewing", lastActivity: "07.07.2026" }
  ]);

  const deleteTracker = (id: string) => {
    if (confirm("Are you sure you want to delete this application tracker?")) {
      setTrackers(prev => prev.filter(t => t.id !== id));
    }
  };

  const updateStage = (id: string, newStage: AdminTrackerRecord["stage"]) => {
    setTrackers(prev => prev.map(t => t.id === id ? { ...t, stage: newStage, lastActivity: new Date().toLocaleDateString("de-DE") } : t));
  };

  const resetTracker = (id: string) => {
    if (confirm("Reset application tracker back to 'Applied'?")) {
      updateStage(id, "Applied");
    }
  };

  const filteredTrackers = trackers.filter(t => 
    t.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin: Kanban Trackers</h1>
        <p className="text-slate-400 text-sm">Monitor candidate pipelines, advance or demote pipeline stages, reset tracks, or delete active records.</p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search candidates, companies or roles..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Trackers List Table */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-750 text-slate-350">
                <th className="p-4 font-semibold uppercase tracking-wider">Candidate</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Target Company</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Target Role</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Stage</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Last Activity</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-750">
              {filteredTrackers.map(t => (
                <tr key={t.id} className="hover:bg-slate-750/30 transition-colors">
                  <td className="p-4 font-medium text-slate-100">{t.candidateName}</td>
                  <td className="p-4 text-slate-350">{t.company}</td>
                  <td className="p-4 text-slate-350">{t.role}</td>
                  <td className="p-4">
                    <select 
                      value={t.stage}
                      onChange={(e) => updateStage(t.id, e.target.value as any)}
                      className={`bg-slate-900 border rounded px-2.5 py-1 text-[10px] font-semibold focus:outline-none cursor-pointer ${
                        t.stage === "Interviewing" ? "text-violet-400 border-violet-500/30 bg-violet-500/5" :
                        t.stage === "Applied" ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/5" :
                        t.stage === "Offered" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/5" :
                        "text-slate-400 border-slate-750"
                      }`}
                    >
                      <option value="Applied">Applied</option>
                      <option value="Under Review">Under Review</option>
                      <option value="Interviewing">Interviewing</option>
                      <option value="Offered">Offered</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </td>
                  <td className="p-4 text-slate-400">{t.lastActivity}</td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => resetTracker(t.id)}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-[10px] hover:bg-slate-750 transition-colors cursor-pointer inline-flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                    <button 
                      onClick={() => deleteTracker(t.id)}
                      className="px-2.5 py-1 bg-red-650/15 border border-red-500/30 text-red-400 rounded text-[10px] hover:bg-red-600/25 transition-all cursor-pointer inline-flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
