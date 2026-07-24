"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
} from "recharts";

type NameValue = { name: string; value: number };

const STATUS_COLORS: Record<string, string> = {
  Active: "#10b981",
  Applied: "#f59e0b",
  Completed: "#6366f1",
  Dropped: "#f43f5e",
};

export default function StudentCharts({
  courseStatus,
  paid,
  due,
}: {
  courseStatus: NameValue[];
  paid: number;
  due: number;
}) {
  const totalCourses = courseStatus.reduce((s, d) => s + d.value, 0);
  const totalFee = paid + due;
  const paidPct = totalFee > 0 ? Math.round((paid / totalFee) * 100) : 0;
  const financeData = [
    { name: "Paid", value: paid },
    { name: "Due", value: due },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card className="border-0 shadow-xl rounded-[24px] bg-white/70 backdrop-blur-xl">
        <CardHeader><CardTitle className="text-base font-black">Course Status</CardTitle></CardHeader>
        <CardContent>
          {totalCourses > 0 ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={courseStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                    {courseStatus.map((d) => <Cell key={d.name} fill={STATUS_COLORS[d.name] || "#94a3b8"} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black">{totalCourses}</span>
                <span className="text-xs text-muted-foreground">Courses</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                {courseStatus.map((d) => (
                  <span key={d.name} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[d.name] || "#94a3b8" }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </div>
          ) : <Empty label="No courses yet" />}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl rounded-[24px] bg-white/70 backdrop-blur-xl">
        <CardHeader><CardTitle className="text-base font-black">Payment Progress</CardTitle></CardHeader>
        <CardContent>
          {totalFee > 0 ? (
            <div className="flex flex-col items-center justify-center h-[220px] gap-4">
              <div className="relative w-full max-w-[260px]">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={financeData} dataKey="value" nameKey="name" cx="50%" cy="100%" startAngle={180} endAngle={0} innerRadius={70} outerRadius={100}>
                      <Cell fill="#10b981" />
                      <Cell fill="#f43f5e" />
                    </Pie>
                    <Tooltip formatter={(v: number) => `৳${v.toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-x-0 bottom-1 flex flex-col items-center pointer-events-none">
                  <span className="text-2xl font-black text-green-600">{paidPct}%</span>
                  <span className="text-[11px] text-muted-foreground">Paid</span>
                </div>
              </div>
              <div className="flex gap-6 text-sm">
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Paid ৳{paid.toLocaleString()}</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Due ৳{due.toLocaleString()}</span>
              </div>
            </div>
          ) : <Empty label="No fees recorded" />}
        </CardContent>
      </Card>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">{label}</div>;
}
