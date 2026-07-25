"use client";

import { useState, useEffect, useRef } from "react";
import {
  Send, Play, Square, CheckCircle2, AlertTriangle, FileText,
  ShieldCheck, Terminal, Eye, EyeOff, FolderOpen,
  Bookmark, Trash2, Plus, Activity, Gauge, AlertCircle, History, Clock, RefreshCw, ChevronDown, ChevronUp, Zap, Smartphone, Key, Lock
} from "lucide-react";
import { OneDriveFolderModal } from "@/components/onedrive/OneDriveFolderModal";

interface JobHistoryRecord {
  id: string;
  startTime: string;
  endTime: string | null;
  status: "completed" | "stopped" | "error";
  folderPath: string;
  chatId: string;
  mode: "bot" | "user_mtproto";
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  deletedFiles: number;
  totalBytes: number;
  processedBytes: number;
  cancellationReason?: string;
  logs: string[];
}

interface TransferState {
  status: "idle" | "running" | "stopped" | "completed" | "error";
  mode: "bot" | "user_mtproto";
  botToken: string;
  apiId?: string;
  apiHash?: string;
  sessionString?: string;
  chatId: string;
  folderPath: string;
  userId: string;
  deleteAfterTransfer: boolean;
  totalFiles: number;
  processedFiles: number;
  successfulFiles: number;
  failedFiles: number;
  deletedFiles: number;
  totalBytes: number;
  processedBytes: number;
  currentFileName: string;
  speedBps: number;
  startTime: string | null;
  endTime: string | null;
  cancellationReason?: string;
  logs: string[];
  history: JobHistoryRecord[];
}

interface SavedDestination {
  id: string;
  name: string;
  mode: "bot" | "user_mtproto";
  botToken?: string;
  apiId?: string;
  apiHash?: string;
  sessionString?: string;
  chatId: string;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + " " + sizes[i];
}

const STORAGE_KEY = "sccg_telegram_destinations_v3";

