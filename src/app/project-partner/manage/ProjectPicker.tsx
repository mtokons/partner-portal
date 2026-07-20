"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import type { Project } from "@/types";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function ProjectPicker({ projects, selectedId, basePath }: { projects: Project[]; selectedId: string; basePath?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(selectedId);
  // Navigate on the current route so the picker works wherever the page is mounted
  // (e.g. /project-partner/manage/... or /admin/ppms/...).
  const base = basePath || pathname;

  if (projects.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Project</span>
      <Select
        value={value}
        onValueChange={(v) => {
          setValue(v);
          startTransition(() => router.push(`${base}?project=${encodeURIComponent(v)}`));
        }}
      >
        <SelectTrigger className="w-72" disabled={pending}>
          <SelectValue placeholder="Select a project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
