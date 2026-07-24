"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send, Play, Square, RefreshCw, CheckCircle2, AlertTriangle, FileText,
  HardDrive, ShieldCheck, Terminal, Layers, ArrowRight, Eye, EyeOff
} from "lucide-react";

interface TransferState {
  status: "idle" | "running" | "stopped" | "completed" | "error";
  botToken: string;
  chatId: string;
  folderPath: string;
  userId: string;
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalBytes: number;
  processedBytes: number;
  currentFileName: string;
  speedBps: number;
  startTime: string | null;
  endTime: string | null;
  logs: string[];
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

export default function OneDriveToTelegramPage() {
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [chatId, setChatId] = useState("");
  const [folderPath, setFolderPath] = useState("/");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [state, setState] = useState<TransferState>({
    status: "idle",
    botToken: "",
    chatId: "",
    folderPath: "/",
    userId: "",
    totalFiles: 0,
    processedFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    totalBytes: 0,
    processedBytes: 0,
    currentFileName: "",
    speedBps: 0,
    startTime: null,
    endTime: null,
    logs: [],
  });

  const terminalRef = useRef<HTMLDivElement>(null);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/admin/onedrive-to-telegram/status");
      if (res.ok) {
        const data: TransferState = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error("Failed to fetch status:", err);
    }
  }

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [state.logs]);

  async function handleStart() {
    if (!botToken.trim()) {
      setErrorMsg("Please enter a valid Telegram Bot Token.");
      return;
    }
    if (!chatId.trim()) {
      setErrorMsg("Please enter a Target Telegram Chat / Channel ID.");
      return;
    }

    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/onedrive-to-telegram/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken,
          chatId,
          folderPath,
          userId: userId.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start transfer.");
      }

      await fetchStatus();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initiate transfer job.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    try {
      await fetch("/api/admin/onedrive-to-telegram/stop", { method: "POST" });
      await fetchStatus();
    } catch (err) {
      console.error("Failed to stop transfer:", err);
    }
  }

  const percentage =
    state.totalFiles > 0
      ? Math.min(100, Math.round((state.processedFiles / state.totalFiles) * 100))
      : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-900/40 via-purple-900/30 to-slate-900 p-6 rounded-2xl border border-blue-500/20 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                OneDrive to Telegram Streamer
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Zero Local Storage
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Directly stream photo and document collections from Microsoft OneDrive to any Telegram Channel without saving files to the server.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatus}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              Transfer Configuration
            </h2>

            {/* Telegram Bot Token */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Telegram Bot Token <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={botToken}
                  onChange={(e) => setBotToken(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRstuVWxYZ"
                  disabled={state.status === "running"}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Create a bot via <span className="text-blue-400">@BotFather</span> and add it as an admin in your channel.
              </p>
            </div>

            {/* Target Chat ID */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Target Telegram Chat / Channel ID <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder="-1001234567890 or @my_channel_name"
                disabled={state.status === "running"}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Public channels: <code className="text-blue-400">@my_channel_name</code> | Private channels: <code className="text-emerald-400">-1002145897612</code> (Numeric ID).
              </p>
              <p className="text-[10px] text-amber-400/90 mt-0.5">
                ⚠️ Telegram invite links (<code className="text-amber-300 font-mono">https://t.me/+...</code>) are not accepted by Telegram API. Forward a channel post to <span className="text-blue-400">@userinfobot</span> to find your private numeric Chat ID.
              </p>
            </div>

            {/* Target User ID (Optional) */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                OneDrive User Account / Email <span className="text-slate-500">(Optional)</span>
              </label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. jfridoy@mysccg.de (Leave blank for default app drive)"
                disabled={state.status === "running"}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* OneDrive Folder Path */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                OneDrive Folder Path
              </label>
              <input
                type="text"
                value={folderPath}
                onChange={(e) => setFolderPath(e.target.value)}
                placeholder="/ or /Pictures or /Backup"
                disabled={state.status === "running"}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Type `/` to process the entire OneDrive, or enter a folder path like `/Pictures`.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-3">
              {state.status === "running" ? (
                <button
                  onClick={handleStop}
                  className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-rose-900/30"
                >
                  <Square className="w-4 h-4 fill-white" />
                  Stop Transfer Operation
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition shadow-lg shadow-blue-900/30 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                  Start Streaming Transfer
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live GUI Progress Bar & Terminal */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status & GUI Transfer Bar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                Live Transfer GUI Progress
              </h2>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                  state.status === "running"
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse"
                    : state.status === "completed"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : state.status === "stopped"
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                STATUS: {state.status.toUpperCase()}
              </span>
            </div>

            {/* Dynamic Progress Bar Component */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-slate-300">Overall Progress</span>
                <span className="text-blue-400 font-bold text-base">{percentage}%</span>
              </div>
              <div className="w-full h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Current Active Item Badge */}
            <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-center gap-3">
              <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0" />
              <div className="overflow-hidden">
                <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Current File Processing</p>
                <p className="text-sm font-mono text-slate-200 truncate">
                  {state.currentFileName || "Waiting to initialize..."}
                </p>
              </div>
            </div>

            {/* Stats Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800">
                <p className="text-[11px] text-slate-500 font-medium">Processed Files</p>
                <p className="text-lg font-bold text-white mt-1">
                  {state.processedFiles} <span className="text-xs font-normal text-slate-400">/ {state.totalFiles}</span>
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800">
                <p className="text-[11px] text-slate-500 font-medium">Data Transferred</p>
                <p className="text-lg font-bold text-emerald-400 mt-1">
                  {formatBytes(state.processedBytes)}
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800">
                <p className="text-[11px] text-slate-500 font-medium">Succeeded / Failed</p>
                <p className="text-lg font-bold text-white mt-1">
                  <span className="text-emerald-400">{state.successfulFiles}</span>
                  {" / "}
                  <span className="text-rose-400">{state.failedFiles}</span>
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800">
                <p className="text-[11px] text-slate-500 font-medium">Transfer Speed</p>
                <p className="text-lg font-bold text-blue-400 mt-1">
                  {state.speedBps ? `${formatBytes(state.speedBps)}/s` : "0 B/s"}
                </p>
              </div>
            </div>
          </div>

          {/* Live Activity Terminal Window */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 shadow-xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div className="flex items-center gap-2 text-slate-400 font-medium">
                <Terminal className="w-4 h-4 text-emerald-400" />
                Live Operation Terminal Output
              </div>
              <span className="text-[10px] text-slate-500">Auto-scrolling</span>
            </div>

            <div
              ref={terminalRef}
              className="h-56 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin scrollbar-thumb-slate-800"
            >
              {state.logs.length === 0 ? (
                <p className="text-slate-600 italic">No transfer operations logged yet. Click Start above.</p>
              ) : (
                state.logs.map((log, idx) => (
                  <p
                    key={idx}
                    className={
                      log.includes("❌") || log.includes("ERROR")
                        ? "text-rose-400"
                        : log.includes("✓")
                        ? "text-emerald-400"
                        : log.includes("===")
                        ? "text-blue-400 font-bold"
                        : "text-slate-300"
                    }
                  >
                    {log}
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
