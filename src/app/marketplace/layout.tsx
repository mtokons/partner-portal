import { getEffectiveUser } from "@/lib/effective-user";
import MarketplaceNavbar from "./MarketplaceNavbar";
import Link from "next/link";
import { Store, ShieldCheck, Truck, Headphones } from "lucide-react";

export const metadata = {
  title: "SCCG Marketplace | Public Service & Product Catalog",
  description: "Browse SCCG service packages and educational products. Direct enrollment, secure payments, and worldwide fulfillment.",
};

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getEffectiveUser();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900 selection:bg-[#0F4C81] selection:text-white">
      {/* Top Navigation Bar with German Flag Ribbon and Login/Register */}
      <MarketplaceNavbar user={user} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200/80 bg-white mt-16 text-xs text-slate-600 shadow-sm">
        {/* German Flag 4-color micro-bar */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#111827] via-[#0F4C81] via-[#DC2626] to-[#F59E0B]" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0F4C81] shrink-0 shadow-sm">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Direct E-Commerce</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Browse and purchase verified SCCG services with instant order issuance.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-sm">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Secure Payments</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Online cards, mobile banking, bank wires, and SCCG coin loyalty wallets.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 shadow-sm">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Instant Fulfillment</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Automatic document delivery, invoice generation, and portal onboarding.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0 shadow-sm">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Dedicated Support</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Direct client helpdesk and German partner advisory support.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-center sm:text-left">
              &copy; {new Date().getFullYear()} SCCG &middot; SCCG Career Lab UG (haftungsbeschr&auml;nkt) &middot; Hamburg, Germany. All rights reserved.
            </p>
            <div className="flex items-center gap-5 text-slate-600 font-medium">
              <Link href="/login" className="hover:text-[#0F4C81] transition-colors">
                Partner Login
              </Link>
              <Link href="/register" className="hover:text-[#0F4C81] transition-colors">
                Become a Partner
              </Link>
              <Link href="/marketplace" className="hover:text-[#0F4C81] transition-colors">
                Marketplace
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
