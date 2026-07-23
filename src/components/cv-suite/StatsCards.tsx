"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatCardData {
  label: string;
  value: number | string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  color?: "blue" | "emerald" | "violet" | "amber" | "rose" | "cyan";
}

const COLOR_MAP = {
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    icon: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200/50 dark:border-blue-800/30",
  },
  emerald: {
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    icon: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200/50 dark:border-emerald-800/30",
  },
  violet: {
    bg: "bg-violet-50 dark:bg-violet-950/30",
    icon: "text-violet-600 dark:text-violet-400",
    border: "border-violet-200/50 dark:border-violet-800/30",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    icon: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200/50 dark:border-amber-800/30",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    icon: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200/50 dark:border-rose-800/30",
  },
  cyan: {
    bg: "bg-cyan-50 dark:bg-cyan-950/30",
    icon: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-200/50 dark:border-cyan-800/30",
  },
};

export function StatsCards({ stats }: { stats: StatCardData[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const colors = COLOR_MAP[stat.color ?? "blue"];
        const TrendIcon =
          stat.trend === "up"
            ? TrendingUp
            : stat.trend === "down"
            ? TrendingDown
            : Minus;
        return (
          <div
            key={stat.label}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5",
              colors.bg,
              colors.border
            )}
          >
            {/* Decorative circle */}
            <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-current opacity-[0.04]" />
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold text-foreground tracking-tight">
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString()
                    : stat.value}
                </p>
                {stat.trendValue && (
                  <div className="flex items-center gap-1">
                    <TrendIcon
                      className={cn(
                        "w-3 h-3",
                        stat.trend === "up"
                          ? "text-emerald-500"
                          : stat.trend === "down"
                          ? "text-rose-500"
                          : "text-muted-foreground"
                      )}
                    />
                    <span className="text-[11px] text-muted-foreground">
                      {stat.trendValue}
                    </span>
                  </div>
                )}
              </div>
              <div
                className={cn(
                  "p-2.5 rounded-xl bg-white/80 dark:bg-white/5 shadow-sm",
                  colors.icon
                )}
              >
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
