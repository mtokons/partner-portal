"use client";

import React, { useState } from "react";
import { FileText, Search, Trash2, Eye, X, Printer, Download } from "lucide-react";

interface AdminLetterRecord {
  id: string;
  candidateName: string;
  candidateAddress: string;
  jobTitle: string;
  company: string;
  companyAddress: string;
  date: string;
  subject: string;
  body: string;
}

export default function AdminCoverLettersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLetter, setSelectedLetter] = useState<AdminLetterRecord | null>(null);

  const [letters, setLetters] = useState<AdminLetterRecord[]>([
    { 
      id: "let-1", 
      candidateName: "Max Mustermann", 
      candidateAddress: "Julius-Ludowieg-Straße 46, 21073 Hamburg",
      jobTitle: "Senior Cloud Architect", 
      company: "SCCG Solution Partner", 
      companyAddress: "SCCG Solution Partner UG\nRecruitment Team\nBreite Str. 22\n10178 Berlin",
      date: "10. July 2026",
      subject: "Bewerbung als Senior Cloud Architect",
      body: "Sehr geehrte Damen und Herren,\n\nmit großem Interesse habe ich Ihre Ausschreibung für die Position des Senior Cloud Architect gelesen. Durch meine langjährige Erfahrung im Aufbau von Multi-Cloud Architekturen mit AWS und Kubernetes kann ich Ihr Engineering-Team optimal unterstützen.\n\nIch freue mich auf die Gelegenheit zu einem persönlichen Gespräch.\n\nMit freundlichen Grüßen,\nMax Mustermann"
    },
    { 
      id: "let-2", 
      candidateName: "Elena Petrova", 
      candidateAddress: "Münchener Str. 89, 80331 München",
      jobTitle: "DevOps Engineer", 
      company: "Educraft GmbH", 
      companyAddress: "Educraft GmbH\nHuman Resources\nKaiserstraße 14\n60311 Frankfurt",
      date: "09. July 2026",
      subject: "Bewerbung als DevOps Specialist",
      body: "Sehr geehrte Damen und Herren,\n\nals erfahrene DevOps-Spezialistin mit Fokus auf CI/CD-Optimierung und automatisiertes Monitoring verfolge ich die Entwicklungen Ihres Hauses mit großem Interesse.\n\nIch freue mich über eine Einladung zum Vorstellungsgespräch.\n\nMit freundlichen Grüßen,\nElena Petrova"
    }
  ]);

  const deleteLetter = (id: string) => {
    if (confirm("Are you sure you want to delete this Cover Letter?")) {
      setLetters(prev => prev.filter(l => l.id !== id));
      if (selectedLetter?.id === id) setSelectedLetter(null);
    }
  };

  const filteredLetters = letters.filter(l => 
    l.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.jobTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin: Cover Letters (Anschreiben)</h1>
        <p className="text-slate-400 text-sm">Monitor generated candidate cover letters, check compliance layouts (DIN 5008 standards), or delete entries.</p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search candidates or companies..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Letter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredLetters.map(letter => (
          <div key={letter.id} className="bg-slate-800 border border-slate-700/60 p-5 rounded-2xl space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-sm text-slate-100">{letter.candidateName}</h3>
                  <p className="text-[10px] text-slate-400">{letter.date}</p>
                </div>
                <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded text-[9px] uppercase font-bold">DIN 5008 Standard</span>
              </div>
              <div className="text-xs text-slate-350 bg-slate-900/40 p-3 rounded-lg space-y-1">
                <div>Subject: <strong>{letter.jobTitle}</strong></div>
                <div>Recipient: <span className="text-slate-300">{letter.company}</span></div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-750">
              <button 
                onClick={() => setSelectedLetter(letter)}
                className="flex-1 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold inline-flex items-center justify-center space-x-1 cursor-pointer transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>View Cover Letter</span>
              </button>
              <button 
                onClick={() => deleteLetter(letter.id)}
                className="px-3 py-1.5 bg-red-650/15 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-600/25 transition-all cursor-pointer inline-flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* DIN 5008 Cover Letter Preview Modal */}
      {selectedLetter && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 max-w-2xl w-full rounded-2xl shadow-2xl p-6 relative space-y-6 text-slate-100 flex flex-col my-8">
            <button 
              onClick={() => setSelectedLetter(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-750 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-violet-400" />
                <span className="font-bold text-sm">DIN 5008 Cover Letter Template</span>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => window.print()}
                  className="p-1.5 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-750 transition-colors text-slate-300"
                  title="Print Page"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => alert("Cover Letter downloaded as PDF.")}
                  className="p-1.5 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-750 transition-colors text-slate-300"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* DIN 5008 Sheet Container */}
            <div className="bg-white text-slate-900 p-8 rounded-xl font-[family-name:var(--font-outfit)] shadow-inner text-xs space-y-8 select-text">
              
              {/* Sender Details (Top Align) */}
              <div className="text-right text-[10px] text-slate-500">
                <p className="font-bold">{selectedLetter.candidateName}</p>
                <p>{selectedLetter.candidateAddress}</p>
              </div>

              {/* Recipient Address Zone (DIN 5008 window envelope position) */}
              <div className="pt-2 text-[10px]">
                <p className="text-slate-400 border-b border-slate-200 pb-1 mb-2 text-[9px]">Empfängeranschrift (DIN 5008)</p>
                <div className="whitespace-pre-line leading-relaxed text-slate-800">
                  {selectedLetter.companyAddress}
                </div>
              </div>

              {/* Date Block */}
              <div className="text-right pt-4 text-slate-700">
                <p>Hamburg, {selectedLetter.date}</p>
              </div>

              {/* Subject Line (DIN 5008: bold, no 'Subject/Betreff' label) */}
              <div className="pt-4 font-bold text-sm text-slate-950">
                {selectedLetter.subject}
              </div>

              {/* Content Body */}
              <div className="pt-2 whitespace-pre-line leading-relaxed text-slate-850">
                {selectedLetter.body}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
