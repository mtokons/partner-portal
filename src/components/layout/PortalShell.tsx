"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

interface PortalShellProps {
  children: React.ReactNode;
  roles: string[];
  userName: string;
  company: string;
  overdueCount: number;
  unpaidInvoicesCount: number;
  siteUrl?: string | null;
  listUrls?: Record<string, string>;
}

export default function PortalShell({
  children,
  roles,
  userName,
  company,
  overdueCount,
  unpaidInvoicesCount,
  siteUrl,
  listUrls,
}: PortalShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        roles={roles} 
        open={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        siteUrl={siteUrl || undefined}
        listUrls={listUrls}
      />
      <Header
        userName={userName}
        company={company}
        overdueCount={overdueCount}
        unpaidInvoicesCount={unpaidInvoicesCount}
        onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        siteUrl={siteUrl || undefined}
        listUrls={listUrls}
      />
      <main className="lg:ml-64 mt-14 lg:mt-16 min-h-[calc(100vh-3.5rem)] lg:min-h-[calc(100vh-4rem)]">
        <div className="p-4 sm:p-5 lg:p-7 max-w-[1600px]">
          {children}
        </div>
      </main>
    </div>
  );
}
