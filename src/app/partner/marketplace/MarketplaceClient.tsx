"use client";

import { useState } from "react";
import {
  Download, ShoppingBag, FileText, Image, Video, Package,
  CheckCircle2, BookOpen, Layers, Tag, Euro, Clock,
} from "lucide-react";
import type { Product } from "@/types";
import { dual } from "@/lib/formatCurrency";

const CONTENT_TYPE_ICONS: Record<string, typeof FileText> = {
  brochure: FileText,
  marketing: Image,
  video: Video,
  template: FileText,
  default: Package,
};

const WORKFLOW_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "Training & Language": { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  "Ausbildung":          { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20" },
  "Student":             { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/20" },
  "Opportunity Card":    { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  "Others":              { bg: "bg-gray-500/10", text: "text-gray-600 dark:text-gray-400", border: "border-gray-500/20" },
};

interface Props {
  downloads: Product[];
  allServices: Product[];
  secCur: string;
  rate: number;
}

type Tab = "downloads" | "all-products";

// Parse "what's included" from tags — tags starting with "include:" are treated
// as included items; everything else is shown as a plain badge.
function parseIncludes(tags: string[]): { includes: string[]; badges: string[] } {
  const includes: string[] = [];
  const badges: string[] = [];
  for (const t of tags) {
    const lower = t.toLowerCase();
    if (lower.startsWith("include:")) {
      includes.push(t.slice("include:".length).trim());
    } else if (lower.startsWith("includes:")) {
      includes.push(t.slice("includes:".length).trim());
    } else {
      badges.push(t);
    }
  }
  return { includes, badges };
}

export default function MarketplaceClient({ downloads, allServices, secCur, rate }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("all-products");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Derive unique categories from services
  const categories = [
    "All",
    ...Array.from(new Set(allServices.map((p) => p.category).filter(Boolean))),
  ];

  const visibleServices = categoryFilter === "All"
    ? allServices
    : allServices.filter((p) => p.category === categoryFilter);

  // Group by category for display
  const grouped = categories.slice(1).reduce<Record<string, Product[]>>((acc, cat) => {
    const items = allServices.filter((p) => p.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const displayProducts = categoryFilter === "All" ? null : visibleServices;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          Partner Marketplace
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Browse all service packages and download partner resources.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border/60">
        {([
          { id: "all-products" as Tab, label: "All Products & Services", icon: Layers },
          { id: "downloads" as Tab, label: "Downloads & Resources", icon: Download },
        ]).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors -mb-px ${
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {id === "all-products" && allServices.length > 0 && (
              <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {allServices.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab: All Products & Services ─── */}
      {activeTab === "all-products" && (
        <div className="space-y-8">
          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const colors = WORKFLOW_COLORS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                    categoryFilter === cat
                      ? colors
                        ? `${colors.bg} ${colors.text} ${colors.border} border`
                        : "bg-primary/10 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground border-transparent hover:border-muted-foreground/30"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Grouped all view */}
          {categoryFilter === "All" ? (
            <div className="space-y-10">
              {Object.entries(grouped).map(([category, products]) => {
                const colors = WORKFLOW_COLORS[category];
                return (
                  <div key={category}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                        colors ? `${colors.bg} ${colors.text} ${colors.border}` : "bg-muted text-muted-foreground border-border"
                      }`}>
                        {category}
                      </span>
                      <div className="flex-1 h-px bg-border/60" />
                      <span className="text-xs text-muted-foreground">{products.length} package{products.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {products.map((p) => (
                        <ServiceCard key={p.id} product={p} secCur={secCur} rate={rate} colors={colors} />
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(grouped).length === 0 && (
                <EmptyState icon={Package} title="No services available yet." subtitle="Service packages will appear here once added." />
              )}
            </div>
          ) : (
            /* Filtered single-category view */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(displayProducts ?? []).map((p) => (
                <ServiceCard
                  key={p.id}
                  product={p}
                  secCur={secCur}
                  rate={rate}
                  colors={WORKFLOW_COLORS[p.category]}
                />
              ))}
              {(displayProducts ?? []).length === 0 && (
                <div className="col-span-3">
                  <EmptyState icon={Package} title={`No services in "${categoryFilter}".`} subtitle="Try selecting a different category." />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Downloads & Resources ─── */}
      {activeTab === "downloads" && (
        <div>
          {downloads.length === 0 ? (
            <EmptyState icon={Download} title="No downloads available yet." subtitle="Marketing materials and resources will appear here." />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {downloads.map((p) => {
                const contentType = p.contentType || "default";
                const Icon = CONTENT_TYPE_ICONS[contentType] || CONTENT_TYPE_ICONS.default;
                return (
                  <div key={p.id} className="bg-card rounded-2xl border p-5 space-y-3 hover:shadow-md transition-shadow">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover rounded-xl" />
                    ) : (
                      <div className="w-full h-32 rounded-xl bg-muted/50 flex items-center justify-center">
                        <Icon className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{p.name}</p>
                        {p.contentType && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {p.contentType}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{p.description}</p>
                    </div>
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {p.tags.map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    )}
                    <a
                      href={p.imageUrl ?? "#"}
                      download
                      className="inline-flex items-center gap-2 w-full justify-center rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Service product card with "What's Included" section ───────────────────

interface ServiceCardProps {
  product: Product;
  secCur: string;
  rate: number;
  colors?: { bg: string; text: string; border: string };
}

function ServiceCard({ product: p, secCur, rate, colors }: ServiceCardProps) {
  const { includes, badges } = parseIncludes(p.tags ?? []);

  // Build implicit "what's included" from structured fields if no explicit includes tags
  const implicitIncludes: string[] = [];
  if (p.sessionsCount && p.sessionsCount > 0) {
    implicitIncludes.push(`${p.sessionsCount} expert session${p.sessionsCount !== 1 ? "s" : ""}`);
  }
  if (p.unit && p.unit !== "Package") {
    implicitIncludes.push(`Delivered as ${p.unit.toLowerCase()}`);
  }

  const allIncludes = includes.length > 0 ? includes : implicitIncludes;

  return (
    <div className="bg-card border rounded-2xl overflow-hidden hover:shadow-md transition-all group flex flex-col">
      {/* Image or gradient header */}
      {p.imageUrl ? (
        <img src={p.imageUrl} alt={p.name} className="w-full h-36 object-cover" />
      ) : (
        <div className={`h-2 w-full ${colors?.bg ?? "bg-primary/10"}`} />
      )}

      <div className="p-5 flex flex-col flex-1 space-y-3">
        {/* Category + SKU */}
        <div className="flex items-center justify-between gap-2">
          {p.category && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              colors ? `${colors.bg} ${colors.text}` : "bg-muted text-muted-foreground"
            }`}>
              {p.category}
            </span>
          )}
          {p.sku && (
            <span className="text-[10px] font-mono text-muted-foreground/60 ml-auto">{p.sku}</span>
          )}
        </div>

        {/* Name */}
        <h3 className="font-bold text-foreground text-base leading-snug">{p.name}</h3>

        {/* Description */}
        {p.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {p.description}
          </p>
        )}

        {/* What's Included */}
        {allIncludes.length > 0 && (
          <div className="bg-muted/40 rounded-xl p-3 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-3 h-3" />
              What&apos;s Included
            </p>
            <ul className="space-y-1">
              {allIncludes.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="leading-snug">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags/badges (non-include tags) */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {badges.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                <Tag className="w-2.5 h-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Pricing footer */}
        <div className="pt-3 border-t border-dashed border-border/60 flex items-end justify-between gap-2">
          <div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-0.5">
              <Euro className="w-3 h-3" />
              <span>Partner price</span>
            </div>
            <p className="text-lg font-black text-primary">
              {dual(p.price, secCur, rate)}
            </p>
            {p.retailPriceEur > 0 && p.retailPriceEur !== p.price && (
              <p className="text-xs text-muted-foreground line-through">
                Retail €{p.retailPriceEur.toLocaleString("en", { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
          {p.unit && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded-lg">
              <Clock className="w-3 h-3" />
              per {p.unit.toLowerCase()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Generic empty state ─────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Package;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="bg-card border rounded-2xl p-12 text-center text-muted-foreground">
      <Icon className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="font-medium">{title}</p>
      <p className="text-sm opacity-60">{subtitle}</p>
    </div>
  );
}
