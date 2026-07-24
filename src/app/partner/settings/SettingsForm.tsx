"use client";

import { useState, useRef } from "react";
import { Save, CheckCircle, Upload, X, Banknote, Loader2, ImageIcon } from "lucide-react";
import { updatePartnerProfile, savePartnerPaymentInfo } from "./actions";

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
  initialPaymentInfo?: {
    accountHolderName?: string;
    bankName?: string;
    iban?: string;
    bic?: string;
    accountNumber?: string;
    paymentNote?: string;
    bkashNumber?: string;
    nagadNumber?: string;
  } | null;
}

export default function SettingsForm({ initialData, initialPaymentInfo }: SettingsFormProps) {
  const [phone, setPhone] = useState(initialData.phone);
  const [company, setCompany] = useState(initialData.company);
  const [preferredCurrency, setPreferredCurrency] = useState(initialData.preferredCurrency || "EUR");
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl || "");
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Payment info state
  const [payAccHolder, setPayAccHolder] = useState(initialPaymentInfo?.accountHolderName || "");
  const [payBankName, setPayBankName] = useState(initialPaymentInfo?.bankName || "");
  const [payIban, setPayIban] = useState(initialPaymentInfo?.iban || "");
  const [payBic, setPayBic] = useState(initialPaymentInfo?.bic || "");
  const [payAccNumber, setPayAccNumber] = useState(initialPaymentInfo?.accountNumber || "");
  const [payNote, setPayNote] = useState(initialPaymentInfo?.paymentNote || "");
  const [payBkash, setPayBkash] = useState(initialPaymentInfo?.bkashNumber || "");
  const [payNagad, setPayNagad] = useState(initialPaymentInfo?.nagadNumber || "");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentSaved, setPaymentSaved] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError("");
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-partner-logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setLogoUrl(json.logoUrl);
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    setLogoError("");
    setLogoUrl("");
    await updatePartnerProfile({ logoUrl: "" });
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await updatePartnerProfile({ phone, company, preferredCurrency });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handlePaymentSave() {
    setPaymentSaving(true);
    setPaymentError("");
    setPaymentSaved(false);
    try {
      await savePartnerPaymentInfo({
        accountHolderName: payAccHolder || undefined,
        bankName: payBankName || undefined,
        iban: payIban || undefined,
        bic: payBic || undefined,
        accountNumber: payAccNumber || undefined,
        paymentNote: payNote || undefined,
        bkashNumber: payBkash || undefined,
        nagadNumber: payNagad || undefined,
      });
      setPaymentSaved(true);
      setTimeout(() => setPaymentSaved(false), 3000);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : "Failed to save payment info");
    } finally {
      setPaymentSaving(false);
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
        <div>
          <h2 className="font-semibold text-foreground">Partner Branding</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your logo appears on your portal dashboard, all outgoing emails, offer PDFs, and invoices.
          </p>
        </div>

        <div className="flex items-start gap-5">
          {/* Preview */}
          <div className="shrink-0">
            {logoUrl ? (
              <div className="relative">
                <div className="h-24 w-40 rounded-xl border bg-white flex items-center justify-center overflow-hidden shadow-sm">
                  <img src={logoUrl} alt="Partner logo" className="h-full w-full object-contain p-2" />
                </div>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  disabled={logoUploading}
                  className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 disabled:opacity-50"
                  title="Remove logo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="h-24 w-40 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/10 flex flex-col items-center justify-center gap-1">
                <ImageIcon className="h-7 w-7 text-muted-foreground/30" />
                <p className="text-[10px] text-muted-foreground/50">No logo</p>
              </div>
            )}
          </div>

          {/* Upload area */}
          <div className="flex-1 space-y-3">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-primary/40 text-primary text-sm font-medium hover:bg-primary/5 hover:border-primary/60 disabled:opacity-50 transition-colors w-full justify-center"
            >
              {logoUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="w-4 h-4" /> {logoUrl ? "Replace Logo" : "Upload Logo"}</>
              )}
            </button>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Accepted formats: <span className="font-medium">PNG, JPG, WEBP, SVG</span></p>
              <p>Max size: <span className="font-medium">2 MB</span></p>
              <p>Recommended: <span className="font-medium">transparent background, min 200×80 px</span></p>
            </div>
            {logoError && (
              <p className="text-xs text-red-500">{logoError}</p>
            )}
            {logoUrl && !logoUploading && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Logo uploaded — will appear in all communications
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Save Profile Button */}
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

      {/* ── Payment Information ─────────────────────────────────────── */}
      <div className="bg-card border rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-emerald-600" />
          <h2 className="font-semibold text-foreground">Payment Information</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          These details are shown to your candidates after they accept an offer, so they know where to transfer payment.
        </p>

        {paymentError && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">{paymentError}</div>
        )}
        {paymentSaved && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Payment details saved.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Account Holder Name</label>
            <input
              type="text"
              value={payAccHolder}
              onChange={(e) => setPayAccHolder(e.target.value)}
              placeholder="e.g. SCCG Career Lab GmbH"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Bank Name</label>
            <input
              type="text"
              value={payBankName}
              onChange={(e) => setPayBankName(e.target.value)}
              placeholder="e.g. Deutsche Bank"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">IBAN</label>
            <input
              type="text"
              value={payIban}
              onChange={(e) => setPayIban(e.target.value.toUpperCase())}
              placeholder="DE89 3704 0044 0532 0130 00"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">BIC / SWIFT Code</label>
            <input
              type="text"
              value={payBic}
              onChange={(e) => setPayBic(e.target.value.toUpperCase())}
              placeholder="e.g. DEUTDEDB"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Account Number (optional)</label>
            <input
              type="text"
              value={payAccNumber}
              onChange={(e) => setPayAccNumber(e.target.value)}
              placeholder="Optional local account number"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">bKash Number (optional)</label>
            <input
              type="text"
              value={payBkash}
              onChange={(e) => setPayBkash(e.target.value)}
              placeholder="e.g. 01XXXXXXXXX"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Nagad Number (optional)</label>
            <input
              type="text"
              value={payNagad}
              onChange={(e) => setPayNagad(e.target.value)}
              placeholder="e.g. 01XXXXXXXXX"
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Payment Instructions (optional)</label>
            <textarea
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              rows={3}
              placeholder="e.g. Please include the offer number as the payment reference. Transfer within 7 days of acceptance."
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handlePaymentSave}
            disabled={paymentSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            {paymentSaving ? "Saving..." : "Save Payment Details"}
          </button>
        </div>
      </div>
    </div>
  );
}

