"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft, DollarSign, CheckCircle2, Clock, AlertCircle,
  Search, Loader2, BookOpen, User, Filter,
} from "lucide-react";
import {
  requestTeacherWithdrawalAction,
  updateTeacherEarningPaymentAction,
} from "@/app/(portal)/admin/school/actions";
import type { TeacherEarning, TeacherEarningStatus } from "@/types";

interface Props { earnings: TeacherEarning[]; }

function statusStyle(s: TeacherEarningStatus) {
  switch (s) {
    case "eligible": return "bg-green-50 text-green-700 border-green-200";
    case "requested": return "bg-amber-50 text-amber-700 border-amber-200";
    case "paid": return "bg-blue-50 text-blue-700 border-blue-200";
    default: return "bg-gray-50 text-gray-700 border-gray-200";
  }
}

export function TeacherEarningsClient({ earnings }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<TeacherEarningStatus | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Group by teacher
  const teachers = useMemo(() => {
    const map = new Map<string, { name: string; email: string; earnings: TeacherEarning[] }>();
    earnings.forEach((e) => {
      if (!map.has(e.teacherId)) map.set(e.teacherId, { name: e.teacherName, email: e.teacherEmail, earnings: [] });
      map.get(e.teacherId)!.earnings.push(e);
    });
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [earnings]);

  const filtered = useMemo(() => {
    return earnings.filter((e) => {
      const matchSearch = !search ||
        e.teacherName.toLowerCase().includes(search.toLowerCase()) ||
        e.studentName.toLowerCase().includes(search.toLowerCase()) ||
        e.batchCode.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || e.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [earnings, search, filterStatus]);

  // Summary stats
  const totalEligible = earnings.filter((e) => e.status === "eligible").reduce((s, e) => s + e.earningAmount, 0);
  const totalRequested = earnings.filter((e) => e.status === "requested").reduce((s, e) => s + e.earningAmount, 0);
  const totalPaid = earnings.filter((e) => e.status === "paid").reduce((s, e) => s + e.earningAmount, 0);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const eligible = filtered.filter((e) => e.status === "eligible" || e.status === "requested").map((e) => e.id);
    if (selected.size === eligible.length) setSelected(new Set());
    else setSelected(new Set(eligible));
  };

  const handleMarkRequested = async () => {
    const ids = [...selected].filter((id) => earnings.find((e) => e.id === id)?.status === "eligible");
    if (!ids.length) return;
    setLoading(true); setError(null);
    try {
      await requestTeacherWithdrawalAction(ids);
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setLoading(false); }
  };

  const handleMarkPaid = async () => {
    const ids = [...selected].filter((id) => earnings.find((e) => e.id === id)?.status === "requested");
    if (!ids.length) return;
    setLoading(true); setError(null);
    try {
      await updateTeacherEarningPaymentAction(ids);
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setLoading(false); }
  };

  const selectedEligible = [...selected].filter((id) => earnings.find((e) => e.id === id)?.status === "eligible").length;
  const selectedRequested = [...selected].filter((id) => earnings.find((e) => e.id === id)?.status === "requested").length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-6 px-3 sm:px-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" className="rounded-full h-10 w-10" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-black tracking-tight">Teacher Earnings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Revenue share tracking & withdrawal management</p>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 shadow-xl rounded-[24px] bg-white/70 backdrop-blur-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-black">৳{totalEligible.toLocaleString()}</p>
              <p className="text-xs font-bold text-muted-foreground">Eligible for Withdrawal</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl rounded-[24px] bg-white/70 backdrop-blur-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black">৳{totalRequested.toLocaleString()}</p>
              <p className="text-xs font-bold text-muted-foreground">Withdrawal Requested</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-xl rounded-[24px] bg-white/70 backdrop-blur-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black">৳{totalPaid.toLocaleString()}</p>
              <p className="text-xs font-bold text-muted-foreground">Total Paid Out</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Teacher Summary Cards */}
      {teachers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teachers.map((t) => {
            const eligible = t.earnings.filter((e) => e.status === "eligible").reduce((s, e) => s + e.earningAmount, 0);
            const requested = t.earnings.filter((e) => e.status === "requested").reduce((s, e) => s + e.earningAmount, 0);
            const paid = t.earnings.filter((e) => e.status === "paid").reduce((s, e) => s + e.earningAmount, 0);
            return (
              <Card key={t.id} className="border-0 shadow-xl rounded-[24px] bg-white/70 backdrop-blur-xl">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="font-black text-sm">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-green-50">
                      <p className="text-[10px] font-black text-green-700">Eligible</p>
                      <p className="font-black text-xs text-green-700">৳{eligible.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-amber-50">
                      <p className="text-[10px] font-black text-amber-700">Requested</p>
                      <p className="font-black text-xs text-amber-700">৳{requested.toLocaleString()}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50">
                      <p className="text-[10px] font-black text-blue-700">Paid</p>
                      <p className="font-black text-xs text-blue-700">৳{paid.toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-center text-muted-foreground mt-2">{t.earnings.length} earning records</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filters + Actions */}
      <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl">
        <CardHeader className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input placeholder="Search teacher or student…" value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl" />
              </div>
              <div className="flex gap-2">
                {(["all", "pending", "eligible", "requested", "paid"] as const).map((s) => (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      filterStatus === s ? "bg-primary text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <>
                  {selectedEligible > 0 && (
                    <Button size="sm" variant="outline" onClick={handleMarkRequested} disabled={loading}
                      className="h-9 rounded-xl font-bold text-amber-700 border-amber-200 hover:bg-amber-50 gap-1.5">
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clock className="h-3.5 w-3.5" />}
                      Request Withdrawal ({selectedEligible})
                    </Button>
                  )}
                  {selectedRequested > 0 && (
                    <Button size="sm" onClick={handleMarkPaid} disabled={loading}
                      className="h-9 rounded-xl font-bold gap-1.5 bg-blue-600 hover:bg-blue-700">
                      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Mark Paid ({selectedRequested})
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
          {error && <p className="text-xs text-red-600 font-bold mt-2">{error}</p>}
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <DollarSign className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="font-bold">No earnings found</p>
              <p className="text-sm">Earnings are calculated when a batch is marked as completed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="py-3 px-4">
                    <input type="checkbox" className="rounded accent-primary"
                      checked={selected.size > 0 && selected.size === filtered.filter((e) => e.status !== "paid").length}
                      onChange={toggleAll} />
                  </th>
                  <th className="text-left py-3 px-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Teacher</th>
                  <th className="text-left py-3 px-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Batch / Course</th>
                  <th className="text-left py-3 px-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Student</th>
                  <th className="text-right py-3 px-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Gross</th>
                  <th className="text-right py-3 px-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Share %</th>
                  <th className="text-right py-3 px-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Earning</th>
                  <th className="text-left py-3 px-4 font-black uppercase tracking-widest text-[10px] text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className={`border-b hover:bg-white/40 transition-colors ${selected.has(e.id) ? "bg-primary/5" : ""}`}>
                    <td className="py-3 px-4">
                      {e.status !== "paid" && (
                        <input type="checkbox" className="rounded accent-primary"
                          checked={selected.has(e.id)} onChange={() => toggleSelect(e.id)} />
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-black text-sm">{e.teacherName}</p>
                      <p className="text-[10px] text-muted-foreground">{e.teacherEmail}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold">{e.courseName}</p>
                      <p className="text-[10px] font-mono text-primary/70">{e.batchCode}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-sm">{e.studentName}</p>
                    </td>
                    <td className="py-3 px-4 text-right font-bold">৳{e.grossAmount.toLocaleString()}</td>
                    <td className="py-3 px-4 text-right font-bold text-primary">{e.revenueSharePercent}%</td>
                    <td className="py-3 px-4 text-right font-black text-primary">৳{e.earningAmount.toLocaleString()}</td>
                    <td className="py-3 px-4">
                      <Badge className={`text-[9px] font-bold border capitalize ${statusStyle(e.status)}`}>
                        {e.status}
                      </Badge>
                      {e.processedAt && (
                        <p className="text-[9px] text-muted-foreground mt-0.5">{e.processedAt.split("T")[0]}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
