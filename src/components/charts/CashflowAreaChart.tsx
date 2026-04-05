"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface CashflowAreaChartProps {
  data: Array<{ period: string; revenue: number; paid: number }>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl p-3 shadow-xl">
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold text-gray-900">BDT {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function CashflowAreaChart({ data }: CashflowAreaChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
          </linearGradient>
          <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
          </linearGradient>
        </defs>
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
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "12px", fontFamily: "Inter", color: "#64748b", paddingTop: "12px" }}
          iconType="circle"
          iconSize={8}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#6366f1"
          strokeWidth={2.5}
          fill="url(#gradRevenue)"
          name="Revenue"
          dot={false}
          activeDot={{ r: 5, fill: "#6366f1", stroke: "white", strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="paid"
          stroke="#10b981"
          strokeWidth={2.5}
          fill="url(#gradPaid)"
          name="Paid"
          dot={false}
          activeDot={{ r: 5, fill: "#10b981", stroke: "white", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
