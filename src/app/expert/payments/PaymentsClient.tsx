"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { savePaymentPreferencesAction, submitWithdrawalRequestAction } from "@/app/actions/expert-payments";
import type { Expert, ExpertPayment, WithdrawalRequest } from "@/types";

const statusLabel: Record<string, { label: string; cls: string }> = {
  eligible: { label: "Awaiting Approval", cls: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Approved", cls: "bg-blue-100 text-blue-700" },
  paid: { label: "Paid", cls: "bg-green-100 text-green-700" },
  pending: { label: "Pending", cls: "bg-gray-100 text-gray-600" },
  disputed: { label: "Disputed", cls: "bg-red-100 text-red-700" },
};

const wStatusLabel: Record<string, { label: string; cls: string }> = {
  drafted: { label: "Drafted", cls: "bg-gray-100 text-gray-700" },
  requested: { label: "Requested", cls: "bg-yellow-100 text-yellow-700" },
  "under review": { label: "Under Review", cls: "bg-blue-100 text-blue-700" },
  approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  paid: { label: "Paid Out", cls: "bg-green-100 text-green-700" },
};

interface PaymentsClientProps {
  expert: Expert;
  dbProfile: any;
  payments: ExpertPayment[];
  withdrawalRequests: WithdrawalRequest[];
  rate: number;
}

export default function PaymentsClient({
  expert,
  dbProfile,
  payments,
  withdrawalRequests,
  rate,
}: PaymentsClientProps) {
  const [activeTab, setActiveTab] = useState<"earnings" | "withdrawals" | "preferences">("earnings");

  // Payment Preferences Form
  const [methodType, setMethodType] = useState<"bank_transfer" | "ewallet">(dbProfile?.paymentMethodType || "bank_transfer");
  const [methodDetails, setMethodDetails] = useState(dbProfile?.paymentMethodDetails || "");
  const [isSavingPrefs, startSavingPrefs] = useTransition();

  // Withdrawal Request Form
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawNotes, setWithdrawNotes] = useState("");
  const [isSubmitting, startSubmitting] = useTransition();

  // Derived Stats
  const totalEarned = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const approved = payments.filter((p) => p.status === "approved").reduce((s, p) => s + p.amount, 0);
  const eligible = payments.filter((p) => p.status === "eligible").reduce((s, p) => s + p.amount, 0);

  // Available Balance: for now we just sum approved payouts that haven't been withdrawn.
  // In a robust system, this would be accurately calculated. We'll show the approved balance here.
  const availableToWithdraw = approved;

  const handleSavePreferences = () => {
    if (!methodDetails) {
      toast.error("Please provide payment method details.");
      return;
    }
    startSavingPrefs(async () => {
      const res = await savePaymentPreferencesAction(methodType, methodDetails);
      if (res.success) {
        toast.success("Payment preferences saved successfully!");
      } else {
        toast.error(res.error || "Failed to save preferences.");
      }
    });
  };

  const handleWithdrawalRequest = () => {
    const amt = Number(withdrawAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }
    
    if (!methodDetails || methodDetails.trim() === "") {
      toast.error("Please save your payment preferences before requesting a withdrawal.");
      return;
    }

    startSubmitting(async () => {
      const res = await submitWithdrawalRequestAction(amt, "EUR", methodType, methodDetails, withdrawNotes);
      if (res.success) {
        toast.success("Withdrawal request submitted successfully!");
        setIsWithdrawOpen(false);
        setWithdrawAmount("");
        setWithdrawNotes("");
      } else {
        toast.error(res.error || "Failed to submit request.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments & Withdrawals</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your earnings, payment methods, and withdrawal requests.</p>
        </div>
        <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
          <DialogTrigger asChild>
            <Button>Request Withdrawal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Withdrawal</DialogTitle>
              <DialogDescription>
                Submit a request to SCCG Finance to withdraw your approved funds. Your current payment method is set to {methodType === "bank_transfer" ? "Bank Transfer" : "eWallet"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Amount (EUR)</Label>
                <Input 
                  type="number" 
                  placeholder="e.g. 150" 
                  value={withdrawAmount} 
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Available approved balance: €{availableToWithdraw}</p>
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input 
                  placeholder="Any additional info for finance" 
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsWithdrawOpen(false)}>Cancel</Button>
              <Button onClick={handleWithdrawalRequest} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Request"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("earnings")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "earnings" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Earnings History
        </button>
        <button
          onClick={() => setActiveTab("withdrawals")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "withdrawals" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Withdrawal Requests
        </button>
        <button
          onClick={() => setActiveTab("preferences")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "preferences" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Payment Preferences
        </button>
      </div>

      {activeTab === "earnings" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Total Paid Out</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-700">€{totalEarned}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Approved (Ready to Withdraw)</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-blue-700">€{approved}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Awaiting Approval</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-yellow-700">€{eligible}</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500 text-left">
                      <th className="pb-3 font-medium">Session</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Eligible Date</th>
                      <th className="pb-3 font-medium">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan={6} className="py-8 text-center text-gray-400">No payment records yet.</td></tr>
                    ) : (
                      payments.map((p) => {
                        const st = statusLabel[p.status] || { label: p.status, cls: "bg-gray-100 text-gray-600" };
                        return (
                          <tr key={p.id} className="border-b last:border-0">
                            <td className="py-3 font-mono text-xs">{p.sessionId}</td>
                            <td className="py-3">{p.customerName}</td>
                            <td className="py-3 font-medium">€{p.amount}</td>
                            <td className="py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                            </td>
                            <td className="py-3 text-gray-500">
                              {p.eligibleAt ? new Date(p.eligibleAt).toLocaleDateString("en-GB") : "—"}
                            </td>
                            <td className="py-3 text-gray-500">
                              {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-GB") : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "withdrawals" && (
        <Card>
          <CardHeader><CardTitle>Withdrawal Requests</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-gray-500 text-left">
                    <th className="pb-3 font-medium">Request Date</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Method</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Processed Date</th>
                  </tr>
                </thead>
                <tbody>
                  {withdrawalRequests.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">No withdrawal requests found.</td></tr>
                  ) : (
                    withdrawalRequests.map((r) => {
                      const st = wStatusLabel[r.status] || { label: r.status, cls: "bg-gray-100 text-gray-600" };
                      return (
                        <tr key={r.id} className="border-b last:border-0">
                          <td className="py-3">{new Date(r.requestedAt).toLocaleDateString("en-GB")}</td>
                          <td className="py-3 font-medium font-mono">€{r.amount}</td>
                          <td className="py-3">
                            {r.paymentMethodType === "bank_transfer" ? "Bank Transfer" : "eWallet"}
                            <span className="block text-xs text-muted-foreground truncate max-w-[200px]">{r.paymentMethodDetails}</span>
                          </td>
                          <td className="py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="py-3 text-gray-500">
                            {r.processedAt ? new Date(r.processedAt).toLocaleDateString("en-GB") : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "preferences" && (
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Payment Preferences</CardTitle>
            <CardDescription>Configure how you want to receive your SCCG honorariums (e.g. Bangladesh Bank Account, bKash, Nagad).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Method Type</Label>
              <Select value={methodType} onValueChange={(val: any) => setMethodType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="ewallet">eWallet (bKash / Nagad / etc.)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{methodType === "bank_transfer" ? "Bank Details (Bank Name, Account No, Routing/Swift)" : "eWallet Details (e.g. bKash Number)"}</Label>
              <Input 
                placeholder={methodType === "bank_transfer" ? "e.g. Dutch Bangla Bank, Acct 1234..." : "e.g. bKash: +88017..."} 
                value={methodDetails}
                onChange={(e) => setMethodDetails(e.target.value)}
              />
            </div>

            <Button onClick={handleSavePreferences} disabled={isSavingPrefs} className="mt-2">
              {isSavingPrefs ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
