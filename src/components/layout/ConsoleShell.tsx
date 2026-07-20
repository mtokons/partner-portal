"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import DynamicSidebar from "@/components/layout/DynamicSidebar";
import Header from "@/components/layout/Header";
import { resolveMenu, isManagementMenuKey } from "@/lib/menu-engine";
import type { ConsoleType, MenuConfigRecord } from "@/lib/menu-engine";

const SHELL_THEME: Record<ConsoleType, { shellClass: string; frameClass: string }> = {
  admin: {
    shellClass: "role-admin",
    frameClass: "portal-frame-admin",
  },
  partner: {
    shellClass: "role-partner",
    frameClass: "portal-frame-partner",
  },
  customer: {
    shellClass: "role-customer",
    frameClass: "portal-frame-customer",
  },
  expert: {
    shellClass: "role-expert",
    frameClass: "portal-frame-expert",
  },
  student: {
    shellClass: "role-student",
    frameClass: "portal-frame-student",
  },
  "school-admin": {
    shellClass: "role-admin",
    frameClass: "portal-frame-admin",
  },
  "project-partner": {
    shellClass: "role-partner",
    frameClass: "portal-frame-partner",
  },
  "job-seeker": {
    shellClass: "role-customer",
    frameClass: "portal-frame-customer",
  },
  "job-partner": {
    shellClass: "role-partner",
    frameClass: "portal-frame-partner",
  },
  "ausbildung-seeker": {
    shellClass: "role-student",
    frameClass: "portal-frame-student",
  },
  "ausbildung-partner": {
    shellClass: "role-partner",
    frameClass: "portal-frame-partner",
  },
};

interface ConsoleShellProps {
  children: React.ReactNode;
  console: ConsoleType;
  roles: string[];
  userName: string;
  company: string;
  overdueCount?: number;
  unpaidInvoicesCount?: number;
  siteUrl?: string | null;
  listUrls?: Record<string, string>;
  tierStatus?: string;
  marginPercentage?: number;
  /** Role-level menu overrides from DB */
  roleMenuOverrides?: MenuConfigRecord[];
  /** User-level menu overrides from DB */
  userMenuOverrides?: MenuConfigRecord[];
  partnerLogoUrl?: string;
  /** True when an admin is impersonating this user */
  impersonating?: boolean;
}

const CONSOLE_THEME: Record<ConsoleType, string> = {
  admin: "console-theme-admin",
  partner: "console-theme-partner",
  customer: "console-theme-customer",
  expert: "console-theme-expert",
  student: "console-theme-student",
  "school-admin": "console-theme-admin",
  "project-partner": "console-theme-partner",
  "job-seeker": "console-theme-customer",
  "job-partner": "console-theme-partner",
  "ausbildung-seeker": "console-theme-student",
  "ausbildung-partner": "console-theme-partner",
};

