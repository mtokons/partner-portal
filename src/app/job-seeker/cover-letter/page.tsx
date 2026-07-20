"use client";

import React, { useState } from "react";
import { 
  FileText, 
  Sparkles, 
  Palette, 
  Download, 
  Check, 
  Send,
  ArrowRight
} from "lucide-react";

export default function CoverLetterPage() {
  const [loading, setLoading] = useState(false);
  const [jobTitle, setJobTitle] = useState("Software Engineer (m/w/d)");
  const [company, setCompany] = useState("SCCG Solution Partner");
  const [themeColor, setThemeColor] = useState("bg-indigo-600");
  const [content, setContent] = useState({
    sender: "Max Mustermann\nMusterstraße 42\n80331 München",
    recipient: "SCCG Solution Partner\nHuman Resources\nMusterstraße 1\n10115 Berlin",
    subject: "Bewerbung als Software Engineer (m/w/d)",
    salutation: "Sehr geehrte Damen und Herren,",
    body: "mit großem Interesse habe ich Ihre Stellenausschreibung für die Position als Software Engineer gelesen. Da meine Qualifikationen in der Entwicklung von skalierbaren Cloud-Systemen und Web-Applikationen mit Ihren Anforderungen übereinstimmen, möchte ich mich Ihnen kurz vorstellen.\n\nIn meiner bisherigen Tätigkeit konnte ich fundierte Erfahrungen mit modernen React-Architekturen und datenbankbasierten FastAPIs sammeln. Gerne möchte ich meine lösungsorientierte Arbeitsweise in Ihr Team einbringen.",
    closing: "Mit freundlichen Grüßen,\nMax Mustermann"
  });

  const handleGenerateAiDraft = () => {
    setLoading(true);
    setTimeout(() => {
      setContent(prev => ({
        ...prev,
        subject: `Bewerbung als ${jobTitle} bei ${company}`,
        body: `bezugnehmend auf Ihre Stellenausschreibung als ${jobTitle} bewerbe ich mich hiermit um diese spannende Aufgabe. Die von Ihnen beschriebene Kultur und Ausrichtung bei ${company} decken sich perfekt mit meinem Wunsch nach einer professionellen Weiterentwicklung.\n\nIch bringe mehrjährige Expertise im Aufbau modularer Applikationen und der Integration intelligenter Cloud-Dienste mit. Zu meinen Stärken zählen Teamfähigkeit, Zuverlässigkeit und eine schnelle Auffassungsgabe bei komplexen Systemarchitekturen.\n\nÜber eine Einladung zu einem persönlichen Gespräch freue ich sich.`
      }));
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DIN 5008 Anschreiben Generator</h1>
        <p className="text-slate-400 text-sm">Erstellen Sie ein formell korrektes deutsches Anschreiben synchronisiert mit Ihrem CV-Design.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Editor Settings Form */}
        <div className="lg:col-span-5 bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-6 shadow-xl">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <span>AI-Matching & Details</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Ziel-Stellentitel</label>
              <input 
                type="text" 
                value={jobTitle} 
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Unternehmen</label>
              <input 
                type="text" 
                value={company} 
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            <button
              onClick={handleGenerateAiDraft}
              disabled={loading}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer text-sm shadow-md"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span>{loading ? "Generiere Entwurf..." : "Anschreiben per AI anpassen"}</span>
            </button>

            <div className="border-t border-slate-700/50 pt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Absenderadresse</label>
                <textarea 
                  rows={3}
                  value={content.sender} 
                  onChange={(e) => setContent(prev => ({ ...prev, sender: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all font-mono resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Empfängeradresse</label>
                <textarea 
                  rows={3}
                  value={content.recipient} 
                  onChange={(e) => setContent(prev => ({ ...prev, recipient: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all font-mono resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Design-Farbabgleich (CV Sync)</label>
                <div className="flex items-center space-x-2 mt-1">
                  {["bg-indigo-600", "bg-emerald-600", "bg-rose-600", "bg-slate-700"].map(color => (
                    <button 
                      key={color}
                      onClick={() => setThemeColor(color)}
                      className={`w-7 h-7 rounded-full border-2 ${color} ${
                        themeColor === color ? "border-white scale-110" : "border-transparent"
                      } transition-all`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DIN 5008 Layout Preview */}
        <div className="lg:col-span-7 bg-slate-800 border border-slate-700/60 p-6 rounded-2xl shadow-xl flex flex-col">
          <div className="flex justify-between items-center pb-4 border-b border-slate-700/50 mb-6">
            <h2 className="text-lg font-bold flex items-center space-x-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span>DIN 5008 Vorschau</span>
            </h2>
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold flex items-center space-x-1.5 transition-all">
              <Download className="w-4 h-4" />
              <span>PDF Herunterladen</span>
            </button>
          </div>

          {/* Letter Sheet */}
          <div className="flex-1 bg-white text-slate-800 p-12 rounded-xl shadow-inner min-h-[600px] text-xs space-y-8 border-2 border-slate-400/35 relative font-sans leading-relaxed">
            {/* Sender block top left */}
            <div className="text-slate-500 whitespace-pre text-[10px] leading-tight">
              {content.sender}
            </div>

            {/* Recipient Address Block (standard DIN position) */}
            <div className="w-64 border border-slate-200/50 p-2 rounded text-[10px] whitespace-pre leading-tight">
              <div className="text-[8px] text-slate-400 underline mb-1">Max Mustermann · Musterstraße 42 · 80331 München</div>
              {content.recipient}
            </div>

            {/* Date line right aligned */}
            <div className="text-right text-slate-500 text-[10px]">
              München, den {new Date().toLocaleDateString("de-DE")}
            </div>

            {/* Subject Line bold */}
            <div className="space-y-1">
              <div className={`h-0.5 w-16 ${themeColor} rounded`} />
              <div className="font-bold text-sm text-slate-950 mt-1">{content.subject}</div>
            </div>

            {/* Salutation */}
            <div>{content.salutation}</div>

            {/* Body */}
            <div className="whitespace-pre-line text-slate-700 leading-relaxed min-h-[150px]">
              {content.body}
            </div>

            {/* Closing */}
            <div className="whitespace-pre text-slate-800 font-semibold pt-4">
              {content.closing}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
