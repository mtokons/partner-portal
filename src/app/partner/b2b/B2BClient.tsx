"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { Building2, Plus, Phone, Mail, Globe, MapPin, User, Briefcase, FileText, X, CheckCircle2, Clock, AlertCircle, Upload, ExternalLink, Download, Hash, CreditCard, PenLine, Award, QrCode, ShieldCheck, ImageIcon, Loader2 } from "lucide-react";
import type { B2BCompany, Partner } from "@/types";
import { addB2BCompanyAction, updateB2BStatusAction, generateB2BCertificateAction } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof CheckCircle2 }> = {
  active:   { bg: "bg-emerald-100 text-emerald-800 border-emerald-200", text: "Active",  icon: CheckCircle2 },
  pending:  { bg: "bg-amber-100 text-amber-800 border-amber-200",       text: "Pending", icon: Clock },
  inactive: { bg: "bg-gray-100 text-gray-600 border-gray-200",          text: "Inactive",icon: AlertCircle },
};

const INDUSTRIES = [
  "Technology", "Education", "Healthcare", "Finance", "Manufacturing",
  "Retail", "Hospitality", "Logistics", "Construction", "Consulting",
  "NGO / Non-Profit", "Government", "Other",
];

interface Props {
  myCompanies: B2BCompany[];
  allCompanies: B2BCompany[];
  partner: Partner;
  isAdmin?: boolean;
}

