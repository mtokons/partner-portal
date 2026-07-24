"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTransition, useState } from "react";
import type { ProjectOrg } from "@/types";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function OrgSwitcher({ orgs, activeId, basePath }: { orgs: ProjectOrg[]; activeId: string; basePath?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(activeId);
  const base = basePath || pathname;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Organisation</span>
      <Select
        value={value}
        onValueChange={(v) => {
          setValue(v);
          startTransition(() => router.push(`${base}?org=${encodeURIComponent(v)}`));
        }}
      >
        <SelectTrigger className="w-56" disabled={pending}>
          <SelectValue placeholder="Select organisation" />
        </SelectTrigger>
        <SelectContent>
          {orgs.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ManageNav() {
  const items = [
    { href: "/project-partner/manage/projects", label: "Projects" },
    { href: "/project-partner/manage/intake", label: "AI CV Intake" },
    { href: "/project-partner/manage/evaluation", label: "Evaluation Setup" },
    { href: "/project-partner/manage/users", label: "Users" },
    { href: "/project-partner/manage/org", label: "Organisation" },
  ];
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="rounded-full border px-3 py-1 text-sm hover:bg-muted">{i.label}</Link>
      ))}
    </nav>
  );
}
