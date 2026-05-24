"use client";

import { useState } from "react";
import DynamicSidebar from "@/components/layout/DynamicSidebar";
import Header from "@/components/layout/Header";
import { resolveMenu } from "@/lib/menu-engine";
import type { ConsoleType, MenuConfigRecord } from "@/lib/menu-engine";

interface ConsoleShellProps {
  children: React.ReactNode;
  console: ConsoleType;
  roles: string[];
  userName: string;
  company: string;
  overdueCount: number;
  unpaidInvoicesCount: number;
  siteUrl?: string | null;
  listUrls?: Record<string, string>;
  tierStatus?: string;
  marginPercentage?: number;
  /** Role-level menu overrides from DB */
  roleMenuOverrides?: MenuConfigRecord[];
  /** User-level menu overrides from DB */
  userMenuOverrides?: MenuConfigRecord[];
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
}: ConsoleShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Resolve final menu items for this console + overrides
  const menuItems = resolveMenu(consoleName, roleMenuOverrides, userMenuOverrides);

  return (
    <div className="min-h-screen bg-background">
      <DynamicSidebar
        console={consoleName}
        menuItems={menuItems}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        tierStatus={tierStatus}
        marginPercentage={marginPercentage}
      />
      <Header
        userName={userName}
        company={company}
        overdueCount={overdueCount}
        unpaidInvoicesCount={unpaidInvoicesCount}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        siteUrl={siteUrl || undefined}
        listUrls={listUrls}
        tierStatus={tierStatus}
      />
      <main className="lg:ml-64 mt-14 lg:mt-16 min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-4rem)]">
        <div className="p-4 sm:p-5 lg:p-7 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
}
