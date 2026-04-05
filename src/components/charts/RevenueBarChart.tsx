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
    <div className="glass shadow-2xl rounded-2xl p-4 min-w-[170px] border-white/40 animate-in fade-in zoom-in duration-200">
      <p className="text-[10px] font-black text-primary/60 mb-2 uppercase tracking-[0.1em]">{label}</p>
      <div className="space-y-2">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded shadow-[0_0_8px_currentcolor]" style={{ backgroundColor: p.fill }} />
              <span className="text-xs font-medium text-muted-foreground capitalize">{p.name}</span>
            </div>
            <span className="text-xs font-black text-foreground">BDT {(Number(p.value) / 1000).toFixed(1)}K</span>
          </div>
        ))}
      </div>
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
        <Bar dataKey="income" name="Income" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={1500} />
        <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={1500} />
        <Bar dataKey="profit" name="Profit" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={1500} />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="square"
          iconSize={8}
          wrapperStyle={{
            paddingBottom: "24px",
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
