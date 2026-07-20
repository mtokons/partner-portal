"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download, ShoppingBag, FileText, Image as ImageIcon, Video, Package,
  CheckCircle2, BookOpen, Layers, Tag, Euro, Clock, Play, PlayCircle,
  ExternalLink, Share2, Palette, Film, Eye, Upload, X, Loader2,
} from "lucide-react";
import type { Product } from "@/types";
import { dual } from "@/lib/formatCurrency";
import { uploadMarketplaceResourceAction } from "./actions";

// ─── SCCG YouTube Videos — Official Channel: @sccg24x7 ─────────────────────
const YOUTUBE_VIDEOS = [
  {
    id: "yt-1",
    youtubeId: "9x3rIeCm0P8",
    title: "How to Write a Job-Winning CV for Germany",
    description: "Expert guidance on crafting a CV that stands out to German employers. Covers format, language, and key sections.",
    category: "Career Tips",
    duration: "29:41",
  },
  {
    id: "yt-2",
    youtubeId: "jfs4kEmcyKI",
    title: "Employment Opportunity in Germany for IT Professionals",
    description: "Comprehensive webinar on job opportunities in Germany for IT professionals including DevOps and Cyber Security.",
    category: "Webinar",
    duration: "59:18",
  },
  {
    id: "yt-3",
    youtubeId: "5ernEwBxVck",
    title: "Employment Opportunities in Germany – For IT Professionals",
    description: "Deep-dive session on employment prospects, visa options, and how SCCG supports IT professionals moving to Germany.",
    category: "Webinar",
    duration: "1:01:20",
  },
  {
    id: "yt-4",
    youtubeId: "eXLekbAFoWE",
    title: "A to Z of Germany's Opportunity Card (Chancenkarte)",
    description: "Complete guide from application to life in Germany — everything you need to know about the Opportunity Card.",
    category: "Services",
    duration: "1:16:26",
  },
  {
    id: "yt-5",
    youtubeId: "NryVFK93gWM",
    title: "Employment in Germany – Directly from Bangladesh | Connecting Dots",
    description: "How Bangladeshi professionals can find employment in Germany with SCCG support.",
    category: "Services",
    duration: "36:32",
  },
  {
    id: "yt-6",
    youtubeId: "bEFEat6BgXI",
    title: "Be Expert of Your Application – Bachelor & Masters in Germany",
    description: "In-depth guidance for Bachelor and Masters university applications in Germany — requirements, portals, and tips.",
    category: "Education",
    duration: "55:25",
  },
  {
    id: "yt-7",
    youtubeId: "E7dK4Rzl3jo",
    title: "Top 5 Facts About the Opportunity Card – SCCG Webinar",
    description: "Key facts every applicant should know about Germany's Opportunity Card visa pathway.",
    category: "Services",
    duration: "8:34",
  },
  {
    id: "yt-8",
    youtubeId: "bi_x4qgVFSo",
    title: "Bangladeshi Professional Network Summit 2025",
    description: "Highlights and key moments from the BPN Summit 2025 — professionals connecting across Bangladesh and Germany.",
    category: "Community",
    duration: "0:42",
  },
];

