"use client";
import { useEffect, useState } from "react";
import { CommissionLedgerEntry } from "@/types";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { fetchCommissionsForCurrentUser } from "./actions";

export default function CommissionsClient() {
  const [commissions, setCommissions] = useState<CommissionLedgerEntry[]>([]);

  useEffect(() => {
    fetchCommissionsForCurrentUser().then(setCommissions);
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">My Commission Ledger</h2>
      <Separator className="mb-4" />
      <div className="grid gap-4">
        {commissions.length === 0 && (
          <div className="text-muted-foreground">No commission entries found.</div>
        )}
        {commissions.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="font-semibold">{c.description}</div>
            <div>Amount: <span className={c.amount >= 0 ? "text-green-600" : "text-red-600"}>{c.amount} {c.currency}</span></div>
            <div>Type: {c.entryType.replace(/commission-|payout-/, "").replace(/-/g, " ")}</div>
            <div>Order: {c.orderNumber || c.salesOrderId || "-"}</div>
            <div>Date: {new Date(c.createdAt).toLocaleString()}</div>
            <div>Balance after: {c.runningBalance} {c.currency}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}
