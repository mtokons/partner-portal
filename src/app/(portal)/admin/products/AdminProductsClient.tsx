"use client";

import React, { useState, useTransition, useEffect } from "react";
import type { Product } from "@/types";
import {
  saveProductAction,
  updateProductPositionAction,
  shiftProductPositionAction,
  toggleProductAvailabilityAction,
} from "./actions";
import { getProductImageUrl } from "@/lib/utils";
import {
  Package,
  Search,
  ExternalLink,
  ArrowUp,
  ArrowDown,
  Edit3,
  CheckCircle2,
  XCircle,
  Tag,
  Layers,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  X,
  Store,
  DollarSign,
  Check,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface Props {
  initialProducts: Product[];
}

export default function AdminProductsClient({ initialProducts }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [isPending, startTransition] = useTransition();

  // Modal edit state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formPosition, setFormPosition] = useState<number>(0);
  const [formLogoText, setFormLogoText] = useState("");
  const [formLogoUrl, setFormLogoUrl] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formEurPrice, setFormEurPrice] = useState<number>(0);
  const [formBdtPrice, setFormBdtPrice] = useState<number>(0);
  const [formSessions, setFormSessions] = useState<number>(0);
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [liveBdtRate, setLiveBdtRate] = useState<number>(140.2);

  useEffect(() => {
    fetch("/api/currency?target=BDT")
      .then((r) => r.json())
      .then((d) => {
        if (d?.rate && Number(d.rate) > 0) setLiveBdtRate(Number(d.rate));
      })
      .catch(() => {});
  }, []);

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  // Filtered and sorted products
  const filteredProducts = products
    .filter((p) => {
      const q = search.toLowerCase();
      if (
        search &&
        !p.name.toLowerCase().includes(q) &&
        !p.sku.toLowerCase().includes(q) &&
        !(p.logoText || "").toLowerCase().includes(q) &&
        !p.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (statusFilter === "active" && p.isAvailable === false) return false;
      if (statusFilter === "hidden" && p.isAvailable !== false) return false;
      return true;
    })
    .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));

  // Open edit modal
  function handleOpenEdit(product: Product) {
    setEditingProduct(product);
    setFormPosition(product.sortOrder ?? 99);
    setFormLogoText(product.logoText || "SCCG Germany");
    setFormLogoUrl(product.logoUrl || "");
    setFormName(product.name);
    setFormCategory(product.category);
    setFormDescription(product.description || "");
    setFormEurPrice(product.retailPriceEur || product.price || 0);
    setFormBdtPrice(product.retailPriceBdt || Math.round((product.retailPriceEur || product.price || 0) * (liveBdtRate || 140.2)));
    setFormSessions(product.sessionsCount || 0);
    setFormIsAvailable(product.isAvailable !== false);
    setSaveSuccessMsg(null);
  }

  // Quick move position
  function handleShiftPosition(id: string, direction: "up" | "down") {
    startTransition(async () => {
      const res = await shiftProductPositionAction(id, direction);
      if (res.success) {
        setProducts((prev) => {
          const sorted = [...prev].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
          const idx = sorted.findIndex((p) => p.id === id);
          if (idx === -1) return prev;
          const targetIdx = direction === "up" ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= sorted.length) return prev;
          const cur = sorted[idx];
          const tgt = sorted[targetIdx];
          const curPos = cur.sortOrder ?? idx + 1;
          const tgtPos = tgt.sortOrder ?? targetIdx + 1;
          cur.sortOrder = tgtPos === curPos ? (direction === "up" ? curPos - 1 : curPos + 1) : tgtPos;
          tgt.sortOrder = curPos;
          return [...sorted].sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
        });
      }
    });
  }

  // Quick inline toggle availability
  function handleToggleAvailability(id: string, current: boolean) {
    const next = !current;
    startTransition(async () => {
      await toggleProductAvailabilityAction(id, next);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, isAvailable: next } : p)));
    });
  }

  // Save product from modal
  function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;

    startTransition(async () => {
      const updateData: Partial<Product> = {
        name: formName,
        category: formCategory,
        description: formDescription,
        sortOrder: Number(formPosition),
        logoText: formLogoText.trim(),
        logoUrl: formLogoUrl.trim() || undefined,
        retailPriceEur: Number(formEurPrice),
        retailPriceBdt: Number(formBdtPrice),
        sessionsCount: Number(formSessions),
        isAvailable: formIsAvailable,
      };

      const res = await saveProductAction(editingProduct.id, updateData);
      if (res.success) {
        setProducts((prev) =>
          prev
            .map((p) => (p.id === editingProduct.id ? { ...p, ...updateData } : p))
            .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999))
        );
        setSaveSuccessMsg("Product updated successfully! Changes are live on marketplace.");
        setTimeout(() => {
          setEditingProduct(null);
          setSaveSuccessMsg(null);
        }, 1200);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* ── German Flag & SCCG 4-Color Accent Micro-Ribbon ── */}
      <div className="h-1 w-full bg-gradient-to-r from-[#111827] via-[#0F4C81] via-[#DC2626] to-[#F59E0B] rounded-full shadow-xs" />

      {/* ── Top Header & Actions ───────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0F4C81] shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight leading-tight flex items-center gap-2">
                <span className="bg-gradient-to-r from-[#111827] via-[#0F4C81] via-[#DC2626] to-[#F59E0B] bg-clip-text text-transparent">
                  Product Management &amp; Positioning
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0F4C81] border border-blue-200">
                  Admin Console
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                Adjust product positioning order, customize logo text &amp; branding badges, and configure pricing for the public marketplace.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/marketplace"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-xs transition-colors"
          >
            <Store className="w-4 h-4 text-[#0F4C81]" />
            View Marketplace
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>

      {/* ── KPI Stat Cards ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/90 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Total Products
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{products.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">Catalog services &amp; courses</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Live on Marketplace
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {products.filter((p) => p.isAvailable !== false).length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Available for direct purchase</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Top Priority Ranked
              </p>
              <p className="text-2xl font-bold text-[#0F4C81] mt-1">
                {products.filter((p) => (p.sortOrder ?? 999) <= 5).length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Positioned in top slots</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0F4C81]">
              <Sparkles className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/90 bg-white shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                Categories
              </p>
              <p className="text-2xl font-bold text-amber-700 mt-1">
                {categories.length - 1}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Active curriculum streams</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <Tag className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Search & Filter Controls ─────────────────────── */}
      <Card className="border-slate-200/90 bg-white shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full lg:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search product name, SKU, category, logo text..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 h-9 rounded-lg focus:bg-white focus:border-[#0F4C81]"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 px-3 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-[#0F4C81]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All Categories" : c}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 px-3 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:border-[#0F4C81]"
              >
                <option value="all">All Statuses</option>
                <option value="active">Live on Marketplace</option>
                <option value="hidden">Hidden / Draft</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>
              Showing <strong className="text-slate-900 font-semibold">{filteredProducts.length}</strong> of {products.length} products
              {(search || categoryFilter !== "all" || statusFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("all");
                    setStatusFilter("all");
                  }}
                  className="ml-2 text-[#0F4C81] hover:underline font-medium"
                >
                  Clear filters
                </button>
              )}
            </span>
            <span className="text-[11px] text-slate-400">
              💡 Tip: Click ▲ / ▼ or Edit to adjust positioning on the marketplace
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Products Table ────────────────────────────────── */}
      <Card className="border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4 w-28">Position (Order)</th>
                <th className="py-3 px-4 w-44">Logo &amp; Logo Text</th>
                <th className="py-3 px-4">Product Name &amp; SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Retail Price (EUR / BDT)</th>
                <th className="py-3 px-4 text-center">Marketplace Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p, idx) => {
                const currentPos = p.sortOrder ?? idx + 1;
                const isLive = p.isAvailable !== false;

                return (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Position / Order */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                          #{currentPos}
                        </span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => handleShiftPosition(p.id, "up")}
                            disabled={isPending}
                            title="Move Up"
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-40"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleShiftPosition(p.id, "down")}
                            disabled={isPending}
                            title="Move Down"
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-40"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Logo & Custom Logo Text */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded-lg bg-slate-50 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                          <img
                            src={getProductImageUrl(p)}
                            alt={p.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-[#0F4C81] border border-blue-200 inline-block truncate max-w-[130px]">
                            {p.logoText || "SCCG Germany"}
                          </span>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            {p.logoUrl ? "Custom Logo" : "SCCG Original Logo"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Name & SKU */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 leading-tight">
                        {p.name}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="font-mono">SKU: {p.sku}</span>
                        {p.sessionsCount > 0 && (
                          <span>• {p.sessionsCount} sessions</span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <Badge variant="outline" className="text-[10px] font-medium border-slate-200 text-slate-600 bg-slate-50">
                        {p.category}
                      </Badge>
                    </td>

                    {/* Price */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900">
                        €{(p.retailPriceEur || p.price || 0).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        ৳{(p.retailPriceBdt || Math.round((p.retailPriceEur || p.price || 0) * 130)).toLocaleString()}
                      </div>
                    </td>

                    {/* Marketplace Live Status */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleToggleAvailability(p.id, isLive)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                          isLive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                        }`}
                      >
                        {isLive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Live in Shop
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-slate-400" />
                            Hidden / Draft
                          </>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(p)}
                        className="h-8 border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1 text-[#0F4C81]" />
                        Edit
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">No products found</p>
                    <p className="text-xs text-slate-500">Try changing your search terms or filters.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Edit Product Drawer / Modal ─────────────────── */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0F4C81]">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Adjust Product &amp; Positioning
                  </h3>
                  <p className="text-xs text-slate-500">SKU: {editingProduct.sku} • ID: {editingProduct.id}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                {saveSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              {/* Product Positioning & Logo Text Highlight Box */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50/50 via-slate-50 to-amber-50/40 border border-blue-100 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                  <Sparkles className="w-4 h-4 text-[#0F4C81]" />
                  <span>Marketplace Display Priority &amp; Branding Settings</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Position Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>Product Positioning (Order)</span>
                      <span className="text-[10px] text-slate-400 font-normal">#1 is top priority</span>
                    </label>
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={formPosition}
                      onChange={(e) => setFormPosition(Number(e.target.value))}
                      className="bg-white border-slate-300 font-mono font-bold text-sm h-9"
                      required
                    />
                    <p className="text-[10px] text-slate-500">
                      Determines display order on `/marketplace`. Lower numbers appear first.
                    </p>
                  </div>

                  {/* Logo Text Input */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>Logo Text / Branding Badge</span>
                      <span className="text-[10px] text-blue-600 font-medium">Shown on card</span>
                    </label>
                    <Input
                      placeholder="e.g. SCCG Germany, Fast Track, Top Pick..."
                      value={formLogoText}
                      onChange={(e) => setFormLogoText(e.target.value)}
                      className="bg-white border-slate-300 font-bold text-sm h-9"
                      required
                    />
                    <p className="text-[10px] text-slate-500">
                      Text badge displayed directly beside the product logo.
                    </p>
                  </div>
                </div>

                {/* Logo URL and Preview */}
                <div className="space-y-2 pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700">
                      Product Logo Selection
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormLogoUrl("")}
                      className="text-[10px] font-bold text-[#0F4C81] hover:underline"
                    >
                      Use SCCG Original Logo (/assets/sccg-logo.png)
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                      <img
                        src={formLogoUrl || "/assets/sccg-logo.png"}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Custom image/logo URL (leave blank for SCCG Original Logo)"
                        value={formLogoUrl}
                        onChange={(e) => setFormLogoUrl(e.target.value)}
                        className="bg-white border-slate-300 text-xs h-9"
                      />
                    </div>
                  </div>

                  {/* Card Badge Preview */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-600 bg-white/80 p-2 rounded-lg border border-slate-200/60">
                    <span className="text-slate-400">Live Card Badge Preview:</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800 shadow-2xs flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0F4C81]" />
                      {formLogoText || "SCCG Germany"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Basic Product Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Product Title</label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="bg-slate-50 border-slate-200"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category</label>
                  <Input
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="bg-slate-50 border-slate-200"
                    required
                  />
                </div>
              </div>

              {/* Pricing & Sessions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Price (€ EUR)</label>
                  <Input
                    type="number"
                    value={formEurPrice}
                    onChange={(e) => setFormEurPrice(Number(e.target.value))}
                    className="bg-slate-50 border-slate-200 font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700">Price (৳ BDT)</label>
                    <button
                      type="button"
                      onClick={() => setFormBdtPrice(Math.round(formEurPrice * (liveBdtRate || 140.2)))}
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                      title="Sync with live central bank exchange rate"
                    >
                      ⚡ Auto (@ ৳{(liveBdtRate || 140.2).toFixed(1)})
                    </button>
                  </div>
                  <Input
                    type="number"
                    value={formBdtPrice}
                    onChange={(e) => setFormBdtPrice(Number(e.target.value))}
                    className="bg-slate-50 border-slate-200 font-mono"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Sessions Count</label>
                  <Input
                    type="number"
                    value={formSessions}
                    onChange={(e) => setFormSessions(Number(e.target.value))}
                    className="bg-slate-50 border-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:outline-none focus:border-[#0F4C81]"
                />
              </div>

              {/* Availability Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <p className="font-bold text-slate-800">Public Marketplace Availability</p>
                  <p className="text-[11px] text-slate-500">
                    When active, guests and students can browse and purchase this package directly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormIsAvailable(!formIsAvailable)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors ${
                    formIsAvailable
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {formIsAvailable ? "Active (Live)" : "Hidden (Draft)"}
                </button>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProduct(null)}
                  className="border-slate-200 text-slate-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  size="sm"
                  className="bg-[#0F4C81] hover:bg-[#0C3E6B] text-white font-bold px-5"
                >
                  {isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save & Update Marketplace"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