export default function OneDriveToTelegramPage() {
  const [transferMode, setTransferMode] = useState<"bot" | "user_mtproto">("user_mtproto");

  // Bot Credentials
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  // MTProto Credentials (your credentials prefilled!)
  const [apiId, setApiId] = useState("33690110");
  const [apiHash, setApiHash] = useState("829e2bcf0fbb355750471d4f099d8277");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneCodeHash, setPhoneCodeHash] = useState("");
  const [tempSession, setTempSession] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [twoFaPassword, setTwoFaPassword] = useState("");
  const [sessionString, setSessionString] = useState("");
  const [authStep, setAuthStep] = useState<"credentials" | "code_sent" | "authenticated">("credentials");

  // Destination & Settings
  const [chatId, setChatId] = useState("");
  const [folderPath, setFolderPath] = useState("/");
  const [userId, setUserId] = useState("");
  const [deleteAfterTransfer, setDeleteAfterTransfer] = useState(false);

  const [savedDestinations, setSavedDestinations] = useState<SavedDestination[]>([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState<string>("");
  const [newPresetName, setNewPresetName] = useState("");
  const [showSavePresetModal, setShowSavePresetModal] = useState(false);

  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<string>("all");

  const [state, setState] = useState<TransferState>({
    status: "idle",
    mode: "user_mtproto",
    botToken: "",
    apiId: "33690110",
    apiHash: "829e2bcf0fbb355750471d4f099d8277",
    sessionString: "",
    chatId: "",
    folderPath: "/",
    userId: "",
    deleteAfterTransfer: false,
    totalFiles: 0,
    processedFiles: 0,
    successfulFiles: 0,
    failedFiles: 0,
    deletedFiles: 0,
    totalBytes: 0,
    processedBytes: 0,
    currentFileName: "",
    speedBps: 0,
    startTime: null,
    endTime: null,
    cancellationReason: undefined,
    logs: [],
    history: [],
  });

  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedDestinations(JSON.parse(stored));
      }
      const savedSession = localStorage.getItem("sccg_mtproto_session_v3");
      if (savedSession) {
        setSessionString(savedSession);
        setAuthStep("authenticated");
      }
    } catch (e) {
      console.error("Failed to load saved Telegram destinations:", e);
    }
  }, []);

  function saveDestinationsToStorage(items: SavedDestination[]) {
    setSavedDestinations(items);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save Telegram destinations:", e);
    }
  }

  function handleSaveNewDestination() {
    if (!newPresetName.trim()) {
      alert("Please enter a name for this Telegram destination.");
      return;
    }
    if (!chatId.trim()) {
      alert("Please fill in Target Chat ID before saving.");
      return;
    }

    const newItem: SavedDestination = {
      id: "dest_" + Date.now(),
      name: newPresetName.trim(),
      mode: transferMode,
      botToken: botToken.trim() || undefined,
      apiId: apiId.trim() || undefined,
      apiHash: apiHash.trim() || undefined,
      sessionString: sessionString.trim() || undefined,
      chatId: chatId.trim(),
    };

    const updated = [newItem, ...savedDestinations];
    saveDestinationsToStorage(updated);
    setSelectedDestinationId(newItem.id);
    setNewPresetName("");
    setShowSavePresetModal(false);
  }

  function handleDeleteDestination(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this saved Telegram destination?")) {
      const updated = savedDestinations.filter((d) => d.id !== id);
      saveDestinationsToStorage(updated);
      if (selectedDestinationId === id) {
        setSelectedDestinationId("");
      }
    }
  }

  function handleSelectDestination(destId: string) {
    setSelectedDestinationId(destId);
    if (!destId) return;
    const match = savedDestinations.find((d) => d.id === destId);
    if (match) {
      setTransferMode(match.mode || "user_mtproto");
      if (match.botToken) setBotToken(match.botToken);
      if (match.apiId) setApiId(match.apiId);
      if (match.apiHash) setApiHash(match.apiHash);
      if (match.sessionString) {
        setSessionString(match.sessionString);
        setAuthStep("authenticated");
      }
      setChatId(match.chatId);
    }
  }

  // MTProto Step 1: Send Telegram SMS/App Code
  async function handleSendAuthCode() {
    if (!apiId.trim() || !apiHash.trim() || !phoneNumber.trim()) {
      setErrorMsg("Please provide API ID, API Hash, and Phone Number.");
      return;
    }

    setErrorMsg(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/admin/onedrive-to-telegram/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_code",
          apiId: apiId.trim(),
          apiHash: apiHash.trim(),
          phoneNumber: phoneNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send verification code.");

      setPhoneCodeHash(data.phoneCodeHash);
      setTempSession(data.tempSession || "");
      setAuthStep("code_sent");
    } catch (err: any) {
      setErrorMsg(err.message || "Could not send login code.");
    } finally {
      setAuthLoading(false);
    }
  }

  // MTProto Step 2: Verify 5-Digit Code
  async function handleVerifyAuthCode() {
    if (!authCode.trim()) {
      setErrorMsg("Please enter the 5-digit verification code sent to your Telegram app.");
      return;
    }

    setErrorMsg(null);
    setAuthLoading(true);

    try {
      const res = await fetch("/api/admin/onedrive-to-telegram/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_code",
          apiId: apiId.trim(),
          apiHash: apiHash.trim(),
          phoneNumber: phoneNumber.trim(),
          phoneCodeHash,
          code: authCode.trim(),
          password: twoFaPassword.trim() || undefined,
          tempSession,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to verify code.");

      setSessionString(data.sessionString);
      localStorage.setItem("sccg_mtproto_session_v3", data.sessionString);
      setAuthStep("authenticated");
    } catch (err: any) {
      if (err.message === "2FA_REQUIRED") {
        setErrorMsg("Your Telegram account requires a Two-Factor Authentication (2FA) Password. Please enter it below.");
      } else {
        setErrorMsg(err.message || "Failed to authenticate session.");
      }
    } finally {
      setAuthLoading(false);
    }
  }

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
    if (transferMode === "bot" && !botToken.trim()) {
      setErrorMsg("Please enter a valid Telegram Bot Token.");
      return;
    }
    if (transferMode === "user_mtproto" && !sessionString) {
      setErrorMsg("Please complete Telegram Account Authentication below before starting MTProto transfer.");
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
          mode: transferMode,
          botToken: transferMode === "bot" ? botToken : undefined,
          apiId: transferMode === "user_mtproto" ? apiId : undefined,
          apiHash: transferMode === "user_mtproto" ? apiHash : undefined,
          sessionString: transferMode === "user_mtproto" ? sessionString : undefined,
          chatId,
          folderPath,
          userId: userId.trim() || undefined,
          deleteAfterTransfer,
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

  const filteredLogs = state.logs.filter((l) => {
    if (logFilter === "errors") return l.includes("❌") || l.includes("ERROR") || l.includes("Notice");
    if (logFilter === "success") return l.includes("✓") || l.includes("DELETED");
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950/60 to-purple-950/40 p-6 rounded-3xl border border-blue-500/20 shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30 shadow-inner">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                OneDrive to Telegram Studio
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400" />
                  Direct MTProto 2GB Active
                </span>
              </h1>
              <p className="text-xs text-slate-300">
                Direct stream high-res videos & media collections from Microsoft OneDrive up to 2GB per file using native Telegram MTProto socket connection.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("live")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "live"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Live Console
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Transfer History ({state.history?.length || 0})
            </button>
          </div>

          <div className="flex items-center gap-2.5 bg-slate-950/80 p-2.5 px-4 rounded-2xl border border-slate-800">
            <div
              className={`w-3 h-3 rounded-full ${
                state.status === "running"
                  ? "bg-emerald-500 animate-ping"
                  : state.status === "completed"
                  ? "bg-blue-500"
                  : state.status === "error"
                  ? "bg-rose-500"
                  : state.status === "stopped"
                  ? "bg-amber-500"
                  : "bg-slate-500"
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              {state.status === "running"
                ? "Active Stream"
                : state.status === "completed"
                ? "Completed"
                : state.status === "error"
                ? "Error Stopped"
                : state.status === "stopped"
                ? "Cancelled"
                : "Idle"}
            </span>
          </div>
        </div>
      </div>

      {activeTab === "live" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Transfer Controls */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-6">
              {/* Transfer Mode Switcher */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">
                  Select Telegram Protocol Mode
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTransferMode("user_mtproto")}
                    className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                      transferMode === "user_mtproto"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Zap className="w-4 h-4 text-emerald-400" />
                    Direct MTProto (2GB)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferMode("bot")}
                    className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                      transferMode === "bot"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    Bot API (50MB)
                  </button>
                </div>
              </div>

              {/* MODE A: MTProto Authentication Panel */}
              {transferMode === "user_mtproto" ? (
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-emerald-400" />
                      MTProto User Authentication
                    </span>
                    {authStep === "authenticated" && (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">API ID</label>
                        <input
                          type="text"
                          value={apiId}
                          onChange={(e) => setApiId(e.target.value)}
                          placeholder="e.g. 33690110"
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">API Hash</label>
                        <input
                          type="password"
                          value={apiHash}
                          onChange={(e) => setApiHash(e.target.value)}
                          placeholder="e.g. 829e2bcf..."
                          className="w-full text-xs p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 font-mono"
                        />
                      </div>
                    </div>

                    {authStep === "credentials" && (
                      <div className="space-y-2">
                        <label className="text-[11px] text-slate-300 block">
                          Telegram Phone Number (International format)
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="e.g. +8801712345678 or +4915123456"
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleSendAuthCode}
                            disabled={authLoading}
                            className="px-4 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 shrink-0"
                          >
                            {authLoading ? "Sending..." : "Send Code"}
                          </button>
                        </div>
                      </div>
                    )}

                    {authStep === "code_sent" && (
                      <div className="space-y-2 pt-1 border-t border-slate-800">
                        <label className="text-[11px] font-bold text-amber-300 block">
                          Enter 5-Digit Code sent to Telegram App:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={authCode}
                            onChange={(e) => setAuthCode(e.target.value)}
                            placeholder="e.g. 54321"
                            className="w-full text-xs p-2.5 rounded-xl border border-amber-500/40 bg-slate-900 text-amber-200 font-mono font-bold tracking-widest text-center"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyAuthCode}
                            disabled={authLoading}
                            className="px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 shrink-0"
                          >
                            {authLoading ? "Verifying..." : "Verify Code"}
                          </button>
                        </div>
                        <input
                          type="password"
                          value={twoFaPassword}
                          onChange={(e) => setTwoFaPassword(e.target.value)}
                          placeholder="2FA Password (if enabled on account)"
                          className="w-full text-xs p-2.5 mt-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-100"
                        />
                      </div>
                    )}

                    {authStep === "authenticated" && (
                      <div className="flex items-center justify-between p-2.5 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-xs text-emerald-300">
                        <span className="font-semibold">✓ Telegram Account Connected</span>
                        <button
                          type="button"
                          onClick={() => setAuthStep("credentials")}
                          className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                        >
                          Re-authenticate
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* MODE B: Telegram Bot Token Input */
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Telegram Bot Token <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showToken ? "text" : "password"}
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="e.g. 8852706442:AAHNKFr98..."
                      disabled={state.status === "running"}
                      className="w-full text-xs p-3.5 pr-10 rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Destination Preset Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Bookmark className="w-3.5 h-3.5 text-blue-400" />
                    Saved Telegram Credentials
                  </label>
                  {chatId && (
                    <button
                      onClick={() => setShowSavePresetModal(true)}
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline"
                    >
                      <Plus className="w-3 h-3" /> Save Current
                    </button>
                  )}
                </div>

                {savedDestinations.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedDestinationId}
                      onChange={(e) => handleSelectDestination(e.target.value)}
                      className="w-full text-xs p-3 rounded-2xl border border-slate-800 bg-slate-950 text-slate-200 font-medium outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="">-- Choose Saved Telegram Destination --</option>
                      {savedDestinations.map((d) => (
                        <option key={d.id} value={d.id}>
                          ⭐ {d.name} ({d.chatId})
                        </option>
                      ))}
                    </select>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {savedDestinations.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => handleSelectDestination(d.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                            selectedDestinationId === d.id
                              ? "bg-blue-600/20 border-blue-500/50 text-blue-200 shadow-sm"
                              : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          }`}
                        >
                          <span className="truncate max-w-[140px]">{d.name}</span>
                          <button
                            onClick={(e) => handleDeleteDestination(d.id, e)}
                            title="Delete saved credential"
                            className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 italic">
                    No saved credential presets yet. Save your channel IDs for quick access.
                  </p>
                )}
              </div>

              {/* Form Controls */}
              <div className="space-y-4">
                {/* Target Chat ID */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    Target Telegram Chat / Channel ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="e.g. -1004343470080 or @mychannel"
                    disabled={state.status === "running"}
                    className="w-full text-xs p-3.5 rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 font-mono"
                  />
                </div>

                {/* OneDrive User ID (Optional) */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    OneDrive User Account / Email <span className="text-slate-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g. user@mysccg.de (Leave blank for default /me drive)"
                    disabled={state.status === "running"}
                    className="w-full text-xs p-3.5 rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                  />
                </div>

                {/* OneDrive Folder Path */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                      OneDrive Folder Path
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsFolderModalOpen(true)}
                      disabled={state.status === "running"}
                      className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline disabled:opacity-50"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      Browse Folders
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={folderPath}
                      onChange={(e) => setFolderPath(e.target.value)}
                      placeholder="e.g. / or /Pictures"
                      disabled={state.status === "running"}
                      className="w-full text-xs p-3.5 rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setIsFolderModalOpen(true)}
                      disabled={state.status === "running"}
                      className="px-4 bg-slate-800 border border-slate-700 rounded-2xl hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50 shrink-0"
                    >
                      Select
                    </button>
                  </div>
                </div>

                {/* Delete From OneDrive Feature Toggle */}
                <div className="pt-2">
                  <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="deleteAfterToggle"
                      checked={deleteAfterTransfer}
                      onChange={(e) => setDeleteAfterTransfer(e.target.checked)}
                      disabled={state.status === "running"}
                      className="mt-1 w-4 h-4 accent-blue-600 rounded cursor-pointer"
                    />
                    <div>
                      <label
                        htmlFor="deleteAfterToggle"
                        className="text-xs font-bold text-slate-200 cursor-pointer block"
                      >
                        Delete file from OneDrive after successful Telegram transfer
                      </label>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        When enabled, files will be permanently deleted from OneDrive immediately after Telegram confirms receipt.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Start Button */}
              <div className="pt-2">
                {state.status === "running" ? (
                  <button
                    onClick={handleStop}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-xl shadow-rose-950/40 transition-all active:scale-[0.98]"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    Stop Transfer Operation
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-blue-950/40 transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    {loading ? "Starting Stream..." : `Start Direct ${transferMode === "user_mtproto" ? "MTProto 2GB" : "Bot API"} Stream`}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Stream Metrics & Console Logs */}
          <div className="lg:col-span-7 space-y-6">
            {/* Progress Overview Card */}
            <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-sm font-bold text-slate-100">Live Transfer Metrics</h2>
                </div>
                <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                  {percentage}% Progress
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>
                    {state.processedFiles} / {state.totalFiles} Files Processed
                  </span>
                  <span>
                    {formatBytes(state.processedBytes)} / {formatBytes(state.totalBytes)}
                  </span>
                </div>
              </div>

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Speed
                  </span>
                  <span className="text-sm font-bold text-slate-100 font-mono flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5 text-blue-400" />
                    {formatBytes(state.speedBps)}/s
                  </span>
                </div>

                <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl">
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
                    Succeeded
                  </span>
                  <span className="text-sm font-bold text-emerald-300 font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {state.successfulFiles}
                  </span>
                </div>

                <div className="p-3.5 bg-rose-950/20 border border-rose-500/20 rounded-2xl">
                  <span className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider block mb-1">
                    Failed
                  </span>
                  <span className="text-sm font-bold text-rose-300 font-mono flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {state.failedFiles}
                  </span>
                </div>

                <div className="p-3.5 bg-amber-950/20 border border-amber-500/20 rounded-2xl">
                  <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">
                    Deleted
                  </span>
                  <span className="text-sm font-bold text-amber-300 font-mono flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" />
                    {state.deletedFiles}
                  </span>
                </div>
              </div>

              {/* Cancellation Reason Notice */}
              {state.cancellationReason && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold block">Operation Stop Details:</span>
                    <span>{state.cancellationReason}</span>
                  </div>
                </div>
              )}

              {/* Currently Processing File */}
              {state.currentFileName && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-3 text-xs">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="text-slate-400">Current:</span>
                  <span className="text-slate-200 font-mono truncate font-medium">
                    {state.currentFileName}
                  </span>
                </div>
              )}
            </div>

            {/* Terminal Console */}
            <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[420px]">
              <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">Execution Console Logs</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setLogFilter("all")}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                      logFilter === "all" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    All ({state.logs.length})
                  </button>
                  <button
                    onClick={() => setLogFilter("errors")}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                      logFilter === "errors" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Errors
                  </button>
                  <button
                    onClick={() => setLogFilter("success")}
                    className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                      logFilter === "success" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Success
                  </button>
                </div>
              </div>

              <div
                ref={terminalRef}
                className="p-5 flex-1 overflow-y-auto font-mono text-[11.5px] leading-relaxed space-y-1.5 bg-slate-950 text-slate-300 select-text"
              >
                {filteredLogs.length === 0 ? (
                  <div className="text-slate-600 text-center py-20 italic">
                    Console ready. Logs will stream in real-time when transfer starts.
                  </div>
                ) : (
                  filteredLogs.map((log, index) => {
                    const isError = log.includes("❌") || log.includes("ERROR");
                    const isSuccess = log.includes("✓") || log.includes("DELETED");
                    const isNotice = log.includes("Notice") || log.includes("RATE LIMIT") || log.includes("STOPPED");

                    return (
                      <div
                        key={index}
                        className={`break-all ${
                          isError
                            ? "text-rose-400 font-semibold"
                            : isSuccess
                            ? "text-emerald-400 font-semibold"
                            : isNotice
                            ? "text-amber-300"
                            : "text-slate-300"
                        }`}
                      >
                        {log}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-3xl p-6 shadow-xl backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm font-bold text-slate-100">Past Transfer Jobs & Cancellation Diagnostics</h2>
            </div>
            <button
              onClick={fetchStatus}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh History
            </button>
          </div>

          {!state.history || state.history.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs italic">
              No previous transfer jobs recorded yet. Run a job from the Live Console to view complete historical logs.
            </div>
          ) : (
            <div className="space-y-4">
              {state.history.map((record) => {
                const isExpanded = expandedHistoryId === record.id;
                const dateStr = new Date(record.startTime).toLocaleString();

                return (
                  <div
                    key={record.id}
                    className="border border-slate-800/80 rounded-2xl bg-slate-950/60 overflow-hidden transition-all hover:border-slate-700"
                  >
                    <div
                      onClick={() => setExpandedHistoryId(isExpanded ? null : record.id)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-900/40"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                              record.status === "completed"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : record.status === "stopped"
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            }`}
                          >
                            {record.status}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            {record.mode === "user_mtproto" ? "⚡ MTProto 2GB" : "🤖 Bot API"}
                          </span>
                          <span className="text-xs font-bold text-slate-200">
                            Folder: <code className="text-blue-300 font-mono">{record.folderPath}</code>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 flex items-center gap-2">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Started: {dateStr}</span>
                          <span>•</span>
                          <span>Target: <code className="text-slate-300 font-mono">{record.chatId}</code></span>
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right text-xs font-mono">
                          <div className="font-bold text-slate-200">
                            {record.successfulFiles} / {record.totalFiles} Files
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {formatBytes(record.processedBytes)} transferred
                          </div>
                        </div>

                        <button className="p-1 text-slate-400 hover:text-slate-200">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 space-y-4 text-xs">
                        {record.cancellationReason && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300">
                            <span className="font-bold block text-[11px]">Cancellation / Stop Reason:</span>
                            <span>{record.cancellationReason}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total</span>
                            <div className="font-bold text-slate-200 font-mono text-sm">{record.totalFiles}</div>
                          </div>
                          <div className="p-2.5 bg-emerald-950/20 rounded-xl border border-emerald-500/20">
                            <span className="text-[10px] text-emerald-400 uppercase font-semibold">Successful</span>
                            <div className="font-bold text-emerald-300 font-mono text-sm">{record.successfulFiles}</div>
                          </div>
                          <div className="p-2.5 bg-rose-950/20 rounded-xl border border-rose-500/20">
                            <span className="text-[10px] text-rose-400 uppercase font-semibold">Failed</span>
                            <div className="font-bold text-rose-300 font-mono text-sm">{record.failedFiles}</div>
                          </div>
                          <div className="p-2.5 bg-amber-950/20 rounded-xl border border-amber-500/20">
                            <span className="text-[10px] text-amber-400 uppercase font-semibold">Deleted</span>
                            <div className="font-bold text-amber-300 font-mono text-sm">{record.deletedFiles}</div>
                          </div>
                        </div>

                        {record.logs && record.logs.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-300">Job Execution Logs Snapshot:</span>
                            <div className="p-3 bg-slate-950 rounded-xl font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto text-slate-300 border border-slate-800">
                              {record.logs.map((log, idx) => (
                                <div key={idx} className="break-all">{log}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Save Preset Modal */}
      {showSavePresetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-400" />
              Save Destination Preset
            </h3>
            <p className="text-xs text-slate-400">
              Save these credentials to easily select them in future transfer sessions.
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Preset Label / Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. SCCG Main Media Channel"
                className="w-full text-xs p-3 rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSavePresetModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNewDestination}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
              >
                Save Destination
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OneDrive Visual Folder Browser Modal */}
      <OneDriveFolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onSelectFolder={(selectedPath) => setFolderPath(selectedPath)}
        userId={userId.trim() || undefined}
        initialPath={folderPath}
      />
    </div>
  );
}
