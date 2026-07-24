"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Bell, CheckCircle, Users, Search, Filter, Mail } from "lucide-react";
import { sendPaymentReminderAction } from "@/app/(portal)/admin/school/actions";
import type { SchoolEnrollment, SchoolBatch } from "@/types";

interface StudentsPageClientProps {
  enrollments: SchoolEnrollment[];
  batches: SchoolBatch[];
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-100 text-green-700 border-green-200",
  partial: "bg-amber-100 text-amber-700 border-amber-200",
  unpaid: "bg-red-100 text-red-700 border-red-200",
  refunded: "bg-gray-100 text-gray-600 border-gray-200",
};

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700",
  enrolled: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  "on-hold": "bg-amber-100 text-amber-700",
  dropped: "bg-red-100 text-red-700",
  applied: "bg-purple-100 text-purple-700",
};

export function StudentsPageClient({ enrollments: allEnrollments, batches }: StudentsPageClientProps) {
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [reminderStates, setReminderStates] = useState<Record<string, "idle" | "sending" | "sent" | "error">>({});
  const [, startTransition] = useTransition();

  // Filter enrollments
  const filtered = allEnrollments.filter((e) => {
    const matchSearch =
      !search ||
      e.studentName.toLowerCase().includes(search.toLowerCase()) ||
      e.studentEmail.toLowerCase().includes(search.toLowerCase()) ||
      e.batchCode.toLowerCase().includes(search.toLowerCase()) ||
      e.sccgId.toLowerCase().includes(search.toLowerCase());
    const matchBatch = batchFilter === "all" || e.batchId === batchFilter;
    const matchPayment = paymentFilter === "all" || e.paymentStatus === paymentFilter;
    return matchSearch && matchBatch && matchPayment;
  });

  function handleReminder(enrollment: SchoolEnrollment) {
    setReminderStates((prev) => ({ ...prev, [enrollment.id]: "sending" }));
    startTransition(async () => {
      try {
        const result = await sendPaymentReminderAction(enrollment.id);
        setReminderStates((prev) => ({ ...prev, [enrollment.id]: "sent" }));
        setTimeout(() => {
          setReminderStates((prev) => ({ ...prev, [enrollment.id]: "idle" }));
        }, 5000);
        console.log("Reminder sent to:", result.sentTo, result.isPartnerReminder ? "(partner)" : "(student)");
      } catch (err) {
        console.error("Reminder failed:", err);
        setReminderStates((prev) => ({ ...prev, [enrollment.id]: "error" }));
        setTimeout(() => {
          setReminderStates((prev) => ({ ...prev, [enrollment.id]: "idle" }));
        }, 4000);
      }
    });
  }

  // Stats
  const totalUnpaid = allEnrollments.filter((e) => e.paymentStatus === "unpaid").length;
  const totalPartial = allEnrollments.filter((e) => e.paymentStatus === "partial").length;
  const totalPaid = allEnrollments.filter((e) => e.paymentStatus === "paid").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">All Students</h1>
        <p className="text-muted-foreground text-sm font-medium">{allEnrollments.length} total enrollments across all batches</p>
      </div>

      {/* KPI Pills */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-50 border border-red-100 text-red-700">
          <div className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-sm font-black">{totalUnpaid} Unpaid</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700">
          <div className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-sm font-black">{totalPartial} Partial</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-green-50 border border-green-100 text-green-700">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-sm font-black">{totalPaid} Paid</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, batch code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
        <Select value={batchFilter} onValueChange={setBatchFilter}>
          <SelectTrigger className="rounded-xl h-11 w-full sm:w-[220px]">
            <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by batch" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Batches</SelectItem>
            {batches.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.batchCode} — {b.courseName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="rounded-xl h-11 w-full sm:w-[180px]">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="unpaid">Unpaid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-2xl rounded-[32px] overflow-hidden bg-white/60 backdrop-blur-xl border border-white/20">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50">
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Student</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Batch</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Course</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Status</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Payment</th>
                <th className="text-left py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Amount Due</th>
                <th className="text-right py-4 px-6 font-black uppercase tracking-widest text-[10px] text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => {
                const amountDue = e.amountRemaining ?? (e.netFee - (e.amountPaid || 0));
                const reminderState = reminderStates[e.id] || "idle";
                const canSendReminder = e.paymentStatus !== "paid" && e.paymentStatus !== "refunded";

                return (
                  <tr key={e.id} className="border-b hover:bg-white/40 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-[12px] bg-primary/10 flex items-center justify-center text-sm font-black text-primary">
                          {e.studentName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-gray-900">{e.studentName}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <p className="text-[11px] text-muted-foreground">{e.studentEmail}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-mono text-xs font-bold text-primary/70">{e.batchCode}</p>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-700 text-xs">{e.courseName}</p>
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        className={`text-[10px] font-black capitalize border px-2 py-0.5 rounded-md ${ENROLLMENT_STATUS_COLORS[e.status] || "bg-gray-100 text-gray-600"}`}
                        variant="outline"
                      >
                        {e.status}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        className={`text-[10px] font-black capitalize border px-2 py-0.5 rounded-md ${PAYMENT_STATUS_COLORS[e.paymentStatus] || "bg-gray-100 text-gray-600"}`}
                        variant="outline"
                      >
                        {e.paymentStatus}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      {amountDue > 0 ? (
                        <span className="font-black text-red-600">৳{amountDue.toLocaleString()}</span>
                      ) : (
                        <span className="font-bold text-green-600 text-xs">Cleared</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {canSendReminder && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReminder(e)}
                          disabled={reminderState === "sending" || reminderState === "sent"}
                          className={`rounded-xl text-xs font-bold h-8 gap-1.5 ${
                            reminderState === "sent"
                              ? "border-green-300 text-green-600 bg-green-50"
                              : reminderState === "error"
                              ? "border-red-300 text-red-600 bg-red-50"
                              : "hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50"
                          }`}
                        >
                          {reminderState === "sending" ? (
                            <span className="flex items-center gap-1">
                              <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                              Sending...
                            </span>
                          ) : reminderState === "sent" ? (
                            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Sent</span>
                          ) : reminderState === "error" ? (
                            "Failed — Retry"
                          ) : (
                            <span className="flex items-center gap-1"><Bell className="h-3 w-3" /> Remind</span>
                          )}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-16 w-16 bg-gray-50 rounded-[22px] flex items-center justify-center">
                        <Users className="h-7 w-7 text-gray-300" />
                      </div>
                      <p className="text-gray-400 font-medium italic">
                        {allEnrollments.length === 0 ? "No students enrolled yet." : "No students match your filters."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
