"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type NameValue = { name: string; value: number };

const SESSION_COLORS: Record<string, string> = {
  Completed: "#10b981",
  Scheduled: "#6366f1",
  Pending: "#f59e0b",
};

const EARN_COLORS = ["#f59e0b", "#6366f1", "#10b981"];

export default function ExpertCharts({
  sessions,
  earnings,
}: {
  sessions: NameValue[];
  earnings: NameValue[];
}) {
  const totalSessions = sessions.reduce((s, d) => s + d.value, 0);
  const hasEarnings = earnings.some((e) => e.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Session Breakdown</CardTitle></CardHeader>
        <CardContent>
          {totalSessions > 0 ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={sessions} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={92} paddingAngle={2}>
                    {sessions.map((d) => <Cell key={d.name} fill={SESSION_COLORS[d.name] || "#94a3b8"} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold">{totalSessions}</span>
                <span className="text-xs text-muted-foreground">Sessions</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                {sessions.map((d) => (
                  <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: SESSION_COLORS[d.name] || "#94a3b8" }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </div>
          ) : <Empty label="No sessions yet" />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Earnings Flow</CardTitle></CardHeader>
        <CardContent>
          {hasEarnings ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={earnings}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {earnings.map((_, i) => <Cell key={i} fill={EARN_COLORS[i % EARN_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty label="No earnings yet" />}
        </CardContent>
      </Card>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">{label}</div>;
}
