"use client";

import { useState, useEffect } from "react";
import { Folder, FolderOpen, ChevronRight, Home, Check, X, Loader2 } from "lucide-react";

interface FolderItem {
  id: string;
  name: string;
  path: string;
}

interface OneDriveFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFolder: (path: string) => void;
  userId?: string;
  initialPath?: string;
}

export function OneDriveFolderModal({
  isOpen,
  onClose,
  onSelectFolder,
  userId,
  initialPath = "/",
}: OneDriveFolderModalProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || "/");
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFolders(currentPath);
    }
  }, [isOpen, currentPath, userId]);

  async function loadFolders(path: string) {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/admin/onedrive-to-telegram/folders", window.location.origin);
      if (userId) url.searchParams.set("userId", userId);
      url.searchParams.set("folderPath", path);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load folders.");
      }

      setFolders(data.folders || []);
      setCurrentPath(data.currentPath || "/");
    } catch (err: any) {
      setError(err.message || "Could not fetch OneDrive folders.");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const pathParts = currentPath.split("/").filter(Boolean);

  function handleNavigateUp() {
    if (pathParts.length <= 1) {
      setCurrentPath("/");
    } else {
      const parent = "/" + pathParts.slice(0, -1).join("/");
      setCurrentPath(parent);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">OneDrive Folder Browser</h3>
              <p className="text-xs text-slate-400">Click a folder to open subfolders or select a destination path.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Breadcrumb Path Bar */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/60 flex items-center gap-1.5 overflow-x-auto text-xs text-slate-300">
          <button
            onClick={() => setCurrentPath("/")}
            className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 text-blue-400 font-medium transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Root (/)
          </button>

          {pathParts.map((part, idx) => {
            const subPath = "/" + pathParts.slice(0, idx + 1).join("/");
            return (
              <div key={subPath} className="flex items-center gap-1 shrink-0">
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                <button
                  onClick={() => setCurrentPath(subPath)}
                  className="px-2 py-1 rounded-lg hover:bg-slate-800 hover:text-slate-100 font-medium transition-colors"
                >
                  {part}
                </button>
              </div>
            );
          })}
        </div>

        {/* Folder List Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-2 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-xs font-medium">Scanning OneDrive directories...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs text-center">
              {error}
            </div>
          ) : (
            <>
              {currentPath !== "/" && (
                <button
                  onClick={handleNavigateUp}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/80 text-xs font-medium text-slate-300 transition-colors"
                >
                  <Folder className="w-4 h-4 text-blue-400" />
                  <span>.. (Parent Folder)</span>
                </button>
              )}

              {folders.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  No subfolders found in this directory.
                </div>
              ) : (
                folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group flex items-center justify-between p-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/80 transition-all hover:border-slate-700"
                  >
                    <button
                      onClick={() => setCurrentPath(folder.path)}
                      className="flex items-center gap-3 text-xs font-medium text-slate-200 group-hover:text-blue-400 text-left truncate flex-1"
                    >
                      <Folder className="w-4.5 h-4.5 text-blue-400 shrink-0" />
                      <span className="truncate">{folder.name}</span>
                    </button>

                    <button
                      onClick={() => {
                        onSelectFolder(folder.path);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 text-blue-300 hover:bg-blue-600 hover:text-white text-xs font-semibold transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Select
                    </button>
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/90 flex items-center justify-between">
          <span className="text-xs text-slate-400 truncate max-w-[320px]">
            Selected: <code className="text-blue-300 bg-slate-950 px-1.5 py-0.5 rounded">{currentPath}</code>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onSelectFolder(currentPath);
                onClose();
              }}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 shadow-md transition-all"
            >
              <Check className="w-4 h-4" />
              Use Current Path
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
