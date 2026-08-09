"use client";

import { useState } from "react";
import { Euro, ChevronDown, ChevronUp } from "lucide-react";
import SalesLineChart from "@/components/charts/SalesLineChart";
import type { Payout, Candidate } from "@/types";

const CSYM: Record<string, string> = {
  EUR: "€", BDT: "৳", INR: "₹", USD: "$", GBP: "£",
  AED: "د.إ", SAR: "﷼", MYR: "RM", PKR: "₨", TRY: "₺",
};

interface RevenueCardProps {
  payouts: Payout[];
  candidates: Candidate[];
  partnerMargin: number;
  secondaryCurrency?: string;
  exchangeRate?: number;
}

interface MonthlyDataPoint {
  period: string;
  revenue: number;
  paid: number;
}

export function RevenueCard({ payouts, candidates, partnerMargin }: RevenueCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const d = (v: number) => `€${v.toLocaleString("en", { minimumFractionDigits: 0 })}`;

  // Primary revenue source: candidates' partnerShare (always has data)
  const totalPartnerShare = candidates.reduce((s, c) => s + (c.partnerShare || 0), 0);
  const totalSccgShare = candidates.reduce((s, c) => s + (c.sccgShare || 0), 0);
  const totalGrossFromCandidates = candidates.reduce((s, c) => s + (c.totalServiceFee || 0), 0);

  // Payouts: track how much has actually been paid out
  const paidPayouts = payouts.filter((p) => p.status === "paid");
  const pendingPayouts = payouts.filter((p) => p.status === "pending" || p.status === "eligible");
  const totalPaidOut = paidPayouts.reduce((s, p) => s + p.net, 0);
  const totalPendingPayout = pendingPayouts.reduce((s, p) => s + p.net, 0);

  // Total earnings = partnerShare from candidates (actual earned revenue)
  const totalEarnings = totalPartnerShare > 0 ? totalPartnerShare
    : payouts.reduce((s, p) => s + p.net, 0);

  // How much is paid = paidOut payouts, or fallback to depositAmount from fully-paid candidates
  const fullyPaidCandidateShare = candidates
    .filter((c) => c.paymentStatus === "fully-paid")
    .reduce((s, c) => s + (c.partnerShare || 0), 0);
  const totalPaid = totalPaidOut > 0 ? totalPaidOut : fullyPaidCandidateShare;
  const totalPending = totalEarnings - totalPaid;

  // Build monthly chart data from candidates' registrations
  const monthMap: Record<string, { revenue: number; paid: number }> = {};
  candidates.forEach((c) => {
    const month = (c.createdAt || c.submittedAt || "").slice(0, 7) || "Unknown";
    if (month === "Unknown") return;
    if (!monthMap[month]) monthMap[month] = { revenue: 0, paid: 0 };
    monthMap[month].revenue += c.partnerShare || 0;
    if (c.paymentStatus === "fully-paid") monthMap[month].paid += c.partnerShare || 0;
  });
  // Also incorporate payout data into monthly chart
  payouts.forEach((p) => {
    const month = (p.createdAt || "").slice(0, 7) || "Unknown";
    if (month === "Unknown") return;
    if (!monthMap[month]) monthMap[month] = { revenue: 0, paid: 0 };
    if (totalPartnerShare === 0) monthMap[month].revenue += p.net;
    if (p.status === "paid" && totalPaidOut > 0) monthMap[month].paid += p.net;
  });
  const chartData: MonthlyDataPoint[] = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([period, v]) => ({ period, ...v }));

  return (
    <div className="kpi-card gradient-green rounded-2xl p-6 text-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <Euro className="w-5 h-5 opacity-80" />
          <span className="font-semibold text-base">My Revenue</span>
        </div>
        <button
          onClick={() => setShowBreakdown((v) => !v)}
          className="flex items-center gap-1 text-xs bg-white/20 hover:bg-white/30 rounded-lg px-2.5 py-1 transition-colors"
        >
          {showBreakdown ? "Summary" : "Breakdown"}
          {showBreakdown ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>
      </div>

      {!showBreakdown ? (
        <div className="space-y-4">
          <div>
            <p className="text-3xl font-bold">
              {d(totalEarnings)}
            </p>
            <p className="text-white/70 text-sm mt-0.5">Total earnings</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-lg font-semibold">
                {d(totalPaid)}
              </p>
              <p className="text-white/70 text-xs">Paid out</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-lg font-semibold">
                {d(totalPending)}
              </p>
              <p className="text-white/70 text-xs">Pending</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-sm font-semibold">
                {d(totalPartnerShare)}
              </p>
              <p className="text-white/70 text-xs">Your share ({partnerMargin}%)</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-sm font-semibold">
                {d(totalSccgShare)}
              </p>
              <p className="text-white/70 text-xs">SCCG share</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 col-span-2">
              <p className="text-sm font-semibold">
                {d(totalGrossFromCandidates)}
              </p>
              <p className="text-white/70 text-xs">Total gross (all candidates)</p>
            </div>
          </div>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mt-4 -mx-2">
          <SalesLineChart data={chartData} />
        </div>
      )}
    </div>
  );
}
