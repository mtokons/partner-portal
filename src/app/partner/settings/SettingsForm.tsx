"use client";

import { useState } from "react";
import { Save, CheckCircle, Upload, X } from "lucide-react";
import { updatePartnerProfile } from "./actions";

const SUPPORTED_CURRENCIES = [
  { code: "EUR", label: "€ EUR – Euro" },
  { code: "BDT", label: "৳ BDT – Bangladeshi Taka" },
  { code: "INR", label: "₹ INR – Indian Rupee" },
  { code: "USD", label: "$ USD – US Dollar" },
  { code: "GBP", label: "£ GBP – British Pound" },
  { code: "AED", label: "د.إ AED – UAE Dirham" },
  { code: "SAR", label: "﷼ SAR – Saudi Riyal" },
  { code: "MYR", label: "RM MYR – Malaysian Ringgit" },
  { code: "PKR", label: "₨ PKR – Pakistani Rupee" },
  { code: "LKR", label: "Rs LKR – Sri Lankan Rupee" },
  { code: "NPR", label: "₨ NPR – Nepalese Rupee" },
  { code: "TRY", label: "₺ TRY – Turkish Lira" },
];

interface SettingsFormProps {
  initialData: {
    name: string;
    email: string;
    company: string;
    phone: string;
    partnerType: string;
    partnerCode: string;
    preferredCurrency?: string;
    logoUrl?: string;
  };
}

export default function SettingsForm({ initialData }: SettingsFormProps) {
  const [phone, setPhone] = useState(initialData.phone);
  const [company, setCompany] = useState(initialData.company);
  const [preferredCurrency, setPreferredCurrency] = useState(initialData.preferredCurrency || "EUR");
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updatePartnerProfile({ phone, company, preferredCurrency, logoUrl: logoUrl || undefined });
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
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Preferred Currency</label>
            <select
              value={preferredCurrency}
              onChange={(e) => setPreferredCurrency(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              Amounts will be shown in EUR + your preferred currency.
            </p>
          </div>
        </div>
      </div>

      {/* Partner Branding */}
      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold text-foreground">Partner Branding</h2>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Partner Logo</label>
          <div className="flex items-start gap-4">
            {logoUrl ? (
              <div className="relative">
                <div className="h-16 w-16 rounded-xl border bg-white flex items-center justify-center overflow-hidden">
                  <img src={logoUrl} alt="Partner logo" className="h-full w-full object-contain" />
                </div>
                <button
                  onClick={() => setLogoUrl("")}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                  title="Remove logo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="h-16 w-16 rounded-xl border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                <Upload className="h-5 w-5 text-muted-foreground/40" />
              </div>
            )}
            <div className="flex-1">
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Enter a URL for your company logo. It will appear on your dashboard beside your partner badge.
              </p>
            </div>
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
