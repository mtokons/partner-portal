"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface OrderStatusPieChartProps {
  data: Array<{ name: string; value: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   "#f59e0b",
  confirmed: "#6366f1",
  shipped:   "#8b5cf6",
  delivered: "#10b981",
  cancelled: "#f43f5e",
};

const DEFAULT_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e"];

function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div className="glass shadow-2xl rounded-2xl p-4 min-w-[140px] border-white/40 animate-in fade-in zoom-in duration-200">
      <p className="text-[10px] font-black text-primary/60 mb-1 uppercase tracking-[0.1em]">{name}</p>
      <p className="text-sm font-black text-foreground">{value} <span className="text-[10px] font-medium text-muted-foreground uppercase opacity-70 ml-1">Orders</span></p>
    </div>
  );
}

export default function OrderStatusPieChart({ data }: OrderStatusPieChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <defs>
            {data.map((_, i) => {
              const color = STATUS_COLORS[_.name] || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
              return (
                <radialGradient key={i} id={`rg-${i}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                </radialGradient>
              );
            })}
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={`url(#rg-${index})`}
              />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
          {/* Center text */}
          <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 26, fontWeight: 900, fill: "#0f172a", fontFamily: "Outfit, sans-serif" }}>
            {total}
          </text>
          <text x="50%" y="56%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: "#94a3b8", fontFamily: "Inter, sans-serif" }}>
            Total
          </text>
        </PieChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <div className="w-full space-y-2 mt-1">
        {data.map((entry, i) => {
          const color = STATUS_COLORS[entry.name] || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
          return (
            <div key={entry.name} className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-xs capitalize text-muted-foreground flex-1">{entry.name}</span>
              <span className="text-xs font-bold text-foreground">{entry.value}</span>
              <span className="text-xs text-muted-foreground/60 w-8 text-right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
