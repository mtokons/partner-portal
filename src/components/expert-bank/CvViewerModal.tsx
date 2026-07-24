"use client";

import { useEffect, useState } from "react";

/**
 * CV viewer popup. DOCX files can't render natively in the browser, so we embed
 * the Microsoft Office online viewer pointed at our streaming API route (which is
 * access-controlled). Also offers a direct download.
 */
export default function CvViewerModal({
  previewUrl,
  downloadUrl,
  fileName,
  onClose,
}: {
  previewUrl: string;
  downloadUrl: string;
  fileName: string;
  onClose: () => void;
}) {
  const [absoluteUrl, setAbsoluteUrl] = useState("");

  useEffect(() => {
    // Build an absolute URL to the (public-to-authenticated) stream so the Office viewer can fetch it.
    if (typeof window !== "undefined" && previewUrl) {
      setAbsoluteUrl(`${window.location.origin}${previewUrl}`);
    }
  }, [previewUrl]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const isDocx = /\.(docx?|pptx?|xlsx?)$/i.test(fileName);
  const isPdf = /\.pdf$/i.test(fileName);
  const officeViewer = absoluteUrl ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteUrl)}` : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <h3 className="truncate text-sm font-semibold text-slate-800">{fileName}</h3>
          </div>
          <div className="flex items-center gap-2">
            <a href={downloadUrl}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">Download</a>
            <button onClick={onClose} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200">Close</button>
          </div>
        </div>
        <div className="flex-1 bg-slate-100">
          {isPdf && absoluteUrl && (
            <iframe title="CV preview" src={absoluteUrl} className="h-full w-full" />
          )}
          {isDocx && officeViewer && (
            <iframe title="CV preview" src={officeViewer} className="h-full w-full" />
          )}
          {!isPdf && !isDocx && (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
              <p className="text-sm">Preview not available for this file type.</p>
              <a href={downloadUrl} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Download to view</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
