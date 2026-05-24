"use client";

import { useState } from "react";
import { Save, CheckCircle } from "lucide-react";
import { updatePartnerProfile } from "./actions";

interface SettingsFormProps {
  initialData: {
    name: string;
    email: string;
    company: string;
    phone: string;
    partnerType: string;
    partnerCode: string;
  };
}

export default function SettingsForm({ initialData }: SettingsFormProps) {
  const [phone, setPhone] = useState(initialData.phone);
  const [company, setCompany] = useState(initialData.company);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updatePartnerProfile({ phone, company });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{error}</div>
      )}

      {saved && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          Settings saved successfully.
        </div>
      )}

      {/* Profile Information */}
      <div className="bg-card border rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold text-foreground">Profile Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Full Name</label>
            <input
              type="text"
              value={initialData.name}
              disabled
              className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Contact admin to change your name.</p>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Email</label>
            <input
              type="email"
              value={initialData.email}
              disabled
              className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+49 123 456 7890"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Read-only Partner Details */}
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Partner Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Partner Type</label>
            <input
              type="text"
              value={initialData.partnerType}
              disabled
              className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed capitalize"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Partner Code</label>
            <input
              type="text"
              value={initialData.partnerCode || "Not assigned"}
              disabled
              className="w-full rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed font-mono"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
