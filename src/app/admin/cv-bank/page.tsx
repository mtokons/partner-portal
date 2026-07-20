"use client";

import React, { useState } from "react";
import { Database, Search, RefreshCw, Trash2, Eye, X, Check, EyeOff, Upload, Sparkles, Plus, FileText } from "lucide-react";

interface AdminCvRecord {
  id: string;
  candidateName: string;
  title: string;
  isBankVisible: boolean;
  variationsCount: number;
  lastUpdated: string;
  email: string;
  phone: string;
  experience: string;
  education: string;
}

export default function AdminCvBankPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCv, setSelectedCv] = useState<AdminCvRecord | null>(null);
  const [replacingCvId, setReplacingCvId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<"idle" | "uploading" | "extracting" | "complete">("idle");
  const [newTitle, setNewTitle] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const [cvBank, setCvBank] = useState<AdminCvRecord[]>([
    { 
      id: "cv-1", 
      candidateName: "Max Mustermann", 
      title: "Senior Full-Stack Engineer", 
      isBankVisible: true, 
      variationsCount: 3, 
      lastUpdated: "10.07.2026",
      email: "max.mustermann@sccg.de",
      phone: "+49 176 1234567",
      experience: "8 years at Google & Siemens building enterprise cloud apps.",
      education: "M.Sc. in Computer Science - TU München"
    },
    { 
      id: "cv-2", 
      candidateName: "Elena Petrova", 
      title: "DevOps Specialist", 
      isBankVisible: false, 
      variationsCount: 2, 
      lastUpdated: "09.07.2026",
      email: "elena.petrova@gmail.com",
      phone: "+49 152 9876543",
      experience: "4 years deploying Kubernetes clusters and CI/CD pipelines.",
      education: "B.Sc. in Software Engineering - Sofia University"
    },
    { 
      id: "cv-3", 
      candidateName: "Sabine Schmidt", 
      title: "Java Backend Developer", 
      isBankVisible: true, 
      variationsCount: 1, 
      lastUpdated: "08.07.2026",
      email: "sabine.schmidt@web.de",
      phone: "+49 40 555789",
      experience: "6 years designing Spring Boot microservices for banking systems.",
      education: "B.Sc. in Business Informatics - Hamburg University"
    }
  ]);

  const toggleVisibility = (id: string) => {
    setCvBank(prev => prev.map(cv => cv.id === id ? { ...cv, isBankVisible: !cv.isBankVisible } : cv));
  };

  const deleteCv = (id: string) => {
    if (confirm("Are you sure you want to delete this CV profile from the Master CV Bank?")) {
      setCvBank(prev => prev.filter(cv => cv.id !== id));
      if (selectedCv?.id === id) setSelectedCv(null);
    }
  };

  const handleStartReplace = (id: string, currentTitle: string) => {
    setReplacingCvId(id);
    setNewTitle(currentTitle);
    setUploadProgress("idle");
    setUploadedFile(null);
  };

  const executeReplace = () => {
    if (!newTitle) return;
    setUploadProgress("uploading");
    setTimeout(() => {
      setUploadProgress("extracting");
      setTimeout(() => {
        setUploadProgress("complete");
        setTimeout(() => {
          setCvBank(prev => prev.map(cv => cv.id === replacingCvId ? { 
            ...cv, 
            title: newTitle, 
            lastUpdated: new Date().toLocaleDateString("de-DE"),
            experience: `Extracted via AI: Updated profile targeted for ${newTitle} - automated keyword enrichment complete.`
          } : cv));
          setReplacingCvId(null);
          setUploadProgress("idle");
        }, 1000);
      }, 1500);
    }, 1000);
  };

  const handleCreateNew = () => {
    // Redirect admin to the CV Suite page wizard
    window.location.href = "/admin/cv-suite?wizard=true";
  };

  const filteredCvBank = cvBank.filter(c => 
    c.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin: CV Master Bank</h1>
          <p className="text-slate-400 text-sm">Review standard CV profiles in the pool, toggle candidate visibility, update primary roles, or upload and replace profiles.</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="px-4 py-2.5 bg-violet-650 hover:bg-violet-550 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Create CV via Wizard</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search candidates or roles..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* CV List Table */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-750 text-slate-350">
                <th className="p-4 font-semibold uppercase tracking-wider">Candidate</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Primary Job Title / Role</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Visibility Status</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Variations</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Last Updated</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-750">
              {filteredCvBank.map(cv => (
                <tr key={cv.id} className="hover:bg-slate-750/30 transition-colors">
                  <td className="p-4 font-medium text-slate-100">{cv.candidateName}</td>
                  <td className="p-4 text-slate-350">{cv.title}</td>
                  <td className="p-4">
                    <button 
                      onClick={() => toggleVisibility(cv.id)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer inline-flex items-center space-x-1 ${
                        cv.isBankVisible 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-slate-900 text-slate-500 border-slate-700"
                      }`}
                    >
                      {cv.isBankVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{cv.isBankVisible ? "Visible in Pool" : "Hidden"}</span>
                    </button>
                  </td>
                  <td className="p-4 text-slate-350">{cv.variationsCount} variations</td>
                  <td className="p-4 text-slate-400">{cv.lastUpdated}</td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => setSelectedCv(cv)}
                      className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 text-white rounded text-[10px] transition-colors cursor-pointer inline-flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View CV</span>
                    </button>
                    <button 
                      onClick={() => handleStartReplace(cv.id, cv.title)}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-[10px] hover:bg-slate-750 transition-colors cursor-pointer inline-flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Replace File</span>
                    </button>
                    <button 
                      onClick={() => deleteCv(cv.id)}
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

      {/* View CV Modal */}
      {selectedCv && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 max-w-lg w-full rounded-2xl shadow-2xl p-6 relative space-y-4 text-slate-100">
            <button 
              onClick={() => setSelectedCv(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <Database className="w-6 h-6 text-violet-400" />
              <h2 className="text-xl font-bold">{selectedCv.candidateName}</h2>
            </div>
            <p className="text-slate-400 text-xs">{selectedCv.title}</p>
            <div className="border-t border-slate-700 pt-4 space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Contact Info</span>
                <p>{selectedCv.email} | {selectedCv.phone}</p>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Experience Summary</span>
                <p className="text-slate-200">{selectedCv.experience}</p>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold uppercase tracking-wider text-[10px]">Education</span>
                <p className="text-slate-200">{selectedCv.education}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replace CV Modal Dialog */}
      {replacingCvId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-2xl shadow-2xl p-6 relative space-y-4 text-slate-100">
            <button 
              onClick={() => setReplacingCvId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-6 h-6 text-violet-400" />
              <h2 className="text-xl font-bold">Replace CV File</h2>
            </div>
            <p className="text-slate-400 text-xs">Upload a new PDF/DOCX CV to replace the existing candidate profile data.</p>
            
            {uploadProgress === "idle" && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-slate-455 font-semibold text-xs mb-1">Target Job Title / Role</label>
                  <input 
                    type="text" 
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                    placeholder="e.g. Lead Cloud Architect"
                    required
                  />
                </div>
                
                <input 
                  type="file" 
                  id="cv-file-replace-bank"
                  className="hidden" 
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadedFile(e.target.files[0]);
                    }
                  }}
                />
                <div 
                  onClick={() => document.getElementById("cv-file-replace-bank")?.click()}
                  className="border-2 border-dashed border-slate-700 rounded-xl p-8 flex flex-col items-center justify-center space-y-2 hover:border-violet-500 transition-colors cursor-pointer"
                >
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-xs font-semibold">
                    {uploadedFile ? uploadedFile.name : "Select PDF / Word CV"}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {uploadedFile ? `${Math.round(uploadedFile.size / 1024)} KB` : "Max size: 8MB"}
                  </span>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                  <button 
                    onClick={() => setReplacingCvId(null)}
                    className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-750 text-slate-350 rounded-xl text-xs"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={executeReplace}
                    className="px-4 py-2 bg-violet-650 hover:bg-violet-550 text-white rounded-xl text-xs font-semibold"
                  >
                    Upload & Extract
                  </button>
                </div>
              </div>
            )}

            {uploadProgress === "uploading" && (
              <div className="py-8 flex flex-col items-center justify-center space-y-4">
                <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-300">Uploading document to server...</p>
              </div>
            )}

            {uploadProgress === "extracting" && (
              <div className="py-8 flex flex-col items-center justify-center space-y-4 text-center">
                <Sparkles className="w-10 h-10 text-violet-400 animate-pulse" />
                <p className="text-xs font-semibold text-slate-200">Extracting details using AI & Fast API...</p>
                <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden max-w-xs">
                  <div className="bg-violet-500 h-full w-2/3 rounded-full animate-pulse" />
                </div>
              </div>
            )}

            {uploadProgress === "complete" && (
              <div className="py-8 flex flex-col items-center justify-center space-y-2 text-center">
                <Check className="w-10 h-10 text-emerald-400" />
                <p className="text-xs font-semibold text-slate-200">Extraction complete!</p>
                <p className="text-[10px] text-slate-400">Saving profile to SharePoint Document library...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
