"use client";

import React, { useState } from "react";
import { 
  ClipboardCheck, 
  BookOpen, 
  HelpCircle, 
  Award, 
  Activity, 
  ArrowRight,
  CheckCircle,
  FileText
} from "lucide-react";

export default function DiagnosticPage() {
  const [step, setStep] = useState(1);
  const [qual, setQual] = useState("Realschulabschluss");
  const [german, setGerman] = useState("B2");
  const [ihkCode, setIhkCode] = useState("IT-Systemelektroniker");
  const [mathCheck, setMathCheck] = useState("yes");
  const [score, setScore] = useState<number | null>(null);

  const calculateScore = () => {
    let base = 50;
    
    // School Certificate weights
    if (qual === "Abitur") base += 25;
    else if (qual === "Realschulabschluss") base += 15;
    else base += 5;

    // German fluency weights
    if (["B2", "C1", "C2"].includes(german)) base += 20;
    else if (german === "B1") base += 10;

    // Prerequisites check
    if (mathCheck === "yes") base += 10;

    // Clamp score
    setScore(Math.min(base, 100));
    setStep(3);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Test Your Status</h1>
        <p className="text-slate-400 text-sm">Prüfen Sie Ihre Voraussetzungen für eine duale Ausbildung nach IHK/HWK Standard.</p>
      </div>

      <div className="bg-slate-800 border border-slate-700/60 p-8 rounded-2xl shadow-xl space-y-6">
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold flex items-center space-x-2 pb-3 border-b border-slate-700/50">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>Schritt 1: Schulische Qualifikation & Sprache</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Höchster Schulabschluss (oder Äquivalent)
                </label>
                <select 
                  value={qual}
                  onChange={(e) => setQual(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Abitur">Abitur / Fachabitur</option>
                  <option value="Realschulabschluss">Realschulabschluss (Mittlere Reife)</option>
                  <option value="Hauptschulabschluss">Hauptschulabschluss</option>
                  <option value="Other">Anderer Abschluss / Ausland</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Deutsches Sprachzertifikat / Niveau
                </label>
                <select 
                  value={german}
                  onChange={(e) => setGerman(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="C2">C2 (Muttersprache)</option>
                  <option value="C1">C1 (Fortgeschritten/Fachkundig)</option>
                  <option value="B2">B2 (Erforderlich für die meisten IT-Berufe)</option>
                  <option value="B1">B1 (Mindestniveau Duale Ausbildung)</option>
                  <option value="A2">A2 (Geringe Vorkenntnisse)</option>
                  <option value="A1">A1 (Grundlagen)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <span>Weiter</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold flex items-center space-x-2 pb-3 border-b border-slate-700/50">
              <Activity className="w-5 h-5 text-emerald-400" />
              <span>Schritt 2: Gewünschter Ausbildungsberuf (IHK/HWK)</span>
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Ausbildungsberuf / Handwerkercode
                </label>
                <select 
                  value={ihkCode}
                  onChange={(e) => setIhkCode(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Fachinformatiker">Fachinformatiker Anwendungsentwicklung</option>
                  <option value="IT-Systemelektroniker">IT-System-Elektroniker</option>
                  <option value="Anlagemechaniker">Anlagenmechaniker SHK (Handwerk)</option>
                  <option value="Kaufmann">Kaufmann für Büromanagement</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Haben Sie Vorkenntnisse in Mathematik & logischem Denken?
                </label>
                <div className="flex items-center space-x-4 mt-2">
                  <label className="flex items-center space-x-2 text-xs text-slate-350 cursor-pointer">
                    <input 
                      type="radio" 
                      name="math" 
                      value="yes"
                      checked={mathCheck === "yes"}
                      onChange={() => setMathCheck("yes")}
                      className="text-emerald-600 bg-slate-900 border-slate-700"
                    />
                    <span>Ja, gute Schulnoten in Math/Physik</span>
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-slate-350 cursor-pointer">
                    <input 
                      type="radio" 
                      name="math" 
                      value="no"
                      checked={mathCheck === "no"}
                      onChange={() => setMathCheck("no")}
                      className="text-emerald-600 bg-slate-900 border-slate-700"
                    />
                    <span>Nein / Ausbaufähig</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-slate-700/50">
              <button 
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-650 rounded-xl text-xs font-semibold"
              >
                Zurück
              </button>
              <button 
                onClick={calculateScore}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <span>Diagnose Abschließen</span>
                <CheckCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center">
            <div className="p-6 bg-slate-900/60 rounded-xl border border-slate-750 flex flex-col items-center justify-center space-y-4 max-w-md mx-auto">
              <Award className="w-16 h-16 text-emerald-400" />
              <div className="space-y-1">
                <div className="text-4xl font-black text-emerald-400">{score}%</div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ergebnis Readiness-Score</div>
              </div>
              
              <div className="text-xs text-slate-300 leading-relaxed">
                Qualifikation: <strong>{qual}</strong><br />
                Sprache: <strong>Deutsch {german}</strong><br />
                Zielzweig: <strong>{ihkCode}</strong>
              </div>
            </div>

            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Ihr Status-Report wurde generiert und für registrierte Ausbildungspartner in Ihrem Profil hinterlegt. Sie können den Test jederzeit wiederholen.
            </p>

            <div className="flex justify-center space-x-4 pt-4">
              <button 
                onClick={() => setStep(1)}
                className="px-4 py-2.5 bg-slate-700 hover:bg-slate-650 rounded-xl text-xs font-semibold"
              >
                Test wiederholen
              </button>
              <a 
                href="/ausbildung/seeker/dashboard"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer"
              >
                <span>Zurück zum Dashboard</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
