"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, ChevronRight, FileText, Briefcase, Map, HelpCircle, 
  Search, ArrowUpRight, BookOpen, UserCheck, Trash2, Edit3, Settings, UserPlus, FilePlus
} from "lucide-react";

export default function KickresumeDashboardPage() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [newCandidateName, setNewCandidateName] = useState("");
  const [createMode, setCreateMode] = useState<"existing" | "new" | "blank">("existing");

  // List of mock candidate documents from local storage or defaults
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sccg_cvs");
      if (saved) {
        try {
          setDocuments(JSON.parse(saved));
        } catch {
          initDefaultDocs();
        }
      } else {
        initDefaultDocs();
      }

      // Load candidate names from profiles
      const profiles = localStorage.getItem("sccg_profiles");
      const names: string[] = [];
      if (profiles) {
        try {
          names.push(...Object.keys(JSON.parse(profiles)));
        } catch {}
      }
      setCandidates(names.length ? names : ["Max Mustermann", "Elena Petrova"]);
    }
  }, []);

  const initDefaultDocs = () => {
    const defaultDocs = [
      { id: "doc-1", name: "Max Mustermann - Resume", role: "Senior Cloud Architect", updated: "Updated 10 min ago" },
      { id: "doc-2", name: "Elena Petrova - CV", role: "DevOps Specialist", updated: "Updated 2 hours ago" },
      { id: "doc-3", name: "Sabine Schmidt - Lebenslauf", role: "Java Backend Developer", updated: "Updated 1 day ago" },
      { id: "doc-4", name: "SCCG HR Template", role: "Sales Executive Profile", updated: "Updated 3 days ago" }
    ];
    localStorage.setItem("sccg_cvs", JSON.stringify(defaultDocs));
    setDocuments(defaultDocs);
  };

  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this CV profile?")) {
      const updated = documents.filter(doc => doc.id !== id);
      setDocuments(updated);
      localStorage.setItem("sccg_cvs", JSON.stringify(updated));
    }
  };

  const handleStartCreate = () => {
    if (createMode === "blank") {
      window.location.href = "/admin/cv-suite/create?blank=true";
    } else if (createMode === "new") {
      const name = newCandidateName.trim();
      if (!name) { alert("Please enter a candidate name."); return; }
      window.location.href = `/admin/cv-suite/create?candidate=${encodeURIComponent(name)}`;
    } else if (selectedCandidate) {
      window.location.href = `/admin/cv-suite/create?candidate=${encodeURIComponent(selectedCandidate)}`;
    } else {
      window.location.href = "/admin/cv-suite/create";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-[#f9fafb] text-slate-800 min-h-screen">

      {/* Create CV Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[480px] border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-6 py-4 text-white">
              <h3 className="font-bold text-lg">Create New CV</h3>
              <p className="text-xs text-slate-300 mt-1">Choose how to start your CV</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${createMode === "existing" ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="radio" name="createMode" checked={createMode === "existing"} onChange={() => setCreateMode("existing")} className="accent-violet-600" />
                  <UserCheck className="w-5 h-5 text-violet-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Existing Candidate</p>
                    <p className="text-[11px] text-slate-500">Select from registered candidates</p>
                  </div>
                </label>
                {createMode === "existing" && (
                  <select value={selectedCandidate} onChange={e => setSelectedCandidate(e.target.value)} className="w-full ml-8 mr-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <option value="">— Select candidate —</option>
                    {candidates.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}

                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${createMode === "new" ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="radio" name="createMode" checked={createMode === "new"} onChange={() => setCreateMode("new")} className="accent-violet-600" />
                  <UserPlus className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">New Candidate</p>
                    <p className="text-[11px] text-slate-500">Create a CV for a new person</p>
                  </div>
                </label>
                {createMode === "new" && (
                  <input
                    type="text"
                    placeholder="Enter candidate name..."
                    value={newCandidateName}
                    onChange={e => setNewCandidateName(e.target.value)}
                    className="w-full ml-8 mr-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                )}

                <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${createMode === "blank" ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type="radio" name="createMode" checked={createMode === "blank"} onChange={() => setCreateMode("blank")} className="accent-violet-600" />
                  <FilePlus className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">Blank CV</p>
                    <p className="text-[11px] text-slate-500">Start without linking to any candidate</p>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl cursor-pointer">Cancel</button>
                <button onClick={handleStartCreate} className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl cursor-pointer">Start Creating</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Top Banner Greeting */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-[family-name:var(--font-outfit)]">Welcome back, SCCG!</h1>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mt-1">CV Maker Dashboard Hub</p>
        </div>
        
        <button className="px-4 py-2 bg-violet-650 hover:bg-violet-550 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer">
          Upgrade Now
        </button>
      </div>

      {/* 1. DOCUMENTS ROW WITH CREATE NEW DROPDOWN */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center relative">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Documents</h2>
            <p className="text-[10px] text-slate-400">Recently edited profiles and variations.</p>
          </div>

          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New</span>
              <ChevronRight className="w-3 h-3 rotate-90" />
            </button>

            {/* Kickresume Dropdown Menu selector */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <button 
                  onClick={() => { setIsDropdownOpen(false); setShowCreateModal(true); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-950 font-semibold flex items-center space-x-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-violet-500" />
                  <span>Resume / CV</span>
                </button>
                <button 
                  onClick={() => window.location.href = "/admin/cover-letters"}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-955 font-semibold flex items-center space-x-2"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Cover Letter</span>
                </button>
                <button 
                  onClick={() => alert("Website Creator coming soon!")}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-955 font-semibold flex items-center space-x-2"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
                  <span>Website</span>
                </button>
                <button 
                  onClick={() => alert("Resignation Letter Creator coming soon!")}
                  className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-955 font-semibold flex items-center space-x-2"
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>Resignation Letter</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Documents list grid from screenshots */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {documents.map((doc) => {
            const namePart = doc.name.split(" - ")[0];
            return (
              <div 
                key={doc.id}
                onClick={() => window.location.href = `/admin/cv-suite/create?candidate=${encodeURIComponent(namePart)}`}
                className="border border-slate-200/80 bg-slate-50/50 p-4 rounded-xl hover:border-violet-500 hover:bg-white hover:shadow-md transition-all cursor-pointer flex flex-col justify-between h-36"
              >
                <div className="space-y-1">
                  <div className="w-8 h-10 bg-white border border-slate-200 rounded shadow-sm flex items-center justify-center mb-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 truncate">{doc.name}</h4>
                  <p className="text-[10px] text-slate-450 font-medium truncate">{doc.role}</p>
                </div>

                <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-[9px] text-slate-400 font-semibold">
                  <span>{doc.updated}</span>
                  <button 
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. THREE-COLUMN EXPLORATION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Job Openings */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Job Openings</h3>
            <span className="text-[10px] text-slate-455 font-bold flex items-center cursor-pointer">
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          <div className="space-y-3">
            {[
              { title: "Control Room Administrator", company: "Extron PS LLC", icon: "🏢" },
              { title: "Administrative Assistant", company: "Lotus Relief Society", icon: "💼" },
              { title: "Weekend Part Time Linen Tech", company: "Healthcare Linen Services", icon: "🏥" },
              { title: "Site Experience Attendant", company: "Clydesdale Holding LLC", icon: "🌐" }
            ].map((job, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-left">
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-lg">{job.icon}</span>
                  <div>
                    <h5 className="font-bold text-slate-900 truncate max-w-[180px]">{job.title}</h5>
                    <p className="text-[10px] text-slate-450 truncate">{job.company}</p>
                  </div>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Career Map & Practise Interviews */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-3 text-center">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 text-left">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Career Map</h3>
            </div>
            <div className="p-4 bg-slate-50/50 rounded-xl space-y-2">
              <Map className="w-8 h-8 text-violet-650 mx-auto animate-pulse" />
              <h4 className="font-bold text-xs text-slate-900">Explore Your Career Map</h4>
              <p className="text-[10px] text-slate-400">Visualize career progression, target qualifications, and salary benchmarks.</p>
            </div>
            <button className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">
              Explore Map
            </button>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-3 text-center">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2 text-left">
              <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Practice Interviews</h3>
            </div>
            <div className="p-4 bg-slate-50/50 rounded-xl space-y-2">
              <UserCheck className="w-8 h-8 text-emerald-650 mx-auto" />
              <h4 className="font-bold text-xs text-slate-900">Practice Interview Now</h4>
              <p className="text-[10px] text-slate-400">Mock behavior interview generator matching specific job descriptions.</p>
            </div>
            <button className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer">
              Practice Interview
            </button>
          </div>
        </div>

        {/* Column 3: Tips & Guides */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">Tips & Guides</h3>
            <span className="text-[10px] text-slate-455 font-bold flex items-center cursor-pointer">
              <span>More</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>

          <div className="space-y-4">
            {[
              { title: "How to Get a Job With No Experience in 2026", desc: "Step-by-step guideline strategies." },
              { title: "How Long Does It Take to Hear Back From a Job?", desc: "Timeline expectations explained." }
            ].map((blog, idx) => (
              <div key={idx} className="space-y-1 hover:bg-slate-50 p-2 rounded-lg transition-colors cursor-pointer text-left">
                <div className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4 text-slate-400" />
                  <h5 className="font-bold text-xs text-slate-900 leading-snug">{blog.title}</h5>
                </div>
                <p className="text-[10px] text-slate-450 pl-6">{blog.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
