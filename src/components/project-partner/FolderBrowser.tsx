"use client";

import { useState } from "react";
import { Folder, ChevronLeft, FileText, Download, Lock } from "lucide-react";
import type { ProjectDocument } from "@/types";

function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export interface FolderData {
  folder: string;
  label: string;
  docs: ProjectDocument[];
}

interface Props {
  projectId: string;
  folders: FolderData[];
  /** When true the download links are hidden and text selection is blocked. */
  readOnly?: boolean;
}

export default function FolderBrowser({ projectId, folders, readOnly = false }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const active = folders.find((f) => f.folder === open);

  if (active) {
    const files = active.docs.filter((d) => !d.isFolder);
    return (
      <div className="rounded-xl border" style={readOnly ? { userSelect: "none", WebkitUserSelect: "none" } : {}}>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <button
            onClick={() => setOpen(null)}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <ChevronLeft className="h-4 w-4" /> All folders
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">{active.label}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            {files.length} file{files.length === 1 ? "" : "s"}
          </span>
          {readOnly && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              <Lock className="h-3 w-3" /> Read-only
            </span>
          )}
        </div>

        {files.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">This folder is empty.</p>
        ) : (
          <ul className="divide-y">
            {files.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-blue-600" />
                  <span className="truncate">{d.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{fmtSize(d.sizeBytes)}</span>
                </span>

                {readOnly ? (
                  /* Download is hidden; show a lock indicator instead */
                  <span className="inline-flex shrink-0 items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-400">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                ) : (
                  <a
                    href={`/api/project-files/${projectId}/${active.folder}/${encodeURIComponent(d.name)}?download=1`}
                    className="inline-flex shrink-0 items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <Download className="h-4 w-4" /> Download
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {folders.map((f) => {
        const count = f.docs.filter((d) => !d.isFolder).length;
        return (
          <button
            key={f.folder}
            onClick={() => setOpen(f.folder)}
            className="flex flex-col items-center gap-2 rounded-xl border bg-card p-5 text-center transition hover:border-blue-400 hover:shadow"
          >
            <Folder className="h-10 w-10 text-amber-500" />
            <span className="font-medium">{f.label}</span>
            <span className="text-xs text-muted-foreground">{count} file{count === 1 ? "" : "s"}</span>
            {readOnly && <Lock className="h-3 w-3 text-slate-400" />}
          </button>
        );
      })}
    </div>
  );
}
