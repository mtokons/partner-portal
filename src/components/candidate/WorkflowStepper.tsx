"use client";

import {
  CheckCircle2,
  Circle,
  UserCheck,
  FileSearch,
  BookOpen,
  GraduationCap,
  Send,
  Building2,
  Search,
  BadgeCheck,
  CalendarClock,
  Phone,
  Globe,
  Play,
  Trophy,
  Loader2,
} from "lucide-react";
import {
  WORKFLOW_ORDERED_STATUSES,
  formatStatusLabel,
  isOptionalStatus,
} from "@/lib/engine/candidate-workflow";
import type { WorkflowCategory, CandidateStatus } from "@/types";

// Per-status visual config: color classes + icon
const STATUS_CONFIG: Record<
  string,
  { dot: string; ring: string; bar: string; bg: string; text: string; icon: React.ComponentType<{ className?: string }> }
> = {
  REGISTERED:                   { dot: "bg-slate-400",    ring: "ring-slate-300",   bar: "bg-slate-400",    bg: "bg-slate-50 dark:bg-slate-900/30",    text: "text-slate-600 dark:text-slate-300",   icon: UserCheck },
  DOCUMENTS_UNDER_REVIEW:       { dot: "bg-blue-500",     ring: "ring-blue-300",    bar: "bg-blue-500",     bg: "bg-blue-50 dark:bg-blue-900/30",       text: "text-blue-600 dark:text-blue-300",     icon: FileSearch },
  GERMAN_COURSE_ASSIGNED:       { dot: "bg-indigo-500",   ring: "ring-indigo-300",  bar: "bg-indigo-500",   bg: "bg-indigo-50 dark:bg-indigo-900/30",   text: "text-indigo-600 dark:text-indigo-300", icon: BookOpen },
  PROFESSIONAL_TRAINING_GOING_ON:{ dot: "bg-violet-500",  ring: "ring-violet-300",  bar: "bg-violet-500",   bg: "bg-violet-50 dark:bg-violet-900/30",   text: "text-violet-600 dark:text-violet-300", icon: GraduationCap },
  APPLICATION_STARTED:          { dot: "bg-orange-500",   ring: "ring-orange-300",  bar: "bg-orange-500",   bg: "bg-orange-50 dark:bg-orange-900/30",   text: "text-orange-600 dark:text-orange-300", icon: Send },
  APPLICATION_SUBMITTED:        { dot: "bg-orange-500",   ring: "ring-orange-300",  bar: "bg-orange-500",   bg: "bg-orange-50 dark:bg-orange-900/30",   text: "text-orange-600 dark:text-orange-300", icon: Send },
  ADMISSION_PROCESS:            { dot: "bg-amber-500",    ring: "ring-amber-300",   bar: "bg-amber-500",    bg: "bg-amber-50 dark:bg-amber-900/30",     text: "text-amber-600 dark:text-amber-300",   icon: Building2 },
  ADMISSION_UNDER_PROCESS:      { dot: "bg-amber-500",    ring: "ring-amber-300",   bar: "bg-amber-500",    bg: "bg-amber-50 dark:bg-amber-900/30",     text: "text-amber-600 dark:text-amber-300",   icon: Building2 },
  ZAB_VERIFICATION_STARTED:     { dot: "bg-teal-500",     ring: "ring-teal-300",    bar: "bg-teal-500",     bg: "bg-teal-50 dark:bg-teal-900/30",       text: "text-teal-600 dark:text-teal-300",     icon: Search },
  ZAB_VERIFICATION_COMPLETED:   { dot: "bg-teal-600",     ring: "ring-teal-400",    bar: "bg-teal-600",     bg: "bg-teal-50 dark:bg-teal-900/30",       text: "text-teal-700 dark:text-teal-300",     icon: BadgeCheck },
  WAITING_FOR_VISA_APPOINTMENT: { dot: "bg-rose-500",     ring: "ring-rose-300",    bar: "bg-rose-500",     bg: "bg-rose-50 dark:bg-rose-900/30",       text: "text-rose-600 dark:text-rose-300",     icon: CalendarClock },
  WAITING_FOR_VISA_CALL:        { dot: "bg-rose-500",     ring: "ring-rose-300",    bar: "bg-rose-500",     bg: "bg-rose-50 dark:bg-rose-900/30",       text: "text-rose-600 dark:text-rose-300",     icon: Phone },
  VISA_PROCESS:                 { dot: "bg-red-600",      ring: "ring-red-300",     bar: "bg-red-600",      bg: "bg-red-50 dark:bg-red-900/30",         text: "text-red-600 dark:text-red-300",       icon: Globe },
  VISA_PROCESS_STARTED:         { dot: "bg-red-600",      ring: "ring-red-300",     bar: "bg-red-600",      bg: "bg-red-50 dark:bg-red-900/30",         text: "text-red-600 dark:text-red-300",       icon: Globe },
  TRAINING_STARTED:             { dot: "bg-purple-500",   ring: "ring-purple-300",  bar: "bg-purple-500",   bg: "bg-purple-50 dark:bg-purple-900/30",   text: "text-purple-600 dark:text-purple-300", icon: Play },
  TRAINING_FINISHED:            { dot: "bg-green-600",    ring: "ring-green-300",   bar: "bg-green-600",    bg: "bg-green-50 dark:bg-green-900/30",     text: "text-green-600 dark:text-green-300",   icon: Trophy },
  COMPLETED:                    { dot: "bg-green-600",    ring: "ring-green-300",   bar: "bg-green-600",    bg: "bg-green-50 dark:bg-green-900/30",     text: "text-green-600 dark:text-green-300",   icon: Trophy },
};

