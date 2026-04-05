"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addExpenseAction } from "./actions";
import { Plus } from "lucide-react";

const categories = ["Shipping", "Marketing", "Office", "Travel", "Software", "Utilities", "Other"];

export default function AddExpenseButton({ partnerId }: { partnerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ category: "", amount: "", description: "", date: new Date().toISOString().slice(0, 10) });

  async function handleSubmit() {
    setLoading(true);
    await addExpenseAction({ partnerId, category: form.category, amount: parseFloat(form.amount), description: form.description, date: form.date });
    setLoading(false);
    setOpen(false);
    setForm({ category: "", amount: "", description: "", date: new Date().toISOString().slice(0, 10) });
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <span className={cn(buttonVariants({ variant: "default", size: "default" }), "inline-flex items-center justify-center") }>
          <Plus className="h-4 w-4 mr-2" /> Add Expense
        </span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log Expense</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v ?? "" })}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Amount (€)</Label><Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <Button onClick={handleSubmit} disabled={loading || !form.category || !form.amount} className="w-full">
            {loading ? "Adding..." : "Log Expense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
