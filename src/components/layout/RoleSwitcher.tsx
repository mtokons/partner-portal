"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Eye, RotateCcw } from "lucide-react";
import type { ConsoleType } from "@/lib/menu-engine";
import { CONSOLE_META } from "@/lib/menu-engine";

const ALL_CONSOLES: Array<{ id: ConsoleType; label: string; subtitle: string }> = (
  Object.entries(CONSOLE_META) as [ConsoleType, { label: string; subtitle: string }][]
).map(([id, meta]) => ({ id, label: meta.label, subtitle: meta.subtitle }));

interface RoleSwitcherProps {
  currentConsole: ConsoleType;
  previewConsole: ConsoleType | null;
  onSwitch: (console: ConsoleType | null) => void;
}

export default function RoleSwitcher({ currentConsole, previewConsole, onSwitch }: RoleSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeConsole = previewConsole ?? currentConsole;
  const activeMeta = CONSOLE_META[activeConsole];
  const isPreviewing = previewConsole !== null;

  return (
    <div ref={ref} className="relative w-full">
      {/* Preview Banner */}
      {isPreviewing && (
        <div className="mb-2 flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-[11px] font-semibold text-amber-300">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">Previewing: {activeMeta.label}</span>
          <button
            onClick={() => onSwitch(null)}
            className="ml-auto shrink-0 rounded p-0.5 hover:bg-amber-500/30 transition-colors text-amber-300"
            title="Reset to your console"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Switcher Button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-left hover:bg-white/15 transition-colors cursor-pointer"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{activeMeta.label}</p>
          <p className="text-[10px] text-slate-300 truncate">{activeMeta.subtitle}</p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-white/15 bg-slate-900/95 backdrop-blur-md text-white shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-1.5">
            {/* Reset option */}
            {isPreviewing && (
              <button
                onClick={() => { onSwitch(null); setOpen(false); }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-amber-500/20 transition-colors mb-1 border border-dashed border-amber-500/40"
              >
                <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
                <div>
                  <p className="text-xs font-bold text-amber-400">Reset to My Console</p>
                  <p className="text-[10px] text-slate-300">{CONSOLE_META[currentConsole].label}</p>
                </div>
              </button>
            )}

            {ALL_CONSOLES.map((c) => {
              const isActive = c.id === activeConsole;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    onSwitch(c.id === currentConsole ? null : c.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                    isActive
                      ? "bg-indigo-600/30 border border-indigo-400/50 text-white"
                      : "hover:bg-white/10 border border-transparent text-slate-200"
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold truncate ${isActive ? "text-indigo-300 font-bold" : "text-slate-100"}`}>
                      {c.label}
                    </p>
                    <p className="text-[10px] text-slate-300 truncate">{c.subtitle}</p>
                  </div>
                  {isActive && (
                    <span className="ml-auto shrink-0 text-[9px] font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-400/30 px-1.5 py-0.5 rounded">
                      ACTIVE
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
