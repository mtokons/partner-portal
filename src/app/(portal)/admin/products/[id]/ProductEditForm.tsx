"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/types";
import { updateProductAction } from "./actions";
import { ArrowLeft, Loader2, Save, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

const CATEGORIES = ["Widgets", "Connectors", "Sensors", "Cables", "Software", "Services", "Hardware", "Other"];

export default function ProductEditForm({ product }: { product: Product }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    name: product.name,
    description: product.description,
    category: product.category,
    price: product.price,
    stock: product.stock ?? 0,
    imageUrl: product.imageUrl || "",
    discount: product.discount ?? 0,
    discountType: (product.discountType || "percent") as "percent" | "fixed",
    discountExpiry: product.discountExpiry ? product.discountExpiry.split("T")[0] : "",
    isAvailable: product.isAvailable !== false,
    tags: product.tags || [],
    sortOrder: product.sortOrder ?? 99,
  });
  const [tagInput, setTagInput] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  function update<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) update("tags", [...form.tags, t]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    update("tags", form.tags.filter((t) => t !== tag));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      try {
        await updateProductAction(product.id, {
          ...form,
          discountExpiry: form.discountExpiry ? new Date(form.discountExpiry).toISOString() : undefined,
        });
        setSaved(true);
        router.refresh();
      } catch (err) {
        setError(String(err));
      }
    });
  }

  const effectivePrice = form.discount > 0
    ? form.discountType === "percent"
      ? form.price * (1 - form.discount / 100)
      : form.price - form.discount
    : form.price;

  return (
    <div className="space-y-7 page-enter max-w-2xl">
      <div>
        <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Products
        </Link>
        <h1 className="text-3xl font-black tracking-tight">Edit Product</h1>
        <p className="text-sm text-muted-foreground mt-1">{product.name}</p>
      </div>

      {/* Preview card */}
      <div className="bg-gradient-to-br from-primary/5 to-violet-500/5 border border-primary/20 rounded-3xl px-6 py-4 flex items-center gap-4">
        {form.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.imageUrl} alt={form.name} className="h-16 w-16 rounded-2xl object-cover border border-border" />
        )}
        <div>
          <p className="font-black text-foreground text-lg">{form.name || "Product Name"}</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-black text-primary">BDT {effectivePrice.toLocaleString()}</span>
            {form.discount > 0 && <span className="text-sm text-muted-foreground line-through">BDT {form.price.toLocaleString()}</span>}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Product Details</h2>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Name <span className="text-rose-500">*</span></label>
            <input value={form.name} required onChange={(e) => update("name", e.target.value)}
              className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Description</label>
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3}
              className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Category</label>
            <select value={form.category} onChange={(e) => update("category", e.target.value)}
              className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
              <ImageIcon className="h-3 w-3 inline mr-1" /> Image URL
            </label>
            <input value={form.imageUrl} onChange={(e) => update("imageUrl", e.target.value)} placeholder="https://..."
              className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Pricing & Stock</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Price (BDT)</label>
              <input type="number" min={0} value={form.price} onChange={(e) => update("price", Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Stock</label>
              <input type="number" min={0} value={form.stock} onChange={(e) => update("stock", Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Discount</h2>
          <div className="flex gap-2">
            <button type="button" onClick={() => update("discountType", "percent")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${form.discountType === "percent" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}> % </button>
            <button type="button" onClick={() => update("discountType", "fixed")}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${form.discountType === "fixed" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}> BDT Fixed </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Discount Value</label>
              <input type="number" min={0} value={form.discount} onChange={(e) => update("discount", Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Expires</label>
              <input type="date" value={form.discountExpiry} onChange={(e) => update("discountExpiry", e.target.value)}
                className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Tags & Visibility</h2>
          <div>
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
                placeholder="Add tag (e.g. new, bestseller)"
                className="flex-1 px-4 py-2 bg-muted border-0 rounded-xl text-sm focus:outline-none" />
              <button type="button" onClick={addTag} className="px-4 py-2 bg-muted text-sm font-semibold rounded-xl hover:bg-muted/80">Add</button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-muted-foreground">Sort Order</span>
            <input type="number" min={1} value={form.sortOrder} onChange={(e) => update("sortOrder", Number(e.target.value))}
              className="w-20 px-3 py-2 bg-muted border-0 rounded-xl text-sm focus:outline-none" />
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-semibold text-muted-foreground">Available in Shop</span>
              <button type="button" onClick={() => update("isAvailable", !form.isAvailable)}
                className={`relative h-7 w-12 rounded-full transition-colors ${form.isAvailable ? "bg-primary" : "bg-muted"}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isAvailable ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-rose-600 bg-rose-50 px-4 py-3 rounded-xl border border-rose-200">{error}</p>}
        {saved && <p className="text-sm text-emerald-600 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200">✓ Saved successfully</p>}

        <button type="submit" disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm hover:opacity-90 shadow-lg shadow-primary/25 disabled:opacity-60">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isPending ? "Saving..." : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
