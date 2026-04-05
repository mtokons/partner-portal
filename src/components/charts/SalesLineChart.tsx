"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface SalesLineChartProps {
  data: Array<{ period: string; revenue: number; paid: number }>;
}

function LineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass shadow-2xl rounded-2xl p-4 min-w-[160px] border-white/40 animate-in fade-in zoom-in duration-200">
      <p className="text-[10px] font-black text-primary/60 mb-2 uppercase tracking-[0.1em]">{label}</p>
      <div className="space-y-2">
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full shadow-[0_0_8px_currentcolor]" style={{ backgroundColor: p.color }} />
              <span className="text-xs font-medium text-muted-foreground">{p.name}</span>
            </div>
            <span className="text-xs font-black text-foreground">BDT {Number(p.value).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SalesLineChart({ data }: SalesLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="salesRev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="salesPaid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
          width={40}
        />
        <Tooltip content={<LineTooltip />} cursor={{ stroke: "rgba(99,102,241,0.2)", strokeWidth: 2 }} />
        <Legend
          verticalAlign="top"
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{
            paddingBottom: "24px",
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#6366f1"
          strokeWidth={3}
          fill="url(#salesRev)"
          name="Revenue"
          animationDuration={1500}
          activeDot={{ r: 6, fill: "#6366f1", stroke: "white", strokeWidth: 2, className: "shadow-lg" }}
        />
        <Area
          type="monotone"
          dataKey="paid"
          stroke="#10b981"
          strokeWidth={3}
          fill="url(#salesPaid)"
          name="Paid"
          animationDuration={1500}
          activeDot={{ r: 6, fill: "#10b981", stroke: "white", strokeWidth: 2, className: "shadow-lg" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