/** Ornate arabesque medallion inspired by carved calligraphic artwork, without text. */
function CalligraphyArt() {
  const petals = Array.from({ length: 12 }, (_, index) => ({
    key: `petal-${index}`,
    rotate: index * 30,
    delay: `${0.18 + index * 0.06}s`,
  }));
  const innerPetals = Array.from({ length: 12 }, (_, index) => ({
    key: `inner-${index}`,
    rotate: index * 30 + 15,
    delay: `${0.32 + index * 0.05}s`,
  }));

  return (
    <svg
      className="calli-layer"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <radialGradient id="medallionGlow" cx="50%" cy="50%" r="58%">
          <stop offset="0%" stopColor="var(--ornate-glow)" stopOpacity="0.26" />
          <stop offset="58%" stopColor="var(--ornate-glow)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--ornate-glow)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="goldStroke" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="var(--ornate-gold-soft)" />
          <stop offset="45%" stopColor="var(--ornate-gold)" />
          <stop offset="100%" stopColor="var(--ornate-gold-deep)" />
        </linearGradient>
        <linearGradient id="petalFill" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="var(--ornate-teal-soft)" />
          <stop offset="100%" stopColor="var(--ornate-teal-deep)" />
        </linearGradient>
      </defs>

      <g transform="translate(1040 380) scale(1.18)" opacity="0.78" className="ornate-medallion">
        <circle r="320" fill="url(#medallionGlow)" className="ornate-fade" />

        <g className="ornate-medallion-slow">
        {petals.map((petal) => (
          <g key={petal.key} transform={`rotate(${petal.rotate})`} className="ornate-fade" style={{ animationDelay: petal.delay }}>
            <path
              d="M 0 -46 C 62 -78 122 -162 138 -254 C 152 -336 118 -400 0 -438 C -118 -400 -152 -336 -138 -254 C -122 -162 -62 -78 0 -46 Z"
              fill="url(#petalFill)"
              fillOpacity="0.26"
              stroke="url(#goldStroke)"
              strokeWidth="6"
              className="ornate-petal ornate-shimmer"
            />
            <path
              d="M 0 -80 C 42 -108 88 -170 94 -238 C 100 -304 72 -346 0 -378 C -72 -346 -100 -304 -94 -238 C -88 -170 -42 -108 0 -80 Z"
              fill="none"
              stroke="url(#goldStroke)"
              strokeWidth="2.2"
              strokeOpacity="0.75"
              className="ornate-line"
            />
            <path
              d="M 0 -102 C 14 -142 24 -178 18 -220"
              fill="none"
              stroke="url(#goldStroke)"
              strokeWidth="2"
              strokeOpacity="0.62"
              className="ornate-line"
            />
          </g>
        ))}
        </g>

        <g className="ornate-medallion-reverse">
        {innerPetals.map((petal) => (
          <g key={petal.key} transform={`rotate(${petal.rotate}) scale(0.72)`} className="ornate-fade" style={{ animationDelay: petal.delay }}>
            <path
              d="M 0 -34 C 42 -58 78 -112 92 -174 C 102 -226 84 -276 0 -308 C -84 -276 -102 -226 -92 -174 C -78 -112 -42 -58 0 -34 Z"
              fill="var(--ornate-ink)"
              fillOpacity="0.18"
              stroke="url(#goldStroke)"
              strokeWidth="4.4"
              className="ornate-petal ornate-shimmer"
            />
          </g>
        ))}
        </g>

        <g className="ornate-fade" style={{ animationDelay: '0.14s' }}>
          <circle r="182" fill="var(--ornate-ink)" fillOpacity="0.16" stroke="url(#goldStroke)" strokeWidth="10" className="ornate-ring" />
          <circle r="154" fill="none" stroke="url(#goldStroke)" strokeWidth="3" strokeDasharray="10 8" strokeOpacity="0.78" className="ornate-line ornate-shimmer" />
          <circle r="124" fill="var(--ornate-teal-deep)" fillOpacity="0.14" stroke="url(#goldStroke)" strokeWidth="6" className="ornate-ring" />
          <circle r="98" fill="none" stroke="url(#goldStroke)" strokeWidth="2.6" strokeOpacity="0.72" className="ornate-line" />
          <path
            d="M 0 -80 C 18 -62 28 -42 28 -10 C 28 34 10 56 0 72 C -10 56 -28 34 -28 -10 C -28 -42 -18 -62 0 -80 Z"
            fill="var(--ornate-teal-soft)"
            fillOpacity="0.18"
            stroke="url(#goldStroke)"
            strokeWidth="3.4"
            className="ornate-core ornate-shimmer"
          />
          <path
            d="M -80 0 C -62 18 -42 28 -10 28 C 34 28 56 10 72 0 C 56 -10 34 -28 -10 -28 C -42 -28 -62 -18 -80 0 Z"
            fill="var(--ornate-teal-soft)"
            fillOpacity="0.14"
            stroke="url(#goldStroke)"
            strokeWidth="3"
            className="ornate-core ornate-shimmer"
          />
        </g>

        <g opacity="0.82">
          <path d="M -360 -74 C -334 -102 -296 -104 -272 -82" fill="none" stroke="url(#goldStroke)" strokeWidth="3.8" strokeOpacity="0.45" className="ornate-line ornate-fade" style={{ animationDelay: '0.86s' }} />
          <path d="M -302 -18 C -252 -52 -216 -48 -182 -6" fill="none" stroke="url(#goldStroke)" strokeWidth="2.8" strokeOpacity="0.34" className="ornate-line ornate-fade" style={{ animationDelay: '1.05s' }} />
          <path d="M 236 246 C 278 224 316 228 344 260" fill="none" stroke="url(#goldStroke)" strokeWidth="3.8" strokeOpacity="0.44" className="ornate-line ornate-fade" style={{ animationDelay: '1.18s' }} />
          <path d="M 286 -262 C 324 -284 366 -278 394 -244" fill="none" stroke="url(#goldStroke)" strokeWidth="2.8" strokeOpacity="0.32" className="ornate-line ornate-fade" style={{ animationDelay: '1.28s' }} />
        </g>
      </g>
    </svg>
  );
}

export default function ConsoleShell({
  children,
  console: consoleName,
  roles,
  userName,
  company,
  overdueCount,
  unpaidInvoicesCount,
  siteUrl,
  listUrls,
  tierStatus,
  marginPercentage,
  roleMenuOverrides,
  userMenuOverrides,
  partnerLogoUrl,
  impersonating,
}: ConsoleShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const theme = SHELL_THEME[consoleName];

  // Resolve final menu items for this console + overrides
  const themeClass = CONSOLE_THEME[consoleName];
  const resolvedMenu = resolveMenu(consoleName, roleMenuOverrides, userMenuOverrides);
  // Hide management (ppa.*) items from read-only viewers
  const lowerRoles = (roles || []).map((r) => r.toLowerCase());
  const canManage = lowerRoles.includes("admin") || lowerRoles.includes("project-partner-admin");
  const menuItems = canManage ? resolvedMenu : resolvedMenu.filter((m) => !isManagementMenuKey(m.key));

  const pathname = usePathname();
  const isFullBleed = pathname?.includes("/cv-suite/create") || pathname?.includes("/cv-maker");

  return (
    <div className={`console-theme ${themeClass} portal-shell ${theme.shellClass}`}>
      <div aria-hidden className="portal-orbs" />
      <div className="console-backdrop" aria-hidden="true" />
      <div className="console-orb console-orb-one" aria-hidden="true" />
      <div className="console-orb console-orb-two" aria-hidden="true" />
      <CalligraphyArt />
      <DynamicSidebar
        console={consoleName}
        menuItems={menuItems}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tierStatus={tierStatus}
        marginPercentage={marginPercentage}
        partnerLogoUrl={partnerLogoUrl}
      />
      <Header
        userName={userName}
        company={company}
        overdueCount={overdueCount ?? 0}
        unpaidInvoicesCount={unpaidInvoicesCount ?? 0}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        siteUrl={siteUrl || undefined}
        listUrls={listUrls}
        tierStatus={tierStatus}
      />
      <main className={`relative lg:ml-64 min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-4rem)] ${impersonating ? "mt-24 lg:mt-26" : "mt-14 lg:mt-16"}`}>
        {isFullBleed ? (
          <div className="w-full h-full min-h-[calc(100vh-4rem)]">
            {children}
          </div>
        ) : (
          <div className="console-content p-4 sm:p-5 lg:p-7 max-w-[1600px]">
            <div className={`portal-content-frame ${theme.frameClass}`}>
              {children}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
