"use client";

import { Users, CheckCircle, Clock, XCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { Candidate } from "@/types";

interface CandidateStatsCardProps {
  candidates: Candidate[];
}

export function CandidateStatsCard({ candidates }: CandidateStatsCardProps) {
  const total = candidates.length;
  const active = candidates.filter(
    (c) => !c.isOnHold && c.currentStatus !== "COMPLETED" && c.currentStatus !== "TRAINING_FINISHED"
  ).length;
  const successful = candidates.filter(
    (c) => c.currentStatus === "COMPLETED" || c.currentStatus === "TRAINING_FINISHED"
  ).length;
  const pending = candidates.filter(
    (c) =>
      (c.currentStatus === "REGISTERED" ||
        c.currentStatus === "DOCUMENTS_UNDER_REVIEW") &&
      !c.isOnHold
  ).length;
  const dropouts = candidates.filter((c) => c.isOnHold).length;

  const stats = [
    {
      label: "Total Active",
      value: active,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Successful",
      value: successful,
      icon: CheckCircle,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Pending Review",
      value: pending,
      icon: Clock,
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
    },
    {
      label: "Drop-outs",
      value: dropouts,
      icon: XCircle,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-900/20",
    },
  ];

  return (
    <div className="bg-card rounded-2xl border p-6 card-hover">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Current Active Candidates</h3>
        </div>
        <span className="text-sm text-muted-foreground">{total} total</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className={`${stat.bg} rounded-xl p-3`}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <Link
        href="/partner/candidates"
        className="mt-4 flex items-center justify-center text-sm text-primary hover:underline"
      >
        View all candidates →
      </Link>
    </div>
  );
}
