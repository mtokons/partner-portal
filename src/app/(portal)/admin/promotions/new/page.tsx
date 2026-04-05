"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPromotionAction } from "./actions";
import { Tag, Zap, Gift, Megaphone, ArrowLeft, Loader2, Calendar, Save } from "lucide-react";
import Link from "next/link";

const TYPES = [
  { value: "discount", label: "Discount", icon: Tag, desc: "Price reduction on products" },
  { value: "bundle", label: "Bundle", icon: Gift, desc: "Buy multiple, save more" },
  { value: "promo", label: "Promotion", icon: Zap, desc: "Flash sale or campaign" },
  { value: "announcement", label: "Announcement", icon: Megaphone, desc: "News or update banner" },
];

const APPLIES_TO = [
  { value: "all", label: "All Products" },
  { value: "category", label: "Specific Category" },
  { value: "product", label: "Specific Product" },
];

export default function NewPromotionPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "discount",
    appliesTo: "all",
    productId: "",
    category: "",
    discountType: "percent" as "percent" | "fixed",
    discountValue: 10,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    isActive: true,
    imageUrl: "",
    priority: 10,
  });
  const [error, setError] = useState("");

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await createPromotionAction({
          ...form,
          type: form.type as import("@/types").Promotion["type"],
          appliesTo: form.appliesTo as import("@/types").Promotion["appliesTo"],
          startDate: new Date(form.startDate).toISOString(),
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        });
        router.push("/admin/promotions");
      } catch (err) {
        setError(String(err));
      }
    });
  }

  return (
    <div className="space-y-7 page-enter max-w-2xl">
      {/* Header */}
      <div>
        <Link href="/admin/promotions" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Promotions
        </Link>
        <h1 className="text-3xl font-black tracking-tight">New Promotion</h1>
        <p className="text-sm text-muted-foreground mt-1.5">Create a promotion that will appear in the Sales Shop slider and on product cards.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-foreground text-sm uppercase tracking-wider text-muted-foreground">Basic Info</h2>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Title <span className="text-rose-500">*</span></label>
            <input
              required
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Spring Sale — 20% Off All Sensors"
              className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Short description shown in the slider..."
              rows={2}
              className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Image URL</label>
            <input
              value={form.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Type selector */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Promotion Type</h2>
          <div className="grid grid-cols-2 gap-3">
            {TYPES.map((t) => {
              const Icon = t.icon;
              const active = form.type === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => update("type", t.value)}
                  className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all ${
                    active ? "border-primary/40 bg-primary/5 shadow-sm" : "border-border hover:border-primary/20"
                  }`}
                >
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-primary text-white" : "bg-muted"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`font-bold text-sm ${active ? "text-primary" : "text-foreground"}`}>{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scope */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Applies To</h2>
          <div className="flex gap-2">
            {APPLIES_TO.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => update("appliesTo", a.value)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  form.appliesTo === a.value ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          {form.appliesTo === "category" && (
            <input
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              placeholder="Category name (e.g. Sensors)"
              className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
          {form.appliesTo === "product" && (
            <input
              value={form.productId}
              onChange={(e) => update("productId", e.target.value)}
              placeholder="Product ID"
              className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          )}
        </div>

        {/* Discount */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Discount Value</h2>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => update("discountType", "percent")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${form.discountType === "percent" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
            >
              Percentage (%)
            </button>
            <button
              type="button"
              onClick={() => update("discountType", "fixed")}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors ${form.discountType === "fixed" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}
            >
              Fixed Amount (BDT)
            </button>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={form.discountType === "percent" ? 100 : undefined}
              value={form.discountValue}
              onChange={(e) => update("discountValue", Number(e.target.value))}
              className="w-32 px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <span className="text-sm text-muted-foreground">{form.discountType === "percent" ? "%" : "BDT"}</span>
          </div>
        </div>

        {/* Dates + Settings */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Schedule & Settings</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                <Calendar className="h-3 w-3 inline mr-1" /> Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                <Calendar className="h-3 w-3 inline mr-1" /> End Date (optional)
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => update("endDate", e.target.value)}
                className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Priority (lower = first in slider)</label>
              <input
                type="number"
                min={1}
                value={form.priority}
                onChange={(e) => update("priority", Number(e.target.value))}
                className="w-24 px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-muted-foreground">Active</span>
              <button
                type="button"
                onClick={() => update("isActive", !form.isActive)}
                className={`relative h-7 w-12 rounded-full transition-colors ${form.isActive ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 px-4 py-3 rounded-xl border border-rose-200">{error}</p>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 shadow-lg shadow-primary/25 disabled:opacity-60"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPending ? "Creating..." : "Create Promotion"}
        </button>
      </form>
    </div>
  );
}
