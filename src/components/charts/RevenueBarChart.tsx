"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from "recharts";

interface RevenueBarChartProps {
  data: Array<{ period: string; income: number; expenses: number; profit: number }>;
}

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl p-3 shadow-xl min-w-[160px]">
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm mb-1">
          <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: p.fill }} />
          <span className="text-gray-600 capitalize">{p.name}:</span>
          <span className="font-bold text-gray-900 ml-auto">{(Number(p.value) / 1000).toFixed(1)}K</span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueBarChart({ data }: RevenueBarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "Inter" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "Inter" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
          width={36}
        />
        <Tooltip content={<BarTooltip />} cursor={{ fill: "rgba(99,102,241,0.04)", radius: 8 }} />
        <Legend
          wrapperStyle={{ fontSize: "12px", fontFamily: "Inter", color: "#64748b", paddingTop: "12px" }}
          iconType="square"
          iconSize={8}
        />
        <Bar dataKey="income" name="Income" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={32} />
        <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={32} />
        <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
