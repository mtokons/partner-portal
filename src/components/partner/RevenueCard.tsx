"use client";

import { useState } from "react";
import { TrendingUp, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import SalesLineChart from "@/components/charts/SalesLineChart";
import type { Payout } from "@/types";

interface RevenueCardProps {
  payouts: Payout[];
  partnerMargin: number;
}

interface MonthlyDataPoint {
  period: string;
  revenue: number;
  paid: number;
}

export function RevenueCard({ payouts, partnerMargin }: RevenueCardProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const paidPayouts = payouts.filter((p) => p.status === "paid");
  const pendingPayouts = payouts.filter(
    (p) => p.status === "pending" || p.status === "eligible"
  );

  const totalEarnings = payouts.reduce((s, p) => s + p.net, 0);
  const totalPaid = paidPayouts.reduce((s, p) => s + p.net, 0);
  const totalPending = pendingPayouts.reduce((s, p) => s + p.net, 0);

  // Derive SCCG share estimate from partner share
  const totalGross = payouts.reduce((s, p) => s + p.gross, 0);
  const totalPartnerShare = payouts.reduce((s, p) => s + p.net, 0);
  const totalSccgShare = totalGross - totalPartnerShare;

  // Build monthly chart data from payouts
  const monthMap: Record<string, { revenue: number; paid: number }> = {};
  payouts.forEach((p) => {
    const month = p.createdAt?.slice(0, 7) || "Unknown";
    if (!monthMap[month]) monthMap[month] = { revenue: 0, paid: 0 };
    monthMap[month].revenue += p.net;
    if (p.status === "paid") monthMap[month].paid += p.net;
  });
  const chartData: MonthlyDataPoint[] = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([period, v]) => ({ period, ...v }));

  return (
    <div className="kpi-card gradient-green rounded-2xl p-6 text-white">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 opacity-80" />
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
              €{totalEarnings.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </p>
            <p className="text-white/70 text-sm mt-0.5">Total earnings</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-lg font-semibold">
                €{totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-white/70 text-xs">Paid out</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-lg font-semibold">
                €{totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
                €{totalPartnerShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-white/70 text-xs">Your share ({partnerMargin}%)</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-sm font-semibold">
                €{totalSccgShare.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-white/70 text-xs">SCCG share</p>
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
