import { FileText, FolderOpen, Download } from "lucide-react";
import type { ProjectDocument } from "@/types";

function fmtSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function DocumentList({ projectId, folder, docs }: { projectId: string; folder: string; docs: ProjectDocument[] }) {
  if (docs.length === 0) {
    return <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">No files yet.</p>;
  }
  return (
    <ul className="divide-y rounded-xl border">
      {docs.filter((d) => !d.isFolder).map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2">
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-blue-600" />
            <span className="truncate">{d.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{fmtSize(d.sizeBytes)}</span>
          </span>
          <a
            href={`/api/project-files/${projectId}/${folder}/${encodeURIComponent(d.name)}?download=1`}
            className="inline-flex shrink-0 items-center gap-1 text-sm text-blue-600 hover:underline"
          >
            <Download className="h-4 w-4" /> Download
          </a>
        </li>
      ))}
    </ul>
  );
}

export function DocumentSectionHeader({ title }: { title: string }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
      <FolderOpen className="h-4 w-4 text-amber-500" /> {title}
    </h3>
  );
}
