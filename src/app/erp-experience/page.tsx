import Link from "next/link";
import { BriefcaseBusiness, BarChart3, Users, Wallet, Workflow, ShieldCheck, Globe2, GraduationCap } from "lucide-react";

export const metadata = {
  title: "ERP Experience",
  description: "Public hands-on ERP demo experience by SCCG",
};

const modules = [
  {
    icon: Users,
    title: "Partner & Customer Management",
    desc: "Multi-portal onboarding, role-based access, lifecycle tracking, and customer journey mapping.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Sales, Offers & B2B Workflows",
    desc: "Offer creation, candidate service workflows, B2B partner network and approval flows.",
  },
  {
    icon: Wallet,
    title: "Finance & Payment Operations",
    desc: "Invoices, payouts, collections, refund support, and financial transparency dashboards.",
  },
  {
    icon: BarChart3,
    title: "Executive Dashboards",
    desc: "Real-time KPIs for operations, service pipelines, and performance monitoring.",
  },
  {
    icon: Globe2,
    title: "Multi-Currency & Localization",
    desc: "EUR-first with secondary currencies, exchange-rate support, and international workflows.",
  },
  {
    icon: Workflow,
    title: "Automation-Ready Architecture",
    desc: "SharePoint + Firebase + workflow automation with scalable modular portal architecture.",
  },
  {
    icon: ShieldCheck,
    title: "Security & Governance",
    desc: "Role-based permissions, protected routes, account states, and audit-friendly operations.",
  },
  {
    icon: GraduationCap,
    title: "Domain Extensions",
    desc: "School management, certificates, batches, experts, and educational operations modules.",
  },
];

const demoEmail = process.env.NEXT_PUBLIC_PUBLIC_DEMO_EMAIL || "public.demo@mysccg.de";
const demoPassword = process.env.NEXT_PUBLIC_PUBLIC_DEMO_PASSWORD || "PortalDemo2026!";

export default function ErpExperiencePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-14 space-y-10">
        <header className="space-y-4">
          <p className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            Public ERP Experience
          </p>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight">Experience Our ERP Before You Hire Us</h1>
          <p className="max-w-3xl text-slate-300 text-base sm:text-lg leading-relaxed">
            This live environment demonstrates how we design and deliver enterprise-ready ERP portals
            for B2B operations, customer management, sales pipelines, and financial workflows.
          </p>
        </header>

        <section className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6">
          <h2 className="text-xl font-bold text-emerald-200">Public Demo Login</h2>
          <p className="mt-1 text-sm text-emerald-100/90">Use these credentials to access the demo and explore the experience directly.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-xs text-slate-300">Username</p>
              <p className="mt-1 font-mono text-white break-all">{demoEmail}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/5 p-3">
              <p className="text-xs text-slate-300">Password</p>
              <p className="mt-1 font-mono text-white break-all">{demoPassword}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="inline-flex items-center rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400 transition-colors"
            >
              Open Demo Login
            </Link>
            <Link
              href="/demo/roles"
              className="inline-flex items-center rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              Open Demo Role Selector
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-4">What This ERP Demonstrates</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((m) => (
              <article key={m.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-cyan-500/15 p-2 border border-cyan-400/30">
                    <m.icon className="h-5 w-5 text-cyan-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{m.title}</h3>
                    <p className="mt-1 text-sm text-slate-300 leading-relaxed">{m.desc}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="pt-4 border-t border-white/10 text-sm text-slate-400">
          Submission Link: https://portal.mysccg.de/erp-experience
        </footer>
      </div>
    </div>
  );
}
