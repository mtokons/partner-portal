"use client";

import { useEffect, useState } from "react";

/**
 * CV preview popup for project-partner evaluation CVs.
 * - PDF → inline iframe (browser streams it with the session cookie).
 * - DOCX → rendered as HTML via the server-side mammoth preview endpoint.
 * - Always offers a direct download.
 */
export default function ProjectCvViewerModal({
  projectId,
  fileName,
  onClose,
}: {
  projectId: string;
  fileName: string;
  onClose: () => void;
}) {
  const base = `/api/project-files/${projectId}/CVs/${encodeURIComponent(fileName)}`;
  const isPdf = /\.pdf$/i.test(fileName);
  const isDocx = /\.docx?$/i.test(fileName);

  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(isDocx);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  useEffect(() => {
    if (!isDocx) return;
    let active = true;
    setLoading(true);
    fetch(`${base}?preview=html`)
      .then((r) => (r.ok ? r.text() : Promise.reject()))
      .then((t) => { if (active) { setHtml(t); setLoading(false); } })
      .catch(() => { if (active) { setError(true); setLoading(false); } });
    return () => { active = false; };
  }, [base, isDocx]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="h-5 w-5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h3 className="truncate text-sm font-semibold text-slate-800">{fileName}</h3>
          </div>
          <div className="flex items-center gap-2">
            <a href={`${base}?download=1`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">Download</a>
            <button onClick={onClose} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">Close</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto bg-slate-50">
          {isPdf && <iframe title="CV preview" src={base} className="h-full w-full" />}
          {isDocx && loading && <div className="flex h-full items-center justify-center text-sm text-slate-400">Rendering document…</div>}
          {isDocx && !loading && !error && html !== null && (
            <div className="mx-auto max-w-3xl bg-white p-8 text-sm leading-relaxed text-slate-800 shadow-sm [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-bold [&_h2]:mb-1 [&_h2]:mt-4 [&_h2]:font-semibold [&_p]:mb-2 [&_table]:my-3 [&_table]:w-full [&_td]:border [&_td]:p-1.5 [&_th]:border [&_th]:p-1.5 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: html }} />
          )}
          {isDocx && error && (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
              <p className="text-sm">Inline preview isn&apos;t available for this file.</p>
              <a href={`${base}?download=1`} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Download to view</a>
            </div>
          )}
          {!isPdf && !isDocx && (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
              <p className="text-sm">Preview not available for this file type.</p>
              <a href={`${base}?download=1`} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Download to view</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
