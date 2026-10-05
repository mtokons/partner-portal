"use client";

import { useState, useTransition, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  FileText,
  CreditCard,
  Package,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Edit2,
  Save,
  Trash2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { CustomerUnifiedRecord } from "./actions";
import { updateCustomerAction, deleteCustomerAction } from "./actions";

interface CustomerDetailDrawerProps {
  customer: CustomerUnifiedRecord | null;
  onClose: () => void;
  onCustomerUpdated?: () => void;
  initialEditMode?: boolean;
}

export default function CustomerDetailDrawer({
  customer,
  onClose,
  onCustomerUpdated,
  initialEditMode = false,
}: CustomerDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "services" | "payments">("profile");
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable Form State
  const [editForm, setEditForm] = useState({
    fullName: customer?.fullName || "",
    email: customer?.email || "",
    phone: customer?.phone || "",
    nationality: customer?.nationality || "",
    country: customer?.country || "",
    address: customer?.address || "",
    passportNumber: customer?.passportNumber || "",
    nationalId: customer?.nationalId || "",
    paymentStatus: customer?.paymentStatus || "pending",
    notes: customer?.notes || "",
  });

  useEffect(() => {
    setIsEditing(initialEditMode);
    if (customer) {
      setEditForm({
        fullName: customer.fullName || "",
        email: customer.email || "",
        phone: customer.phone || "",
        nationality: customer.nationality || "",
        country: customer.country || "",
        address: customer.address || "",
        passportNumber: customer.passportNumber || "",
        nationalId: customer.nationalId || "",
        paymentStatus: customer.paymentStatus || "pending",
        notes: customer.notes || "",
      });
    }
  }, [customer, initialEditMode]);

  if (!customer) return null;

  const handleSave = () => {
    setErrorMessage(null);
    startSaving(async () => {
      const res = await updateCustomerAction(customer.id, {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone,
        nationality: editForm.nationality,
        country: editForm.country,
        address: editForm.address,
        passportNumber: editForm.passportNumber,
        nationalId: editForm.nationalId,
        paymentStatus: editForm.paymentStatus as any,
        notes: editForm.notes,
      });

      if (res.success) {
        setIsEditing(false);
        if (onCustomerUpdated) onCustomerUpdated();
      } else {
        setErrorMessage(res.error || "Failed to update customer details.");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete customer "${customer.fullName}"? This action cannot be undone.`)) {
      return;
    }
    setErrorMessage(null);
    startDeleting(async () => {
      const res = await deleteCustomerAction(customer.id);
      if (res.success) {
        onClose();
        if (onCustomerUpdated) onCustomerUpdated();
      } else {
        setErrorMessage(res.error || "Failed to delete customer.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="flex h-full w-full max-w-2xl flex-col bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-border p-5 bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
              {customer.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground truncate">{customer.fullName}</h2>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary font-mono">
                  {customer.sccgId}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                    customer.source === "sccg"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                  }`}
                >
                  {customer.source === "sccg" ? "Direct SCCG" : customer.partnerName || "Partner Referred"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{customer.email} • {customer.phone || "No phone"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                Edit Profile
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Changes
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-muted/10 px-5">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "profile"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-4 w-4" />
            Personal & ID Profile
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "services"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Package className="h-4 w-4" />
            Purchased Services ({customer.services.length})
          </button>
          <button
            onClick={() => setActiveTab("payments")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "payments"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard className="h-4 w-4" />
            Financial & Payment Status
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-foreground">Full Name</label>
                    <input
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Email Address</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Phone Number</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Nationality</label>
                    <input
                      type="text"
                      value={editForm.nationality}
                      onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Country</label>
                    <input
                      type="text"
                      value={editForm.country}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Passport Number</label>
                    <input
                      type="text"
                      value={editForm.passportNumber}
                      onChange={(e) => setEditForm({ ...editForm, passportNumber: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">National ID / NID</label>
                    <input
                      type="text"
                      value={editForm.nationalId}
                      onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1 font-mono"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-foreground">Residential Address</label>
                    <input
                      type="text"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-foreground">Admin Notes</label>
                    <textarea
                      rows={3}
                      value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1 py-2"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Identity Grid */}
                  <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Identification & Personal Data
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Customer ID</span>
                        <span className="font-mono font-bold text-foreground">{customer.sccgId}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Nationality</span>
                        <span className="font-medium text-foreground">{customer.nationality}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Country of Residence</span>
                        <span className="font-medium text-foreground">{customer.country}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Passport Number</span>
                        <span className="font-mono font-medium text-foreground">{customer.passportNumber || "Not recorded"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">National ID (NID)</span>
                        <span className="font-mono font-medium text-foreground">{customer.nationalId || "Not recorded"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Registered On</span>
                        <span className="font-medium text-foreground">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Contact Information
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground font-medium">{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground font-medium">{customer.phone || "No phone number available"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-foreground font-medium">{customer.address || "No address provided"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Source Attribution */}
                  <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Registration Source
                    </h3>
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-primary shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground">
                          {customer.source === "sccg" ? "Direct SCCG Customer" : `Referred by Partner: ${customer.partnerName}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {customer.source === "sccg"
                            ? "Acquired directly through SCCG Career Lab Germany"
                            : `Registered through external B2B partner network (${customer.partnerName})`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {customer.notes && (
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-1">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Notes</h3>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{customer.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PURCHASED SERVICES */}
          {activeTab === "services" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Service Catalog & History</h3>
                  <p className="text-xs text-muted-foreground">All educational and career services purchased by this customer.</p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-md bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                    {customer.runningServices} Running
                  </span>
                  <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {customer.completedServices} Completed
                  </span>
                </div>
              </div>

              {customer.services.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Package className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-xs font-semibold text-foreground">No individual service line items recorded</p>
                  <p className="text-[11px] text-muted-foreground">
                    Workflow category: {customer.workflowCategory}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {customer.services.map((svc, idx) => {
                    const st = (svc.currentStatus || "REGISTERED").toUpperCase();
                    const isDone = st.includes("COMPLETE") || st.includes("DONE") || st.includes("FINISHED");
                    return (
                      <div
                        key={svc.id || idx}
                        className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-foreground">{svc.serviceName}</span>
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                  isDone
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                }`}
                              >
                                {svc.currentStatus || "Running"}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Package Type: {svc.packageType || "All-Inclusive"} • Quantity: {svc.quantity || 1}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-foreground">€{Number(svc.totalPrice || svc.basePrice || 0).toLocaleString()}</span>
                            <p className="text-[10px] text-muted-foreground">{svc.createdAt ? new Date(svc.createdAt).toLocaleDateString() : "—"}</p>
                          </div>
                        </div>

                        {/* Visual Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isDone ? "bg-emerald-500 w-full" : "bg-blue-500 w-2/3"}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FINANCIALS & PAYMENT MONITORING */}
          {activeTab === "payments" && (
            <div className="space-y-5">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Total Service Fee</span>
                  <span className="text-base font-bold text-foreground mt-1 block">
                    €{customer.totalServiceFee.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Deposit / Paid</span>
                  <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    €{customer.depositAmount.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Outstanding Due</span>
                  <span className="text-base font-bold text-amber-600 dark:text-amber-400 mt-1 block">
                    €{customer.dueAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Payment Status Badge */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Payment Status</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase ${
                      customer.paymentStatus === "fully-paid"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : customer.paymentStatus === "deposit-paid"
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : customer.paymentStatus === "refunded"
                        ? "bg-gray-500/10 text-gray-600 dark:text-gray-400"
                        : "bg-red-500/10 text-red-600 dark:text-red-400"
                    }`}
                  >
                    {customer.paymentStatus.replace("-", " ")}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs border-t border-border pt-3">
                  <div>
                    <span className="text-muted-foreground block">Payment Method</span>
                    <span className="font-medium text-foreground">{customer.paymentMethod || "Bank Transfer / Manual"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Payment Reference</span>
                    <span className="font-mono font-medium text-foreground">{customer.paymentReference || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Special Service Unlock</span>
                    <span className="font-medium text-foreground">
                      {customer.serviceUnlocked ? "✅ Approved by Admin" : "Standard Policy"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border p-4 bg-muted/20">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-500/20 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete Customer
          </button>

          <button
            onClick={onClose}
            className="rounded-lg bg-secondary px-4 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
}
