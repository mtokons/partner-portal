"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft, Save, CheckCircle2, BookOpen } from "lucide-react";
import { loadOfferFormData, createPartnerOffer } from "../actions";
import type { Client, Product } from "@/types";

interface LineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

const CSYM: Record<string, string> = {
  EUR: "€", BDT: "৳", INR: "₹", USD: "$", GBP: "£",
  AED: "د.إ", SAR: "﷼", MYR: "RM", PKR: "₨", TRY: "₺",
};

export default function NewPartnerOfferPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [partnerName, setPartnerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [secCur, setSecCur] = useState("EUR");
  const [xRate, setXRate] = useState(1);

  const [clientId, setClientId] = useState("");
  const [clientMode, setClientMode] = useState<"registered" | "prospective">("registered");
  const [prospectName, setProspectName] = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectPhone, setProspectPhone] = useState("");
  const [items, setItems] = useState<LineItem[]>([
    { productId: "", productName: "", quantity: 1, unitPrice: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"fixed" | "percent">("fixed");
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadOfferFormData().then((data) => {
      setClients(data.clients);
      setProducts(data.products);
      setPartnerName(data.partnerName);
      const cur = data.preferredCurrency || "BDT";
      setSecCur(cur);
      if (cur !== "EUR") {
        fetch(`/api/currency?target=${cur}`).then(r => r.json()).then(j => setXRate(j.rate || 1)).catch(() => {});
      }
      setLoading(false);
    });
  }, []);

  const d = (v: number) => `€${v.toLocaleString("en", { minimumFractionDigits: 2 })}`;

  const selectedClient = clients.find((c) => c.id === clientId);
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discountAmount = discountType === "percent" ? subtotal * (discount / 100) : discount;
  const total = Math.max(0, subtotal - discountAmount);

  function addItem() {
    setItems([...items, { productId: "", productName: "", quantity: 1, unitPrice: 0 }]);
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function selectProduct(idx: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setItems(
      items.map((item, i) =>
        i === idx
          ? { ...item, productId: product.id, productName: product.name, unitPrice: product.price }
          : item
      )
    );
  }

  async function handleSubmit() {
    const isProspect = clientMode === "prospective";
    if (!isProspect && !clientId) {
      setError("Please select a client or switch to Prospective Client mode.");
      return;
    }
    if (isProspect && !prospectName.trim()) {
      setError("Please enter the prospective client's name.");
      return;
    }
    if (items.length === 0 || items.some((i) => !i.productId)) {
      setError("Please add at least one product.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await createPartnerOffer({
        clientId: isProspect ? "" : clientId,
        clientName: isProspect ? prospectName : (selectedClient?.name || ""),
        clientEmail: isProspect ? prospectEmail : (selectedClient?.email || ""),
        clientType: clientMode,
        prospectName: isProspect ? prospectName : undefined,
        prospectEmail: isProspect ? prospectEmail : undefined,
        prospectPhone: isProspect ? prospectPhone : undefined,
        items,
        discount,
        discountType,
        validUntil,
        notes: notes || undefined,
      });
      if (result.success) {
        router.push(`/partner/offers/${result.offerId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create offer");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Loading offer form...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Offer</h1>
          <p className="text-muted-foreground text-sm">
            Build a quotation for your client with SCCG products and services.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Client Selection */}
          <div className="bg-card border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Client Details</h2>
              <div className="flex rounded-lg border overflow-hidden text-xs">
                <button
                  onClick={() => setClientMode("registered")}
                  className={`px-3 py-1.5 font-medium transition-colors ${clientMode === "registered" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  Registered
                </button>
                <button
                  onClick={() => setClientMode("prospective")}
                  className={`px-3 py-1.5 font-medium transition-colors ${clientMode === "prospective" ? "bg-amber-500 text-white" : "hover:bg-muted"}`}
                >
                  Prospective Client
                </button>
              </div>
            </div>

            {clientMode === "registered" ? (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Select Client</label>
                  <select
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Choose a client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.email}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedClient && (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <p className="font-medium">{selectedClient.name}</p>
                    <p className="text-muted-foreground">{selectedClient.email}</p>
                    {selectedClient.phone && <p className="text-muted-foreground">{selectedClient.phone}</p>}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
                  ⚡ Prospective Client — Offer will be created without requiring registration
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Full Name *</label>
                  <input
                    type="text"
                    value={prospectName}
                    onChange={(e) => setProspectName(e.target.value)}
                    placeholder="Enter client name..."
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={prospectEmail}
                    onChange={(e) => setProspectEmail(e.target.value)}
                    placeholder="client@example.com"
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Phone</label>
                  <input
                    type="tel"
                    value={prospectPhone}
                    onChange={(e) => setProspectPhone(e.target.value)}
                    placeholder="+880..."
                    className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-card border rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Products & Services</h2>
              <button
                onClick={addItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const selectedProduct = products.find((p) => p.id === item.productId);
                const rawTags = selectedProduct?.tags ?? [];
                const includes = rawTags
                  .filter((t) => t.toLowerCase().startsWith("include:") || t.toLowerCase().startsWith("includes:"))
                  .map((t) => t.replace(/^includes?:/i, "").trim());
                return (
                <div key={idx} className="rounded-2xl border bg-card overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Product / Service</label>
                        <select
                          value={item.productId}
                          onChange={(e) => selectProduct(idx, e.target.value)}
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                          <option value="">Select product...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} — {d(p.price)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Qty</label>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) =>
                            setItems(items.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, +e.target.value) } : it)))
                          }
                          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>
                    <div className="text-right pt-6 min-w-[80px]">
                      <p className="text-sm font-semibold">{d(item.quantity * item.unitPrice)}</p>
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors mt-5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Package detail preview */}
                  {selectedProduct && (
                    <div className="border-t bg-muted/20 px-4 py-3 space-y-2">
                      {selectedProduct.category && (
                        <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {selectedProduct.category}
                        </span>
                      )}
                      {selectedProduct.description && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{selectedProduct.description}</p>
                      )}
                      {includes.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1 mb-1">
                            <BookOpen className="w-2.5 h-2.5" /> What&apos;s Included
                          </p>
                          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                            {includes.map((feat) => (
                              <span key={feat} className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3 h-3 shrink-0" /> {feat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-card border rounded-2xl p-6">
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Additional notes for the client..."
              className="w-full rounded-lg border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-4">
          <div className="bg-card border rounded-2xl p-6 space-y-4 sticky top-24">
            <h2 className="font-semibold text-foreground">Offer Summary</h2>

            {/* Discount */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Discount</label>
                <input
                  type="number"
                  min={0}
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, +e.target.value))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "fixed" | "percent")}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="fixed">EUR Fixed</option>
                  <option value="percent">% Percent</option>
                </select>
              </div>
            </div>

            {/* Valid Until */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Valid Until</label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{d(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-red-500 font-medium">-{d(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span className="text-primary">{d(total)}</span>
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={handleSubmit}
              disabled={saving || (clientMode === "registered" ? !clientId : !prospectName.trim()) || items.every((i) => !i.productId)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? "Creating..." : "Create Offer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
