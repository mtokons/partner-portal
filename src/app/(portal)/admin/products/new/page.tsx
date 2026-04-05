"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProductAction } from "./actions";
import { Package, ArrowLeft, Loader2, Save, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["Widgets", "Connectors", "Sensors", "Cables", "Software", "Services", "Hardware", "Other"];

export default function NewProductPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Widgets",
    price: 0,
    stock: 100,
    imageUrl: "",
    discount: 0,
    discountType: "percent" as "percent" | "fixed",
    discountExpiry: "",
    isAvailable: true,
    tags: [] as string[],
    sortOrder: 99,
  });
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      update("tags", [...form.tags, t]);
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    update("tags", form.tags.filter((t) => t !== tag));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.price <= 0) { setError("Price must be greater than 0"); return; }
    startTransition(async () => {
      try {
        await createProductAction({
          ...form,
          discountExpiry: form.discountExpiry ? new Date(form.discountExpiry).toISOString() : undefined,
        });
        router.push("/admin/products");
      } catch (err) {
        setError(String(err));
      }
    });
  }

  return (
    <div className="space-y-7 page-enter max-w-2xl">
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
        <h1 className="text-3xl font-black tracking-tight">New Product</h1>
        <p className="text-sm text-muted-foreground mt-1">Add a new product to the SCCG Sales Shop catalog.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Product Details</h2>
          {[
            { key: "name", label: "Product Name", required: true, type: "text", placeholder: "e.g. Premium Sensor Module X1" },
          ].map(({ key, label, required, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                {label} {required && <span className="text-rose-500">*</span>}
              </label>
              <input
                type={type}
                required={required}
                value={String(form[key as keyof typeof form])}
                onChange={(e) => update(key as keyof typeof form, e.target.value as never)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Description <span className="text-rose-500">*</span></label>
            <textarea
              required
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Describe this product..."
              rows={3}
              className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Category</label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              <ImageIcon className="h-3 w-3 inline mr-1" /> Image URL
            </label>
            <input
              value={form.imageUrl}
              onChange={(e) => update("imageUrl", e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Pricing & Stock</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Price (BDT) <span className="text-rose-500">*</span></label>
              <input type="number" min={0} required value={form.price} onChange={(e) => update("price", Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Stock</label>
              <input type="number" min={0} value={form.stock} onChange={(e) => update("stock", Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>

        {/* Discounts */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Discount (Optional)</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => update("discountType", "percent")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${form.discountType === "percent" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>%</button>
            <button type="button" onClick={() => update("discountType", "fixed")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${form.discountType === "fixed" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>BDT Fixed</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Discount Value</label>
              <input type="number" min={0} value={form.discount} onChange={(e) => update("discount", Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Discount Expiry</label>
              <input type="date" value={form.discountExpiry} onChange={(e) => update("discountExpiry", e.target.value)}
                className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>

        {/* Tags & Settings */}
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Tags & Settings</h2>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Tags (e.g. new, bestseller)</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {form.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-primary/60 hover:text-primary ml-0.5">×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Type tag + Enter"
                className="flex-1 px-4 py-2 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button type="button" onClick={addTag} className="px-4 py-2 bg-muted text-sm font-semibold rounded-xl hover:bg-muted/80">Add</button>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort Order</label>
              <input type="number" min={1} value={form.sortOrder} onChange={(e) => update("sortOrder", Number(e.target.value))}
                className="w-20 px-3 py-2 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-sm font-semibold text-muted-foreground">Available in Shop</span>
              <button type="button" onClick={() => update("isAvailable", !form.isAvailable)}
                className={`relative h-7 w-12 rounded-full transition-colors ${form.isAvailable ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isAvailable ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600 bg-rose-50 px-4 py-3 rounded-xl border border-rose-200">{error}</p>}

        <button type="submit" disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 shadow-lg shadow-primary/25 disabled:opacity-60">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPending ? "Creating..." : "Create Product"}
        </button>
      </form>
    </div>
  );
}
