"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import type { Partner, TierStatus, PartnerMargin, PartnerType } from "@/types";
import { savePartnerAction } from "./actions";

const TIERS: TierStatus[]    = ["Silver", "Gold", "Diamond", "Platinum"];
const MARGINS: PartnerMargin[] = [8, 15, 20, 25];
const TYPES: PartnerType[]   = ["individual", "institutional"];
const CURRENCIES              = ["EUR", "USD", "GBP", "BDT", "SAR", "AED"];

interface Field { label: string; children: React.ReactNode }
function F({ label, children }: Field) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

const input = "w-full rounded-xl border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";
const select = "w-full rounded-xl border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none";

export default function EditPartnerClient({ partner }: { partner: Partner }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name:              partner.name || "",
    email:             partner.email || "",
    company:           partner.company || "",
    phone:             partner.phone || "",
    partnerType:       (partner.partnerType || "individual") as PartnerType,
    tierStatus:        (partner.tierStatus || "Silver") as TierStatus,
    marginPercentage:  (partner.marginPercentage ?? 8) as PartnerMargin,
    status:            (partner.status || "active") as "active" | "pending" | "suspended",
    preferredCurrency: partner.preferredCurrency || "EUR",
    salesTarget:       partner.salesTarget ?? "",
  });

  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaved(false);
    startTransition(async () => {
      try {
        const res = await savePartnerAction(partner.id, {
          name:             form.name.trim(),
          email:            form.email.trim(),
          company:          form.company.trim(),
          phone:            form.phone.trim(),
          partnerType:      form.partnerType,
          tierStatus:       form.tierStatus,
          marginPercentage: Number(form.marginPercentage) as PartnerMargin,
          status:           form.status,
          preferredCurrency: form.preferredCurrency,
          salesTarget:      form.salesTarget !== "" ? Number(form.salesTarget) : undefined,
        });
        if (res.success) {
          setSaved(true);
          setTimeout(() => router.push("/admin/partners"), 800);
        } else {
          setError(res.error || "Failed to save");
        }
      } catch (err: any) {
        setError(err?.message || "An unexpected error occurred");
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/partners" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Partners
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Edit Partner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update partner profile, tier, commission, and status for <strong>{partner.name}</strong>.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Saved! Redirecting…
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
        {/* ── Profile ──────────────────────────────────────────────── */}
        <fieldset className="space-y-4">
          <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Profile</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Full Name *">
              <input required value={form.name} onChange={(e) => set("name", e.target.value)}
                className={input} placeholder="Full name" />
            </F>
            <F label="Email *">
              <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)}
                className={input} placeholder="email@example.com" />
            </F>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Company">
              <input value={form.company} onChange={(e) => set("company", e.target.value)}
                className={input} placeholder="Company name" />
            </F>
            <F label="Phone">
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)}
                className={input} placeholder="+49 …" />
            </F>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Partner Type">
              <select value={form.partnerType} onChange={(e) => set("partnerType", e.target.value as PartnerType)} className={select}>
                {TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </F>
            <F label="Preferred Currency">
              <select value={form.preferredCurrency} onChange={(e) => set("preferredCurrency", e.target.value)} className={select}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </F>
          </div>
        </fieldset>

        {/* ── Tier / commission ─────────────────────────────────────── */}
        <fieldset className="space-y-4 border-t pt-4">
          <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Tier &amp; Commission</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <F label="Tier Status">
              <select value={form.tierStatus} onChange={(e) => set("tierStatus", e.target.value as TierStatus)} className={select}>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </F>
            <F label="Commission / Margin %">
              <select value={String(form.marginPercentage)} onChange={(e) => set("marginPercentage", Number(e.target.value) as PartnerMargin)} className={select}>
                {MARGINS.map((m) => <option key={m} value={String(m)}>{m}%</option>)}
              </select>
            </F>
          </div>
          <F label="Monthly Sales Target (EUR)">
            <input type="number" min="0" step="100" value={form.salesTarget}
              onChange={(e) => set("salesTarget", e.target.value)}
              placeholder="e.g. 5000" className={input} />
          </F>
        </fieldset>

        {/* ── Status ───────────────────────────────────────────────── */}
        <fieldset className="space-y-3 border-t pt-4">
          <legend className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Status</legend>
          <div className="flex flex-wrap gap-3">
            {(["active", "pending", "suspended"] as const).map((s) => (
              <label key={s} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-all
                ${form.status === s ? "border-primary bg-primary/5 text-primary" : "hover:border-muted-foreground/40"}`}>
                <input type="radio" name="status" value={s} checked={form.status === s}
                  onChange={() => set("status", s)} className="accent-primary" />
                {s}
              </label>
            ))}
          </div>
        </fieldset>

        {/* ── Actions ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 border-t pt-4">
          <Link href="/admin/partners"
            className="rounded-xl border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
            Cancel
          </Link>
          <button type="submit" disabled={pending || saved}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow hover:opacity-90 disabled:opacity-50">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