const DEFAULT_CONFIG = { dot: "bg-muted-foreground/30", ring: "ring-muted-foreground/20", bar: "bg-muted-foreground/20", bg: "bg-muted/30", text: "text-muted-foreground", icon: Circle };

// Category header colors
const CATEGORY_COLORS: Record<WorkflowCategory, { gradient: string; badge: string }> = {
  "Training & Language": { gradient: "from-purple-500/10 to-violet-500/5", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300" },
  Ausbildung:        { gradient: "from-green-500/10 to-emerald-500/5", badge: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  "Student":         { gradient: "from-amber-500/10 to-yellow-500/5",  badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  "Opportunity Card":{ gradient: "from-rose-500/10 to-pink-500/5",     badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" },
  "Others":          { gradient: "from-gray-500/10 to-slate-500/5",    badge: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300" },
};

interface WorkflowStepperProps {
  category: WorkflowCategory;
  currentStatus: CandidateStatus | string;
  isAdmin?: boolean;
  onAdvance?: (nextStatus: string) => void;
  allowedNext?: string[];
  advancing?: boolean;
}

export function WorkflowStepper({
  category,
  currentStatus,
  isAdmin,
  onAdvance,
  allowedNext = [],
  advancing,
}: WorkflowStepperProps) {
  const steps = WORKFLOW_ORDERED_STATUSES[category] ?? [];
  const currentIdx = steps.indexOf(currentStatus as string);
  const progress = currentIdx < 0 ? 0 : Math.round(((currentIdx) / (steps.length - 1)) * 100);
  const catColors = CATEGORY_COLORS[category] ?? { gradient: "from-primary/10 to-primary/5", badge: "bg-primary/10 text-primary" };
  const currentCfg = STATUS_CONFIG[currentStatus as string] ?? DEFAULT_CONFIG;

  return (
    <div className="space-y-4">
      {/* Progress bar + status summary */}
      <div className={`flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r ${catColors.gradient} border border-border/50`}>
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full ${currentCfg.dot} shadow-sm ring-2 ring-offset-1 ${currentCfg.ring}`} />
          <div>
            <p className="text-xs text-muted-foreground">Current Status</p>
            <p className={`text-sm font-semibold ${currentCfg.text}`}>
              {formatStatusLabel(currentStatus as string)}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{currentIdx + 1} of {steps.length} steps</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-20 h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full ${currentCfg.bar} transition-all duration-500`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={`text-xs font-bold ${currentCfg.text}`}>{progress}%</span>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-start gap-0 overflow-x-auto pb-3">
        {steps.map((step, i) => {
          const isDone = i < currentIdx;
          const isCurrent = i === currentIdx;
          const isOptional = isOptionalStatus(category, step);
          const cfg = STATUS_CONFIG[step] ?? DEFAULT_CONFIG;
          const StepIcon = cfg.icon;

          return (
            <div key={step} className="flex items-center shrink-0">
              <div className="flex flex-col items-center group">
                {/* Circle */}
                <div
                  className={`relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    isDone
                      ? `${cfg.dot} border-transparent text-white shadow-sm`
                      : isCurrent
                      ? `bg-white dark:bg-gray-900 border-current ${cfg.text} shadow-md ring-4 ring-offset-1 ${cfg.ring} scale-110`
                      : isOptional
                      ? "bg-transparent border-dashed border-muted-foreground/25 text-muted-foreground/30"
                      : "bg-muted/20 border-muted-foreground/20 text-muted-foreground/30"
                  }`}
                >
                  {advancing && isCurrent ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isDone ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                  {isCurrent && (
                    <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${cfg.dot} ring-2 ring-background animate-pulse`} />
                  )}
                </div>

                {/* Label */}
                <p
                  className={`text-[10px] mt-1.5 text-center max-w-[68px] leading-tight transition-colors ${
                    isCurrent
                      ? `${cfg.text} font-bold`
                      : isDone
                      ? "text-foreground/70 font-medium"
                      : "text-muted-foreground/40"
                  } ${isOptional ? "italic" : ""}`}
                >
                  {formatStatusLabel(step)}
                  {isOptional && <span className="block not-italic text-[8px] text-muted-foreground/40">optional</span>}
                </p>
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="relative flex-shrink-0 w-8 mx-0.5 mt-[-24px]">
                  <div className="h-0.5 w-full bg-border" />
                  {i < currentIdx && (
                    <div className={`absolute inset-0 h-0.5 ${cfg.bar} transition-all duration-500`} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

