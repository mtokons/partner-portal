"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  Trash2, 
  Activity, 
  RotateCcw, 
  Settings, 
  Search, 
  AlertOctagon,
  CheckCircle,
  Play
} from "lucide-react";

export default function AdminGdprPage() {
  const [loading, setLoading] = useState(false);
  const [retentionDays, setRetentionDays] = useState(180);
  const [logs, setLogs] = useState([
    { id: 1, action: "Art. 17 User Purge", target: "u-9843", triggeredBy: "Candidate Self-Service", timestamp: "10.07.2026 00:15" },
    { id: 2, action: "Auto-Retention Purge", target: "u-3829 (Inactive for 6 months)", triggeredBy: "Cron Worker Service", timestamp: "09.07.2026 02:00" },
    { id: 3, action: "Consent Visibility Update", target: "u-2849", triggeredBy: "Candidate Self-Service", timestamp: "08.07.2026 19:42" }
  ]);

  const handleRunRetentionSweep = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      alert("Retention sweep complete: 3 inactive profiles successfully deleted in compliance with AGG & GDPR/DSGVO.");
      setLogs(prev => [
        { id: Date.now(), action: "Auto-Retention Purge (Manual)", target: "3 inactive profiles (>180 days)", triggeredBy: "Admin", timestamp: new Date().toLocaleString("en-US") },
        ...prev
      ]);
    }, 1500);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin: GDPR / DSGVO Compliance Center</h1>
        <p className="text-slate-400 text-sm">Monitor data deletion logs, manage data retention rules, and execute compliance cleanup sweeps.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Retention Policy Settings */}
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-6 shadow-xl lg:col-span-1">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <span>Retention Policies</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Candidate Inactivity Limit (AGG Compliant)
              </label>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  value={retentionDays} 
                  onChange={(e) => setRetentionDays(parseInt(e.target.value) || 180)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs self-center text-slate-350 pr-2">days</span>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start space-x-3 text-xs text-amber-300">
              <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                After this threshold, inactive candidate profiles, including variations and cover letters, are permanently purged.
              </span>
            </div>

            <button 
              onClick={handleRunRetentionSweep}
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold flex items-center justify-center space-x-2 text-xs cursor-pointer shadow-md transition-all"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{loading ? "Sweeping database..." : "Run Retention Sweep Now"}</span>
            </button>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-slate-800 border border-slate-700/60 p-6 rounded-2xl space-y-6 shadow-xl lg:col-span-2">
          <h2 className="text-lg font-bold flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Compliance & Deletion Audit Trails</span>
          </h2>

          <div className="overflow-y-auto max-h-[300px] space-y-2 pr-2">
            {logs.map(log => (
              <div key={log.id} className="p-4 bg-slate-900/50 border border-slate-750 rounded-xl flex justify-between items-center text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-slate-200">{log.action}</div>
                  <div className="text-slate-350">Target object: {log.target}</div>
                  <div className="text-[10px] text-slate-500">Triggered by: {log.triggeredBy}</div>
                </div>
                <div className="text-slate-400 text-right text-[10px]">
                  {log.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
