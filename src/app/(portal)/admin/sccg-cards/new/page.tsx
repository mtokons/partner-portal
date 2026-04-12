"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { issueCard } from "../actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function NewSccgCardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await issueCard({
        clientId: form.get("clientId") as string,
        clientName: form.get("clientName") as string,
        clientEmail: form.get("clientEmail") as string,
        tier: form.get("tier") as "standard" | "premium" | "platinum",
        initialBalance: parseFloat(form.get("initialBalance") as string) || 0,
        currency: form.get("currency") as "BDT" | "EUR",
        notes: (form.get("notes") as string) || undefined,
      });
      router.push("/admin/sccg-cards");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue card");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Issue SCCG Card</h1>
      {error && <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>Client Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client User ID *</Label>
              <Input id="clientId" name="clientId" required placeholder="Firebase UID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name *</Label>
              <Input id="clientName" name="clientName" required placeholder="Full name" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="clientEmail">Client Email *</Label>
              <Input id="clientEmail" name="clientEmail" type="email" required placeholder="client@example.com" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Card Settings</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Card Tier *</Label>
              <Select name="tier" required>
                <SelectTrigger><SelectValue placeholder="Select tier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency *</Label>
              <Select name="currency" required>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BDT">BDT (৳)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="initialBalance">Initial Balance</Label>
              <Input id="initialBalance" name="initialBalance" type="number" min={0} placeholder="0" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} placeholder="Optional notes" />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-muted">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {loading ? "Issuing..." : "Issue Card"}
          </button>
        </div>
      </form>
    </div>
  );
}