// ─── SCCG Branding Materials ───────────────────────────────────────────────
// Add SharePoint/CDN URLs for branding assets. Replace with real URLs.
const BRANDING_ASSETS = [
  {
    id: "brand-1",
    title: "SCCG Logo (White Background)",
    description: "Official SCCG logo for use on white/light backgrounds. PNG & SVG formats.",
    type: "logo" as const,
    previewUrl: "/images/sccg-logo-preview.png",
    downloadUrl: "/assets/branding/sccg-logo-white.png",
    formats: ["PNG", "SVG"],
    size: "2.4 MB",
  },
  {
    id: "brand-2",
    title: "SCCG Logo (Dark Background)",
    description: "Official SCCG logo for use on dark/colored backgrounds.",
    type: "logo" as const,
    previewUrl: "/images/sccg-logo-dark-preview.png",
    downloadUrl: "/assets/branding/sccg-logo-dark.png",
    formats: ["PNG", "SVG"],
    size: "2.1 MB",
  },
  {
    id: "brand-3",
    title: "Partner Banner – Social Media (1080×1080)",
    description: "Square social media banner for partner use. Editable template available.",
    type: "banner" as const,
    previewUrl: "/images/banner-social-preview.png",
    downloadUrl: "/assets/branding/partner-banner-social.png",
    formats: ["PNG", "PSD"],
    size: "5.8 MB",
  },
  {
    id: "brand-4",
    title: "Partner Banner – LinkedIn Cover (1584×396)",
    description: "LinkedIn cover photo optimized for partner company pages.",
    type: "banner" as const,
    previewUrl: "/images/banner-linkedin-preview.png",
    downloadUrl: "/assets/branding/partner-banner-linkedin.png",
    formats: ["PNG"],
    size: "3.2 MB",
  },
  {
    id: "brand-5",
    title: "SCCG Flyer – Ausbildung Program",
    description: "Printable A4 flyer for promoting the SCCG Ausbildung placement program.",
    type: "flyer" as const,
    previewUrl: "/images/flyer-ausbildung-preview.png",
    downloadUrl: "/assets/branding/sccg-flyer-ausbildung.pdf",
    formats: ["PDF"],
    size: "1.1 MB",
  },
  {
    id: "brand-6",
    title: "SCCG Flyer – Student Program",
    description: "A4 flyer for promoting SCCG's student visa and university placement services.",
    type: "flyer" as const,
    previewUrl: "/images/flyer-student-preview.png",
    downloadUrl: "/assets/branding/sccg-flyer-student.pdf",
    formats: ["PDF"],
    size: "1.3 MB",
  },
  {
    id: "brand-7",
    title: "Partner Pitch Deck (PowerPoint)",
    description: "Ready-to-use presentation for pitching SCCG services to corporate clients.",
    type: "presentation" as const,
    previewUrl: null,
    downloadUrl: "/assets/branding/sccg-partner-pitch-deck.pptx",
    formats: ["PPTX"],
    size: "8.4 MB",
  },
  {
    id: "brand-8",
    title: "SCCG Brand Guidelines PDF",
    description: "Official brand guidelines: colors, fonts, logo usage rules, and do's & don'ts.",
    type: "guide" as const,
    previewUrl: null,
    downloadUrl: "/assets/branding/sccg-brand-guidelines.pdf",
    formats: ["PDF"],
    size: "4.6 MB",
  },
];

const ASSET_TYPE_ICON: Record<string, typeof FileText> = {
  logo: ImageIcon,
  banner: ImageIcon,
  flyer: FileText,
  presentation: FileText,
  guide: BookOpen,
};

const ASSET_TYPE_COLOR: Record<string, string> = {
  logo:         "bg-blue-50 text-blue-600 border-blue-200",
  banner:       "bg-violet-50 text-violet-600 border-violet-200",
  flyer:        "bg-emerald-50 text-emerald-600 border-emerald-200",
  presentation: "bg-amber-50 text-amber-600 border-amber-200",
  guide:        "bg-rose-50 text-rose-600 border-rose-200",
};

const VIDEO_CAT_COLORS: Record<string, string> = {
  "Program Overview": "bg-blue-100 text-blue-700",
  "Tutorials":        "bg-violet-100 text-violet-700",
  "Services":         "bg-emerald-100 text-emerald-700",
};

const CONTENT_TYPE_ICONS: Record<string, typeof FileText> = {
  brochure: FileText,
  marketing: ImageIcon,
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
  isAdmin?: boolean;
}

type Tab = "downloads" | "all-products";
type ResourceTab = "videos" | "branding" | "files";

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

