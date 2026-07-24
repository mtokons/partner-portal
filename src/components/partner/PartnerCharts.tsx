"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

export type NameValue = { name: string; value: number };

const PAYMENT_COLORS: Record<string, string> = {
  "fully-paid": "#10b981",
  "deposit-paid": "#6366f1",
  pending: "#f59e0b",
  refunded: "#f43f5e",
};

const OFFER_COLORS: Record<string, string> = {
  accepted: "#10b981",
  sent: "#6366f1",
  draft: "#94a3b8",
  rejected: "#f43f5e",
};

const WORKFLOW_PALETTE = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#a855f7", "#f43f5e", "#0ea5e9"];

function prettify(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PartnerCharts({
  paymentStatus,
  offerStatus,
  workflowMix,
}: {
  paymentStatus: NameValue[];
  offerStatus: NameValue[];
  workflowMix: NameValue[];
}) {
  const hasAny = paymentStatus.length || offerStatus.length || workflowMix.length;
  if (!hasAny) return null;

  const totalCandidates = paymentStatus.reduce((s, d) => s + d.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Candidate payment status donut */}
      <Card>
        <CardHeader><CardTitle className="text-base">Candidate Payment Status</CardTitle></CardHeader>
        <CardContent>
          {paymentStatus.length ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {paymentStatus.map((d) => (
                      <Cell key={d.name} fill={PAYMENT_COLORS[d.name] || "#6366f1"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, n: string) => [v, prettify(n)]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold">{totalCandidates}</span>
                <span className="text-xs text-muted-foreground">Candidates</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                {paymentStatus.map((d) => (
                  <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: PAYMENT_COLORS[d.name] || "#6366f1" }} />
                    {prettify(d.name)} ({d.value})
                  </span>
                ))}
              </div>
            </div>
          ) : <Empty />}
        </CardContent>
      </Card>

      {/* Offer funnel */}
      <Card>
        <CardHeader><CardTitle className="text-base">Offer Pipeline</CardTitle></CardHeader>
        <CardContent>
          {offerStatus.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={offerStatus.map((d) => ({ ...d, label: prettify(d.name) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {offerStatus.map((d) => (
                    <Cell key={d.name} fill={OFFER_COLORS[d.name] || "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </CardContent>
      </Card>

      {/* Workflow mix */}
      <Card>
        <CardHeader><CardTitle className="text-base">Candidates by Service Line</CardTitle></CardHeader>
        <CardContent>
          {workflowMix.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={workflowMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={{ fontSize: 11 }}>
                  {workflowMix.map((d, i) => (
                    <Cell key={d.name} fill={WORKFLOW_PALETTE[i % WORKFLOW_PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </CardContent>
      </Card>
    </div>
  );
}

function Empty() {
  return <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>;
}