export default function B2BClient({ myCompanies: initial, allCompanies, partner, isAdmin }: Props) {
  const [myCompanies, setMyCompanies] = useState<B2BCompany[]>(initial);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAllModal, setShowAllModal] = useState(false);
  const [showCertTemplateModal, setShowCertTemplateModal] = useState(false);
  // B2B logo upload state (for Add Company form)
  const [b2bLogoUrl, setB2bLogoUrl] = useState("");
  const [b2bLogoUploading, setB2bLogoUploading] = useState(false);
  const [b2bLogoError, setB2bLogoError] = useState("");
  const b2bLogoInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"my" | "all">("my");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Certificate modal state
  type CertData = {
    certCode: string; certIssuedAt: string;
    partnerName: string; partnerCity: string; partnerLogoUrl?: string;
    subPartnerName: string; subPartnerCity: string; subPartnerIndustry?: string; subPartnerLogoUrl?: string;
    verifyUrl: string;
  };
  const [certData, setCertData] = useState<CertData | null>(null);
  const [certCompanyId, setCertCompanyId] = useState<string>("");
  const [certLoading, setCertLoading] = useState(false);

  async function handleB2bLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setB2bLogoError("");
    setB2bLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-b2b-logo", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      setB2bLogoUrl(json.logoUrl);
    } catch (err) {
      setB2bLogoError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setB2bLogoUploading(false);
      if (b2bLogoInputRef.current) b2bLogoInputRef.current.value = "";
    }
  }

  const handleGenerateCertificate = useCallback(async (companyId: string) => {
    setError("");
    setSuccessMsg("");
    setCertLoading(true);
    setCertCompanyId(companyId);
    try {
      const res = await generateB2BCertificateAction(companyId);
      if (res.success) {
        setCertData(res.data);
        setSuccessMsg("Certificate of Cooperation issued successfully.");
        // Update local state with the new certCode
        setMyCompanies((prev) => prev.map((c) => c.id === companyId
          ? { ...c, certCode: res.data.certCode, certIssuedAt: res.data.certIssuedAt }
          : c
        ));
      } else {
        setError(res.error || "Failed to issue certificate. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to issue certificate. Please try again.");
    } finally {
      setCertLoading(false);
      setCertCompanyId("");
    }
  }, []);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    const form = e.currentTarget;
    const fd = new FormData(form);

    startTransition(async () => {
      const res = await addB2BCompanyAction(fd);
      if (res.success) {
        setMyCompanies((prev) => [res.data, ...prev]);
        setSuccessMsg(`B2B company "${res.data.companyName}" added successfully!`);
        setShowAddModal(false);
        form.reset();
      } else {
        setError(res.error || "Failed to add company.");
      }
    });
  };

  const handleStatusChange = async (id: string, status: B2BCompany["status"]) => {
    startTransition(async () => {
      const res = await updateB2BStatusAction(id, status);
      if (res.success) {
        setMyCompanies((prev) => prev.map((c) => c.id === id ? { ...c, status } : c));
      }
    });
  };

  const stats = {
    total: myCompanies.length,
    active: myCompanies.filter((c) => c.status === "active").length,
    pending: myCompanies.filter((c) => c.status === "pending").length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">My B2B Network</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Manage your B2B partnerships and corporate clients. Add companies and upload signed B2B agreements.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button
              onClick={() => setShowCertTemplateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 text-sm font-medium text-amber-700 hover:bg-amber-100 transition-colors"
            >
              <Award className="w-4 h-4" />
              Certificate Template
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add B2B Company
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-black">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total B2B Companies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active Partnerships</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-amber-600">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Awaiting Agreement</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/60">
        {[
          { id: "my" as const, label: `My B2B Companies (${myCompanies.length})` },
          { id: "all" as const, label: `All Partner B2B (${allCompanies.length})` },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* My B2B Tab */}
      {activeTab === "my" && (
        <div>
          {myCompanies.length === 0 ? (
            <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-semibold text-foreground">No B2B companies yet</p>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Add your first B2B corporate client to start building your network.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add B2B Company
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {myCompanies.map((company) => (
                <B2BCard
                  key={company.id}
                  company={company}
                  isOwn
                  onStatusChange={handleStatusChange}
                  onGenerateCertificate={handleGenerateCertificate}
                  certGenerating={certLoading && certCompanyId === company.id}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* All B2B Tab */}
      {activeTab === "all" && (
        <div>
          {allCompanies.length === 0 ? (
            <div className="text-center py-16 bg-card border border-dashed rounded-2xl">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No B2B companies across the network yet.</p>
            </div>
          ) : (
          <div className="bg-card rounded-2xl border overflow-hidden">
              <div className="px-5 py-3 border-b bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Showing all associate partner organisations across the SCCG network. Only organisation name and city are shown to protect partner privacy.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Organisation</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">City</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Industry</th>
                      <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {allCompanies.map((c) => {
                      const st = STATUS_STYLES[c.status] || STATUS_STYLES.pending;
                      // Extract city from address if not explicitly set
                      const cityDisplay = c.city || (() => {
                        if (!c.address) return "—";
                        const parts = c.address.split(",").map((p) => p.trim()).filter(Boolean);
                        return parts.length >= 2 ? parts[parts.length - 2] : parts[parts.length - 1] || "—";
                      })();
                      return (
                        <tr key={c.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Building2 className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <p className="font-semibold text-foreground">{c.companyName}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {cityDisplay}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{c.industry || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${st.bg}`}>
                              {st.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Add B2B Company Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-lg font-bold">Add B2B Company</h2>
                <p className="text-sm text-muted-foreground">Register a new B2B corporate partner — details will be used in the Certificate of Cooperation</p>
              </div>
              <button onClick={() => { setShowAddModal(false); setError(""); }}
                className="rounded-lg p-1.5 hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-5 space-y-5">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* ── Company Details Section ── */}
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Company Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Legal Company Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input name="companyName" required placeholder="e.g. EduQuest Global Ltd."
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Legal Entity Type</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select name="entityType"
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none appearance-none">
                        <option value="">Select type...</option>
                        <option>GmbH</option><option>UG</option><option>AG</option>
                        <option>Ltd.</option><option>LLC</option><option>Sole Proprietorship</option>
                        <option>Partnership</option><option>NGO</option><option>Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Registration / License No.</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input name="registrationNumber" placeholder="e.g. HRB 194679 or TRAD/DSCC/..."
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Industry</label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select name="industry"
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none appearance-none">
                        <option value="">Select industry...</option>
                        {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Website</label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input name="website" type="url" placeholder="https://company.com"
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Organisation Logo <span className="text-xs text-muted-foreground font-normal">(optional — shown on Certificate)</span></label>
                    {/* Hidden input to carry the resolved URL */}
                    <input type="hidden" name="logoUrl" value={b2bLogoUrl} readOnly />
                    {b2bLogoUrl ? (
                      <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-xl">
                        <img src={b2bLogoUrl} alt="Logo preview" className="h-12 w-auto object-contain rounded border bg-white p-1" onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">Logo uploaded</p>
                          <p className="text-[10px] text-muted-foreground truncate">{b2bLogoUrl.split("/").pop()}</p>
                        </div>
                        <button type="button" onClick={() => setB2bLogoUrl("")} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => b2bLogoInputRef.current?.click()}
                        className="cursor-pointer border-2 border-dashed border-border rounded-xl p-4 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      >
                        {b2bLogoUploading ? (
                          <><Loader2 className="w-6 h-6 text-primary animate-spin" /><p className="text-xs text-muted-foreground">Uploading…</p></>
                        ) : (
                          <><ImageIcon className="w-6 h-6 text-muted-foreground/50" /><p className="text-xs text-muted-foreground">Click to upload PNG, JPG or WebP (max 2 MB)</p></>
                        )}
                      </div>
                    )}
                    <input
                      ref={b2bLogoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleB2bLogoUpload}
                    />
                    {b2bLogoError && <p className="text-xs text-red-500 mt-1">{b2bLogoError}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Displayed alongside SCCG and your logo on the Certificate of Cooperation.</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1.5">Full Registered Address <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <textarea name="address" required rows={2} placeholder="Street, City, Postal Code, Country"
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Authorized Representative Section ── */}
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Authorized Representative (for MoU signing)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Full Name <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input name="contactPerson" required placeholder="Full name of signatory"
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Title / Designation</label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input name="designation" placeholder="e.g. CEO, Director, Manager"
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Contact Number <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input name="contactNumber" required placeholder="+49 30 123456" type="tel"
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input name="email" type="email" placeholder="contact@company.com"
                        className="w-full pl-9 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Digital Signature Option ── */}
              <div className="border border-violet-200 bg-violet-50 dark:bg-violet-950/20 dark:border-violet-800 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-violet-800 dark:text-violet-300 flex items-center gap-2">
                  <PenLine className="w-4 h-4" />
                  Digital Signature Option (Optional)
                </p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" name="digitalSignature" value="yes"
                    className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30" />
                  <div>
                    <p className="text-sm text-foreground font-medium">Accept digital / e-signature for this MoU</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      If checked, both parties may sign the MoU digitally (e.g. via email confirmation, DocuSign, or typed name). Physical signature is still recommended for full legal compliance.
                    </p>
                  </div>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1.5">Internal Notes (optional)</label>
                <textarea name="notes" rows={2} placeholder="Any additional notes about this B2B partner..."
                  className="w-full px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none" />
              </div>

              {/* Agreement info */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300">
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">Agreement Required</p>
                    <p className="mt-0.5">After adding the company, an admin can issue a Certificate of Cooperation. Get it signed and upload the signed copy to activate the partnership.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShowAddModal(false); setError(""); }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors">
                  {isPending ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Adding...</>
                  ) : (
                    <><Plus className="w-4 h-4" /> Add Company</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Certificate of Cooperation Template Modal (super-admin only) ── */}
      {showCertTemplateModal && (
        <CertificateTemplateModal onClose={() => setShowCertTemplateModal(false)} partnerName={partner.company || partner.name} />
      )}

      {/* ── Certificate of Cooperation Modal ── */}
      {certData && (
        <CertificateModal
          certData={certData}
          onClose={() => setCertData(null)}
        />
      )}
    </div>
  );
}

// ─── Certificate of Cooperation Modal ─────────────────────────────────────

type CertModalData = {
  certCode: string; certIssuedAt: string;
  partnerName: string; partnerCity: string; partnerLogoUrl?: string;
  subPartnerName: string; subPartnerCity: string; subPartnerIndustry?: string; subPartnerLogoUrl?: string;
  verifyUrl: string;
};

function CertificateModal({ certData: d, onClose }: { certData: CertModalData; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const { generateCooperationCertificate } = await import("@/lib/pdf");

      // Get QR code as data URL from the hidden canvas
      let qrDataUrl: string | undefined;
      const qrCanvas = document.getElementById("cert-qr-canvas") as HTMLCanvasElement | null;
      if (qrCanvas) {
        qrDataUrl = qrCanvas.toDataURL("image/png");
      }

      const pdfBytes = generateCooperationCertificate({
        certCode: d.certCode,
        issuedAt: d.certIssuedAt,
        partnerName: d.partnerName,
        partnerCity: d.partnerCity,
        subPartnerName: d.subPartnerName,
        subPartnerCity: d.subPartnerCity,
        subPartnerIndustry: d.subPartnerIndustry,
        qrDataUrl,
      });

      // pdfBytes is actually a Blob from doc.output("blob")
      const blob = pdfBytes instanceof Blob ? pdfBytes : new Blob([pdfBytes as unknown as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Certificate_of_Cooperation_${d.certCode}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-slate-900 p-5 rounded-t-2xl relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold">Certificate of Cooperation</h2>
                <p className="text-slate-300 text-xs">Partnership certificate issued</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10 transition-colors text-white/60 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Clean certificate preview (mirrors the PDF) */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center space-y-3 shadow-sm">
            {/* Logo row */}
            <div className="flex items-center justify-center gap-6 pb-2 text-[11px] font-bold text-slate-700">
              <span>SCCG</span>
              <span className="text-slate-300">|</span>
              <span className="truncate max-w-[90px]">{d.partnerName}</span>
              <span className="text-slate-300">|</span>
              <span className="truncate max-w-[90px]">{d.subPartnerName}</span>
            </div>

            <h3 className="text-base font-black uppercase tracking-wide text-slate-900">
              Certificate of Cooperation
            </h3>

            <p className="text-xs text-slate-600">This is to certify that</p>
            <p className="text-lg font-bold text-slate-900 leading-tight">{d.partnerName}</p>
            <p className="text-[11px] font-semibold text-slate-700">(Regional Partner of SCCG Career Lab Germany)</p>
            <p className="text-xs font-bold text-slate-900">AND</p>
            <p className="text-base font-bold text-slate-900 leading-tight">{d.subPartnerName}</p>
            <p className="text-[11px] text-slate-600 px-2">
              have established an official cooperation for academic and professional collaboration.
            </p>

            <p className="text-[10px] text-slate-500 px-3 leading-relaxed">
              This partnership reflects their joint commitment to supporting candidate identification,
              preparation, and participation in international career development programs under SCCG Career
              Lab Germany. This cooperation is non-commercial in nature.
            </p>

            <p className="text-xs text-slate-800 pt-1">
              Issued on:{" "}
              <span className="font-semibold">
                {new Date(d.certIssuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </p>

            {/* Signatures */}
            <div className="flex justify-between gap-4 pt-4 text-left">
              <div className="flex-1">
                <div className="border-t border-slate-400 pt-1" />
                <p className="text-[10px] text-slate-600">Authorized Signatory</p>
                <p className="text-[10px] font-bold text-slate-800 truncate">{d.partnerName}</p>
              </div>
              <div className="flex-1">
                <div className="border-t border-slate-400 pt-1" />
                <p className="text-[10px] text-slate-600">Authorized Signatory</p>
                <p className="text-[10px] font-bold text-slate-800 truncate">{d.subPartnerName}</p>
              </div>
            </div>

            {/* Verification */}
            <div className="flex flex-col items-center gap-1 pt-2 border-t border-slate-100">
              <div className="bg-white p-1.5 rounded-lg border border-slate-200">
                <QRCodeSVG value={d.verifyUrl} size={56} level="M" />
              </div>
              <p className="text-[9px] text-slate-500">Scan to verify</p>
              <p className="text-[9px] font-mono text-slate-600">{d.certCode}</p>
            </div>
          </div>

          {/* Verification info */}
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Verifiable Online</p>
              <a href={d.verifyUrl} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-emerald-700 dark:text-emerald-400 hover:underline font-mono break-all">
                {d.verifyUrl}
              </a>
            </div>
          </div>

          {/* Hidden canvas for PDF QR generation */}
          <div className="sr-only" aria-hidden>
            <QRCodeCanvas id="cert-qr-canvas" value={d.verifyUrl} size={200} level="M" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 disabled:opacity-60 transition-all shadow-md"
            >
              {downloading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
              ) : (
                <><Download className="w-4 h-4" /> Download PDF</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Certificate of Cooperation — Blank Printable Template (admin-only) ───

function CertificateTemplateModal({ onClose, partnerName }: { onClose: () => void; partnerName: string }) {
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-3xl max-h-[93vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-slate-900 p-5 rounded-t-2xl relative overflow-hidden print:hidden">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                <Award className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-white font-bold">Certificate of Cooperation — Template</h2>
                <p className="text-slate-300 text-xs">Print or save as PDF</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10 transition-colors text-white/60 hover:text-white print:hidden">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable certificate document — clean, matches official template */}
        <div id="cert-template-doc" className="p-10 bg-white text-slate-900 text-center font-serif">
          {/* Logo row */}
          <div className="flex items-center justify-center gap-8 text-sm font-bold text-slate-700 mb-8">
            <span>SCCG</span>
            <span className="text-slate-300">|</span>
            <span>{partnerName}</span>
            <span className="text-slate-300">|</span>
            <span>Institute</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-black uppercase tracking-wide mb-8">Certificate of Cooperation</h1>

          {/* Body */}
          <p className="text-base mb-4">This is to certify that</p>
          <p className="text-2xl font-bold mb-1">{partnerName}</p>
          <p className="text-sm font-semibold mb-3">(Regional Partner of SCCG Career Lab Germany)</p>
          <p className="text-base font-bold mb-3">AND</p>
          <p className="text-xl font-bold mb-4">
            <span className="inline-block border-b border-slate-400 min-w-[200px]">&nbsp;</span>
            <span className="block text-xs font-normal text-slate-500 mt-1">(Institute name)</span>
          </p>
          <p className="text-base mb-6">have established an official cooperation for academic and professional collaboration.</p>

          <p className="text-sm text-slate-600 max-w-2xl mx-auto leading-relaxed mb-10">
            This partnership reflects their joint commitment to supporting candidate identification, preparation,
            and participation in international career development programs under SCCG Career Lab Germany. This
            cooperation is non-commercial in nature and is based on mutual collaboration for educational and
            career advancement purposes.
          </p>

          {/* Issued on */}
          <p className="text-base mb-12">
            Issued on: <span className="inline-block border-b border-slate-400 min-w-[160px] text-center">{today}</span>
          </p>

          {/* Signatures */}
          <div className="flex justify-between gap-10 mt-12 text-left">
            <div className="flex-1">
              <div className="border-b border-slate-800 mb-1 h-8" />
              <p className="text-sm">Authorized Signatory</p>
              <p className="text-sm font-bold">{partnerName}</p>
            </div>
            <div className="flex-1">
              <div className="border-b border-slate-800 mb-1 h-8" />
              <p className="text-sm">Authorized Signatory</p>
              <p className="text-sm font-bold">Institute</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-5 border-t flex items-center gap-3 justify-end print:hidden">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            Close
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-all shadow-md">
            <Download className="w-4 h-4" />
            Print / Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Individual B2B Company Card ───────────────────────────────────────────

interface CardProps {
  company: B2BCompany;
  isOwn?: boolean;
  onStatusChange?: (id: string, status: B2BCompany["status"]) => void;
  onGenerateCertificate?: (id: string) => void;
  certGenerating?: boolean;
}

function B2BCard({ company: c, isOwn, onStatusChange, onGenerateCertificate, certGenerating }: CardProps) {
  const st = STATUS_STYLES[c.status] || STATUS_STYLES.pending;
  const StIcon = st.icon;
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadUrl, setUploadUrl] = useState(c.agreementUrl || "");

  return (
    <div className="bg-card rounded-2xl border hover:shadow-md transition-all flex flex-col">
      <div className="p-5 flex-1 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground leading-tight">{c.companyName}</p>
              {c.industry && <p className="text-xs text-muted-foreground">{c.industry}</p>}
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 ${st.bg}`}>
            <StIcon className="w-2.5 h-2.5" />
            {st.text}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-foreground">{c.contactPerson}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">{c.contactNumber}</span>
          </div>
          {c.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a href={`mailto:${c.email}`} className="text-primary hover:underline text-xs">{c.email}</a>
            </div>
          )}
          {c.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground text-xs">{c.address}</span>
            </div>
          )}
          {c.website && (
            <div className="flex items-center gap-2 text-sm">
              <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <a href={c.website} target="_blank" rel="noopener noreferrer"
                className="text-primary hover:underline text-xs truncate">{c.website}</a>
            </div>
          )}
          {c.notes && (
            <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs text-muted-foreground italic">
              {c.notes}
            </div>
          )}
        </div>

        {/* Agreement */}
        <div className="border-t pt-3">
          {c.agreementUrl ? (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Agreement on file
              </span>
              <a href={c.agreementUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" /> View
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <Clock className="w-3.5 h-3.5" /> Agreement pending
              </span>
              {isOwn && (
                <button
                  onClick={() => setShowUpload(true)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Upload className="w-3 h-3" /> Upload
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground">
          Added {new Date(c.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          {c.partnerName && ` · ${c.partnerName}`}
        </p>
      </div>

      {/* Status change buttons (own companies only) */}
      {isOwn && onStatusChange && (
        <div className="border-t px-4 py-3 flex items-center gap-2">
          {c.status !== "active" && (
            <button onClick={() => onStatusChange(c.id, "active")}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200">
              Mark Active
            </button>
          )}
          {c.status !== "inactive" && (
            <button onClick={() => onStatusChange(c.id, "inactive")}
              className="flex-1 py-1.5 text-xs font-semibold rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200">
              Deactivate
            </button>
          )}
        </div>
      )}

      {/* Certificate of Cooperation */}
      {isOwn && onGenerateCertificate && (
        <div className="border-t px-4 py-3">
          {c.certCode ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <Award className="w-3.5 h-3.5" />
                <span>Certificate issued</span>
              </div>
              <button
                onClick={() => onGenerateCertificate(c.id)}
                disabled={certGenerating}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                Re-issue
              </button>
            </div>
          ) : (
            <button
              onClick={() => onGenerateCertificate(c.id)}
              disabled={certGenerating}
              className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-xs font-bold hover:from-amber-600 hover:to-yellow-600 disabled:opacity-60 transition-all shadow-sm"
            >
              {certGenerating ? (
                <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
              ) : (
                <><Award className="w-3.5 h-3.5" /> Issue Certificate of Cooperation</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Upload Agreement Modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Upload Signed Agreement</h3>
              <button onClick={() => setShowUpload(false)} className="rounded-lg p-1.5 hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Paste the URL of the signed B2B agreement (SharePoint, Google Drive, etc.)
            </p>
            <input
              type="url"
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              placeholder="https://sharepoint.com/... or https://drive.google.com/..."
              className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none"
            />
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowUpload(false)}
                className="px-4 py-2 text-sm text-muted-foreground hover:bg-muted rounded-xl">
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!uploadUrl) return;
                  setUploading(true);
                  const res = await updateB2BStatusAction(c.id, "active", uploadUrl);
                  if (res.success && onStatusChange) {
                    onStatusChange(c.id, "active");
                    c.agreementUrl = uploadUrl;
                  }
                  setUploading(false);
                  setShowUpload(false);
                }}
                disabled={uploading || !uploadUrl}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-60">
                {uploading ? "Saving..." : "Save Agreement"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
