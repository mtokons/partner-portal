"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Plus, BookOpen, Loader2 } from "lucide-react";
import { createLanguageCourseAction } from "@/app/admin/school/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Custom"];

export function AddCourseDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    level: "A1",
    sessionsCount: "",
    retailPriceEur: "",
    retailPriceBdt: "",
    isAvailable: true,
  });

  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Course name is required"); return; }
    if (!form.retailPriceEur && !form.retailPriceBdt) {
      toast.error("At least one price (EUR or BDT) is required"); return;
    }
    try {
      setSaving(true);
      await createLanguageCourseAction({
        name: form.name.trim(),
        sku: form.sku.trim(),
        description: form.description.trim(),
        level: form.level,
        sessionsCount: Number(form.sessionsCount) || 0,
        retailPriceEur: Number(form.retailPriceEur) || 0,
        retailPriceBdt: Number(form.retailPriceBdt) || 0,
        isAvailable: form.isAvailable,
      });
      toast.success(`Course "${form.name}" added to the Products catalogue`);
      setOpen(false);
      setForm({ name: "", sku: "", description: "", level: "A1", sessionsCount: "", retailPriceEur: "", retailPriceBdt: "", isAvailable: true });
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="rounded-xl h-10 px-5 shadow-lg shadow-primary/20">
        <Plus className="h-4 w-4 mr-2" /> Add Course
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Add New Language Course
            </DialogTitle>
            <DialogDescription>
              Creates a new entry in the Products catalogue under <strong>Training &amp; Language</strong> category.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Course Name *</label>
                <Input
                  placeholder="e.g. German Language Course A1"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">SKU / Code</label>
                <Input
                  placeholder="e.g. LANG-DE-A1"
                  value={form.sku}
                  onChange={(e) => set("sku", e.target.value.toUpperCase())}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Language Level</label>
                <select
                  value={form.level}
                  onChange={(e) => set("level", e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Description</label>
                <Input
                  placeholder="Short description of the course..."
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Price (EUR) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">€</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.retailPriceEur}
                    onChange={(e) => set("retailPriceEur", e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Price (BDT)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">৳</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={form.retailPriceBdt}
                    onChange={(e) => set("retailPriceBdt", e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">No. of Sessions</label>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 24"
                  value={form.sessionsCount}
                  onChange={(e) => set("sessionsCount", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Availability</label>
                <select
                  value={form.isAvailable ? "true" : "false"}
                  onChange={(e) => set("isAvailable", e.target.value === "true")}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="true">Available</option>
                  <option value="false">Unavailable</option>
                </select>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
              This will add the course to the SharePoint Products list under <strong>Training &amp; Language</strong> category. It will appear in batch creation and enrollment forms immediately.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : <><Plus className="h-4 w-4 mr-2" /> Create Course</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
