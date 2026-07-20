"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

export function ManualSection({
  step,
  title,
  icon,
  children,
}: {
  step: string | number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden mb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="h-8 w-8 rounded-lg bg-cyan-500/15 border border-cyan-400/25 flex items-center justify-center text-cyan-400 shrink-0 text-sm font-bold">
          {step}
        </span>
        <span className="flex items-center gap-2 flex-1 font-semibold text-foreground text-[15px]">
          {icon}
          {title}
        </span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && <div className="px-5 pb-5 border-t border-border/60">{children}</div>}
    </div>
  );
}

export function ManualStep({
  number,
  text,
  note,
}: {
  number: number;
  text: string;
  note?: string;
}) {
  return (
    <div className="flex gap-3 mt-3">
      <span className="mt-0.5 h-6 w-6 rounded-full bg-cyan-500/15 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0">
        {number}
      </span>
      <div>
        <p className="text-sm text-foreground">{text}</p>
        {note && <p className="text-xs text-muted-foreground mt-0.5">{note}</p>}
      </div>
    </div>
  );
}

export function FeatureRow({
  label,
  href,
  desc,
}: {
  label: string;
  href: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <a
        href={href}
        className="shrink-0 text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 border border-cyan-400/25 px-3 py-1 rounded-lg transition-colors"
      >
        Open →
      </a>
    </div>
  );
}

export function ManualNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
      <span className="font-bold">Note: </span>
      {children}
    </div>
  );
}

export function ProcessFlow({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-3 space-y-2">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-foreground">
          <span className="mt-0.5 h-5 w-5 rounded-full bg-brand/15 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0">
            {i + 1}
          </span>
          {s}
        </li>
      ))}
    </ol>
  );
}
