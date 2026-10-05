"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Promotion } from "@/types";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  GraduationCap,
  Briefcase,
  HelpCircle,
  Tag,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Percent,
  Flame,
  Globe,
  Award,
  TrendingUp,
  FileCheck,
  BadgePercent,
  Check,
  Building2,
  Info,
} from "lucide-react";

interface MarketplaceHeroSliderProps {
  promotions?: Promotion[];
  liveEurToBdtRate?: number;
  cartTotal: number;
  cartCount: number;
  onProceedToCheckout: () => void;
  onOpenGuide: () => void;
  onSelectCategory?: (category: string) => void;
}

interface BannerSlide {
  id: string;
  badge: string;
  badgeIcon: React.ElementType;
  badgeColor: string;
  titlePrefix: string;
  titleHighlight: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaCategory?: string;
  ctaHref?: string;
  bgGradient: string;
  accentBorder: string;
  visualTheme: "flagship" | "ausbildung" | "language" | "partner" | "promo";
  posterBadge: string;
  posterHighlight: string;
  posterSubtext: string;
  posterTags: string[];
}

export default function MarketplaceHeroSlider({
  promotions = [],
  liveEurToBdtRate = 140.2,
  cartTotal,
  cartCount,
  onProceedToCheckout,
  onOpenGuide,
  onSelectCategory,
}: MarketplaceHeroSliderProps) {
  // ── 2.5% Bangladesh Government Incentive / Bonus Calculation ───────────
  const baseRate = liveEurToBdtRate > 0 ? liveEurToBdtRate : 140.2;
  const govBonusPercent = 2.5;
  const govBonusAmountPerEur = Number((baseRate * 0.025).toFixed(2));
  const effectiveRate = Number((baseRate * 1.025).toFixed(2));

  // Cart conversion with 2.5% Gov Bonus included
  const cartBdtStandard = Math.round(cartTotal * baseRate);
  const cartBdtWithBonus = Math.round(cartTotal * effectiveRate);
  const cartGovBonusEarned = Math.round(cartTotal * govBonusAmountPerEur);

  // Parallax tilt state for movable poster
  const posterRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, x: 0, y: 0 });
  const [isHoveringPoster, setIsHoveringPoster] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!posterRef.current) return;
    const rect = posterRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Mild tilt factor
    const rotateY = (x / (rect.width / 2)) * 10;
    const rotateX = -(y / (rect.height / 2)) * 10;
    setTilt({ rotateX, rotateY, x: x * 0.05, y: y * 0.05 });
  };

  const handleMouseLeave = () => {
    setIsHoveringPoster(false);
    setTilt({ rotateX: 0, rotateY: 0, x: 0, y: 0 });
  };

  // Base flagship slides with custom movable poster designs
  const baseSlides: BannerSlide[] = useMemo(
    () => [
      {
        id: "flagship-store",
        badge: "Live Store • SCCG German Education & Career Marketplace",
        badgeIcon: Globe,
        badgeColor: "bg-[#0F4C81] text-white",
        titlePrefix: "Direct Access to ",
        titleHighlight: "German Services & Careers",
        description:
          "Verified SCCG training programs, official telc certifications, dual Ausbildung admissions, and relocation advisory with instant enrollment.",
        features: [
          "Official telc German Exam Partner",
          "Dual Ausbildung (Zero Tuition)",
          "Direct Embassy Legal Dossier",
        ],
        ctaLabel: "Explore All Services",
        ctaCategory: "all",
        bgGradient: "from-white via-slate-50 to-blue-50/50",
        accentBorder: "border-blue-200/70",
        visualTheme: "flagship",
        posterBadge: "🇩🇪 Official Germany Hub",
        posterHighlight: "SCCG telc Academy",
        posterSubtext: "Verified European Pathway & Accredited Certifications",
        posterTags: ["telc Accredited", "Embassy Approved", "Dual Degree"],
      },
      {
        id: "ausbildung-offer",
        badge: "🔥 2026/2027 Intakes Open • Dual Vocational Training",
        badgeIcon: Flame,
        badgeColor: "bg-gradient-to-r from-amber-600 to-rose-600 text-white",
        titlePrefix: "Dual Vocational Training: ",
        titleHighlight: "Earn €1,000–€1,450/Month",
        description:
          "100% tuition-free Ausbildung with guaranteed monthly stipend from day 1 in Nursing, IT, Mechatronics, and Hospitality with pre-arranged employer contracts.",
        features: [
          "Zero Tuition Fees & Monthly Stipend",
          "Comprehensive Visa & Dossier Pack",
          "Permanent Residency Track in 3 Years",
        ],
        ctaLabel: "View Ausbildung Programs",
        ctaCategory: "Ausbildung",
        bgGradient: "from-amber-50/40 via-white to-orange-50/40",
        accentBorder: "border-amber-200/80",
        visualTheme: "ausbildung",
        posterBadge: "🚀 Dual Ausbildung 2026/27",
        posterHighlight: "€1,450/mo Stipend",
        posterSubtext: "Pre-arranged German Employer Contract with Zero Tuition",
        posterTags: ["Healthcare & IT", "Day-1 Salary", "PR in 3 Years"],
      },
      {
        id: "language-promo",
        badge: "⚡ Current Offer • Save up to 25% on Language Bundles",
        badgeIcon: Sparkles,
        badgeColor: "bg-gradient-to-r from-indigo-600 to-blue-600 text-white",
        titlePrefix: "German Language Mastery: ",
        titleHighlight: "A1 to B2 with telc Exam Voucher",
        description:
          "Intensive online & hybrid masterclasses with native German certified mentors. Includes free mock exam evaluation and guaranteed test seat reservation.",
        features: [
          "Native Goethe / telc Certified Mentors",
          "Free Mock Exams & Assessment",
          "Fast-Track Embassy Appointment Proof",
        ],
        ctaLabel: "Explore Language Courses",
        ctaCategory: "German Language",
        bgGradient: "from-blue-50/50 via-white to-indigo-50/40",
        accentBorder: "border-indigo-200/80",
        visualTheme: "language",
        posterBadge: "📜 Official telc Voucher",
        posterHighlight: "25% Off Bundles",
        posterSubtext: "Guaranteed Exam Seat & Native German Mentorship",
        posterTags: ["A1 → B2 Track", "Free Mock Exam", "Visa Compliant"],
      },
      {
        id: "partner-program",
        badge: "🤝 B2B Opportunities • Partner Margins up to 25%",
        badgeIcon: Briefcase,
        badgeColor: "bg-slate-900 text-white",
        titlePrefix: "Scale Your Agency: ",
        titleHighlight: "Partner with SCCG Germany",
        description:
          "Earn competitive partner margins, white-label client management, instant Telegram order fulfillment, and multi-currency EUR/BDT settlements.",
        features: [
          "Up to 25% Partner Commission Margin",
          "Real-Time Multi-Currency Settlement",
          "Instant Certificate & Telegram Dispatch",
        ],
        ctaLabel: "Become a Partner",
        ctaHref: "/register",
        bgGradient: "from-slate-50 via-white to-slate-100/60",
        accentBorder: "border-slate-300/80",
        visualTheme: "partner",
        posterBadge: "💼 Agency Network",
        posterHighlight: "Up to 25% Margin",
        posterSubtext: "White-Label Processing & Live Multi-Currency Settlement",
        posterTags: ["EUR/BDT Payout", "Telegram API", "Dedicated AM"],
      },
    ],
    []
  );

  // Append any active promotions from database if available
  const allSlides = useMemo(() => {
    if (!promotions || promotions.length === 0) return baseSlides;

    const promoSlides: BannerSlide[] = promotions.slice(0, 3).map((promo, idx) => ({
      id: `db-promo-${promo.id || idx}`,
      badge: `🎉 Special Promo • ${promo.type.toUpperCase()}`,
      badgeIcon: Tag,
      badgeColor: "bg-[#DC2626] text-white",
      titlePrefix: "Exclusive Offer: ",
      titleHighlight: promo.title,
      description:
        promo.description ||
        "Limited-time promotional pricing available directly on SCCG marketplace services.",
      features: [
        promo.discountValue > 0
          ? promo.discountType === "percent"
            ? `${promo.discountValue}% Discount Applied`
            : `Save €${promo.discountValue} Directly`
          : "Verified Service Package",
        promo.endDate
          ? `Valid until ${new Date(promo.endDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}`
          : "Limited Seats Available",
        "Instant Checkout & Activation",
      ],
      ctaLabel: "Shop This Promo",
      ctaCategory: "all",
      bgGradient: "from-rose-50/40 via-white to-pink-50/40",
      accentBorder: "border-rose-200/80",
      visualTheme: "promo",
      posterBadge: "🏷️ Limited Deal",
      posterHighlight:
        promo.discountValue > 0
          ? promo.discountType === "percent"
            ? `${promo.discountValue}% OFF`
            : `€${promo.discountValue} OFF`
          : "SPECIAL OFFER",
      posterSubtext: promo.title,
      posterTags: ["Instant Apply", "Secure Checkout", "Direct Issuance"],
    }));

    return [...baseSlides, ...promoSlides];
  }, [baseSlides, promotions]);

  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % allSlides.length);
  }, [allSlides.length]);

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + allSlides.length) % allSlides.length);
  }, [allSlides.length]);

  // Autoplay timer
  useEffect(() => {
    if (!isAutoPlaying || allSlides.length <= 1) return;
    const interval = setInterval(nextSlide, 6500);
    return () => clearInterval(interval);
  }, [isAutoPlaying, nextSlide, allSlides.length]);

  const slide = allSlides[current] || allSlides[0];
  const BadgeIcon = slide.badgeIcon;

  const handleCtaClick = () => {
    if (slide.ctaCategory && onSelectCategory) {
      onSelectCategory(slide.ctaCategory);
      const catalogEl = document.getElementById("marketplace-catalog");
      if (catalogEl) {
        catalogEl.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border ${slide.accentBorder} bg-gradient-to-br ${slide.bgGradient} p-5 sm:p-7 lg:p-9 shadow-sm transition-all duration-500`}
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* ── German Flag & SCCG 4-Color Accent Top Stripe ─────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#111827] via-[#0F4C81] via-[#DC2626] to-[#F59E0B]" />

      {/* Subtle Background Radial Glows */}
      <div className="absolute -right-28 -top-28 w-96 h-96 rounded-full bg-blue-100/40 blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-amber-100/30 blur-3xl pointer-events-none" />

      {/* ── Main Banner Content Layout ────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6 lg:gap-8">
        {/* Left Column: Slide Content & Rates */}
        <div className="flex-1 max-w-2xl space-y-3.5">
          {/* Top Pill Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-tight px-3 py-1 rounded-full shadow-2xs ${slide.badgeColor}`}
            >
              <BadgeIcon className="w-3.5 h-3.5" />
              <span>{slide.badge}</span>
            </span>

            {/* How to Order Guide Pill Button */}
            <button
              onClick={onOpenGuide}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 hover:bg-white text-slate-800 border border-slate-300 text-xs font-bold shadow-2xs hover:border-[#0F4C81] transition-all group active:scale-95"
              title="Click to view visual step-by-step order guide"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#0F4C81] group-hover:rotate-12 transition-transform" />
              <span className="text-[#0F4C81]">How to Order Guide</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-black">
                FLOWCHART
              </span>
            </button>
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 leading-[1.18] transition-all">
            <span>{slide.titlePrefix}</span>
            <span className="bg-gradient-to-r from-[#111827] via-[#0F4C81] via-[#DC2626] to-[#F59E0B] bg-clip-text text-transparent drop-shadow-xs">
              {slide.titleHighlight}
            </span>
          </h1>

          {/* Description */}
          <p className="text-slate-600 text-sm leading-relaxed font-normal">
            {slide.description}
          </p>

          {/* Feature Highlights Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {slide.features.map((feat, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/95 border border-slate-200/90 text-xs font-semibold text-slate-700 shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{feat}</span>
              </span>
            ))}
          </div>

          {/* Action Button & Live Effective Rate Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {slide.ctaHref ? (
              <Link
                href={slide.ctaHref}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F4C81] hover:bg-[#0C3E6B] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 group"
              >
                <span>{slide.ctaLabel}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            ) : (
              <button
                onClick={handleCtaClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0F4C81] hover:bg-[#0C3E6B] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 group"
              >
                <span>{slide.ctaLabel}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            )}

            {/* Official European Marketplace Currency */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/95 border border-slate-200 text-xs font-bold text-slate-800 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#0F4C81]" />
              <span>
                Base Currency: <strong className="font-bold text-[#0F4C81]">European Euro (€)</strong>
              </span>
            </div>
          </div>
        </div>

        {/* ── Center/Right: Interactive Animated "Movable Poster" ─────────────── */}
        <div
          ref={posterRef}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsHoveringPoster(true)}
          onMouseLeave={handleMouseLeave}
          style={{
            perspective: 1000,
          }}
          className="relative w-full xl:w-72 2xl:w-80 h-64 sm:h-72 select-none"
        >
          {/* Movable Card Container with 3D Parallax & Gentle Floating Animation */}
          <div
            style={{
              transform: `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(10px)`,
              transition: isHoveringPoster ? "transform 0.1s ease-out" : "transform 0.6s ease-out",
            }}
            className="w-full h-full relative rounded-3xl p-5 bg-gradient-to-br from-slate-900 via-[#0B2545] to-[#134074] text-white shadow-xl border border-slate-700/60 overflow-hidden flex flex-col justify-between animate-float-gentle group cursor-pointer"
            title="Interactive 3D Movable Poster - Tilt mouse to interact"
          >
            {/* Top German Ribbon Accent inside Poster */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#111827] via-[#0F4C81] via-[#DC2626] to-[#F59E0B]" />

            {/* Ambient Background Graphic Silhouette */}
            <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-blue-500/20 blur-2xl pointer-events-none" />
            <div className="absolute -left-8 -top-8 w-32 h-32 rounded-full bg-amber-500/15 blur-xl pointer-events-none" />

            {/* Poster Header */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-black tracking-wide uppercase text-amber-300 flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                {slide.posterBadge}
              </span>

              {/* Mini Flag / Logo Tag */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/40 border border-white/10 text-[10px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#111827]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                <span>DE</span>
              </div>
            </div>

            {/* Poster Center Visuals: dynamic graphic according to visualTheme */}
            <div className="relative z-10 my-auto text-center space-y-1">
              {slide.visualTheme === "flagship" && (
                <div className="inline-flex p-3 rounded-2xl bg-blue-500/20 border border-blue-400/30 text-blue-200 mb-1 shadow-inner">
                  <Building2 className="w-8 h-8 text-blue-300" />
                </div>
              )}
              {slide.visualTheme === "ausbildung" && (
                <div className="inline-flex p-3 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-200 mb-1 shadow-inner">
                  <GraduationCap className="w-8 h-8 text-amber-300" />
                </div>
              )}
              {slide.visualTheme === "language" && (
                <div className="inline-flex p-3 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 mb-1 shadow-inner">
                  <Award className="w-8 h-8 text-indigo-300" />
                </div>
              )}
              {slide.visualTheme === "partner" && (
                <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 mb-1 shadow-inner">
                  <Briefcase className="w-8 h-8 text-emerald-300" />
                </div>
              )}
              {slide.visualTheme === "promo" && (
                <div className="inline-flex p-3 rounded-2xl bg-rose-500/20 border border-rose-400/30 text-rose-200 mb-1 shadow-inner">
                  <Tag className="w-8 h-8 text-rose-300" />
                </div>
              )}

              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                {slide.posterHighlight}
              </h3>
              <p className="text-[11px] text-slate-300 max-w-[210px] mx-auto line-clamp-2 leading-tight">
                {slide.posterSubtext}
              </p>
            </div>

            {/* Poster Footer: Interactive Floating Feature Tags */}
            <div className="relative z-10 flex flex-wrap gap-1.5 justify-center">
              {slide.posterTags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md bg-white/10 hover:bg-white/20 border border-white/15 text-[10px] font-bold text-slate-200 backdrop-blur-sm transition-transform hover:scale-105"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Interactive "Tilt to Move" Hint Pill */}
            <div className="absolute bottom-1 right-2 text-[9px] text-slate-400/60 font-mono">
              ✦ movable 3D
            </div>
          </div>
        </div>

        {/* ── Right Column: Cart Summary & Checkout Box ─────────────────────── */}
        <div className="xl:w-72 shrink-0 flex flex-col sm:flex-row xl:flex-col gap-4 bg-white/95 backdrop-blur-md p-5 rounded-2xl border border-slate-200/90 shadow-md">
          {/* Cart Status & Live Calculation with 2.5% Gov Bonus */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Cart Subtotal
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#0F4C81] border border-blue-100">
                {cartCount} {cartCount === 1 ? "Item" : "Items"}
              </span>
            </div>

            <div className="pt-0.5">
              <p className="text-3xl font-black text-[#0F4C81] tracking-tight">
                €{cartTotal.toLocaleString()}
              </p>
            </div>

            <p className="text-[11px] text-slate-500 pt-0.5 leading-snug">
              {cartCount > 0
                ? "Ready for checkout."
                : "Select any course or program to add to your order."}
            </p>
          </div>

          {/* Checkout Button */}
          <button
            onClick={onProceedToCheckout}
            disabled={cartCount === 0}
            className="group relative flex items-center justify-center gap-2.5 w-full py-3.5 px-4 bg-[#0F4C81] hover:bg-[#0C3E6B] text-white rounded-xl font-bold text-sm shadow-md shadow-blue-900/15 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >
            <ShoppingBag className="h-4 w-4 group-hover:rotate-12 transition-transform" />
            <span>Checkout Now</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            {cartCount > 0 && (
              <span className="absolute -top-2.5 -right-2.5 h-6 w-6 rounded-full bg-[#DC2626] text-white text-xs font-black flex items-center justify-center border-2 border-white shadow-md animate-in zoom-in duration-300">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Bottom Slider Controls Bar ────────────────────────────────────────── */}
      <div className="relative z-10 mt-5 pt-3.5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
        {/* Slide Counter & Title Snippet */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <span className="font-mono text-[#0F4C81]">
            0{current + 1}
          </span>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-slate-400">0{allSlides.length}</span>
          <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-slate-300" />
          <span className="hidden sm:inline-block text-slate-500 font-semibold truncate max-w-xs">
            {slide.titleHighlight}
          </span>
        </div>

        {/* Dots Navigation */}
        <div className="flex items-center gap-1.5">
          {allSlides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrent(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === current
                  ? "w-8 bg-[#0F4C81]"
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
              title={`Go to slide: ${s.titleHighlight}`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Prev / Next Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={prevSlide}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs hover:border-[#0F4C81] transition-all active:scale-95"
            title="Previous Offer"
            aria-label="Previous Offer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextSlide}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shadow-2xs hover:border-[#0F4C81] transition-all active:scale-95"
            title="Next Offer"
            aria-label="Next Offer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
