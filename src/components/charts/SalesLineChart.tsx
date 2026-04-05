"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

interface SalesLineChartProps {
  data: Array<{ period: string; revenue: number; paid: number }>;
}

function LineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl p-3 shadow-xl">
      <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-sm mb-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-bold text-gray-900">BDT {Number(p.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function SalesLineChart({ data }: SalesLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        <Tooltip content={<LineTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: "12px", fontFamily: "Inter", color: "#64748b", paddingTop: "12px" }}
          iconType="circle"
          iconSize={8}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke="#6366f1"
          strokeWidth={2.5}
          name="Revenue"
          dot={{ r: 4, fill: "#6366f1", stroke: "white", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#6366f1", stroke: "white", strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="paid"
          stroke="#10b981"
          strokeWidth={2.5}
          name="Paid"
          dot={{ r: 4, fill: "#10b981", stroke: "white", strokeWidth: 2 }}
          activeDot={{ r: 6, fill: "#10b981", stroke: "white", strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