export default function MarketplaceClient({ downloads, allServices, secCur, rate, isAdmin }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("all-products");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [resourceTab, setResourceTab] = useState<ResourceTab>("videos");
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

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
        <div className="space-y-6">
          {/* Resource sub-tabs */}
          <div className="flex gap-1 bg-muted/40 p-1 rounded-xl w-fit flex-wrap">
            {([
              { id: "videos" as ResourceTab, label: "YouTube Videos", icon: PlayCircle, count: YOUTUBE_VIDEOS.length },
              { id: "branding" as ResourceTab, label: "Branding & Graphics", icon: Palette, count: BRANDING_ASSETS.length },
              { id: "files" as ResourceTab, label: "Other Downloads", icon: Download, count: downloads.length },
            ]).map(({ id, label, icon: Icon, count }) => (
              <button
                key={id}
                onClick={() => setResourceTab(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  resourceTab === id
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  resourceTab === id ? "bg-primary/10 text-primary" : "bg-muted-foreground/10"
                }`}>{count}</span>
              </button>
            ))}
          </div>

          {/* ── YouTube Videos ── */}
          {resourceTab === "videos" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-bold">SCCG YouTube Channel</h2>
                <a
                  href="https://www.youtube.com/@sccg24x7"
                  target="_blank" rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Visit Channel
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {YOUTUBE_VIDEOS.map((v) => (
                  <div key={v.id} className="bg-card rounded-2xl border overflow-hidden hover:shadow-md transition-all group">
                    {/* Thumbnail */}
                    <div className="relative w-full aspect-video bg-black overflow-hidden">
                      {playingVideo === v.id ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${v.youtubeId}?autoplay=1`}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <>
                          <img
                            src={`https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`}
                            alt={v.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${v.youtubeId}/default.jpg`;
                            }}
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <button
                              onClick={() => setPlayingVideo(v.id)}
                              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-xl transition-all hover:scale-110"
                            >
                              <Play className="w-6 h-6 text-white ml-1" fill="white" />
                            </button>
                          </div>
                          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                            {v.duration}
                          </div>
                        </>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-foreground text-sm leading-snug line-clamp-2">{v.title}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                          VIDEO_CAT_COLORS[v.category] || "bg-muted text-muted-foreground"
                        }`}>{v.category}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{v.description}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => setPlayingVideo(playingVideo === v.id ? null : v.id)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" fill="white" />
                          {playingVideo === v.id ? "Stop" : "Watch"}
                        </button>
                        <a
                          href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-muted text-muted-foreground text-xs font-semibold hover:text-foreground hover:bg-muted/80 transition-colors border"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          YouTube
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Branding & Graphics ── */}
          {resourceTab === "branding" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-violet-500" />
                <h2 className="text-lg font-bold">Branding Materials & Graphics</h2>
                <span className="text-xs text-muted-foreground ml-auto">
                  {BRANDING_ASSETS.length} assets available
                </span>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800 flex items-start gap-2">
                <Share2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  Use these official SCCG branding assets for your marketing activities.
                  Always use the official logos and follow the brand guidelines.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {BRANDING_ASSETS.map((asset) => {
                  const Icon = ASSET_TYPE_ICON[asset.type] || FileText;
                  const colorCls = ASSET_TYPE_COLOR[asset.type] || "bg-muted text-muted-foreground border-border";
                  return (
                    <div key={asset.id} className="bg-card rounded-2xl border hover:shadow-md transition-all flex flex-col overflow-hidden">
                      {/* Preview or placeholder */}
                      <div className="w-full h-32 bg-muted/30 flex items-center justify-center border-b relative overflow-hidden">
                        {asset.previewUrl ? (
                          <img
                            src={asset.previewUrl}
                            alt={asset.title}
                            className="w-full h-full object-contain p-2"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : null}
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted/50 to-muted">
                          <Icon className="w-12 h-12 text-muted-foreground/20" />
                        </div>
                      </div>
                      {/* Info */}
                      <div className="p-4 flex flex-col flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm leading-tight text-foreground line-clamp-2">{asset.title}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border capitalize shrink-0 ${colorCls}`}>
                            {asset.type}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{asset.description}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex gap-1 flex-wrap">
                            {asset.formats.map((f) => (
                              <span key={f} className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">{f}</span>
                            ))}
                          </span>
                          <span>{asset.size}</span>
                        </div>
                        <a
                          href={asset.downloadUrl}
                          download
                          className="mt-1 inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Other Downloads (from SharePoint products) ── */}
          {resourceTab === "files" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-bold">Other Downloads</h2>
                {isAdmin && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground border border-primary/30 text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload Resource
                  </button>
                )}
              </div>
              {downloads.length === 0 ? (
                <EmptyState icon={Download} title="No additional downloads yet." subtitle="Files and resources uploaded by SCCG will appear here." />
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

          {/* Admin upload modal */}
          {showUploadModal && isAdmin && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
              <div className="bg-card rounded-2xl border shadow-2xl w-full max-w-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold">Upload Marketplace Resource</h3>
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setUploadError("");
                    }}
                    className="rounded-lg p-1.5 hover:bg-muted"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form
                  className="space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const fd = new FormData(form);
                    setUploading(true);
                    setUploadError("");
                    const res = await uploadMarketplaceResourceAction(fd);
                    setUploading(false);
                    if (!res.success) {
                      setUploadError(res.error || "Upload failed");
                      return;
                    }
                    setShowUploadModal(false);
                    form.reset();
                    router.refresh();
                  }}
                >
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Title</label>
                    <input
                      name="name"
                      required
                      placeholder="e.g. June 2026 Partner Guide"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
                    <textarea
                      name="description"
                      rows={3}
                      placeholder="Short description of the uploaded file"
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/30 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">File</label>
                    <input
                      name="file"
                      type="file"
                      required
                      className="w-full px-3 py-2.5 bg-background border border-border rounded-xl text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Max size: 10 MB</p>
                  </div>

                  {uploadError && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {uploadError}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowUploadModal(false);
                        setUploadError("");
                      }}
                      className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                    >
                      {uploading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                      ) : (
                        <><Upload className="w-4 h-4" /> Upload</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
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
