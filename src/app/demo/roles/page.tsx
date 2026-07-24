import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DEFAULT_MENUS, type ConsoleType } from "@/lib/menu-engine";

type DemoRoleCard = {
  id: string;
  label: string;
  console: ConsoleType;
  launchHref: string;
};

const roleCards: DemoRoleCard[] = [
  { id: "admin", label: "Admin", console: "admin", launchHref: "/admin/overview" },
  { id: "customer", label: "Customer", console: "customer", launchHref: "/customer/dashboard" },
  { id: "teacher", label: "Teacher", console: "expert", launchHref: "/expert/dashboard" },
  { id: "partner", label: "Partner", console: "partner", launchHref: "/partner/dashboard" },
  { id: "student", label: "Student", console: "student", launchHref: "/student/dashboard" },
];

export default async function DemoRoleSelectorPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/demo/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <p className="inline-flex rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-200">
            Demo Role Experience
          </p>
          <h1 className="text-3xl font-black tracking-tight">Choose a role to explore current menu flows</h1>
          <p className="text-sm text-slate-300">
            This page is separated for demo usage and lets reviewers compare Admin, Customer, Teacher, Partner, and Student menu structures.
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-2">
          {roleCards.map((role) => {
            const menu = DEFAULT_MENUS[role.console];

            return (
              <article key={role.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-cyan-200">{role.label}</h2>
                    <p className="mt-1 text-xs uppercase tracking-widest text-slate-400">Console: {role.console}</p>
                  </div>
                  <Link
                    href={role.launchHref}
                    className="rounded-lg bg-cyan-400 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-300"
                  >
                    Open Console
                  </Link>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/60 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">Current Menu</p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {menu.map((item) => (
                      <li key={item.key} className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-xs text-slate-200">
                        <span className="font-semibold text-white">{item.label}</span>
                        <span className="mt-0.5 block font-mono text-[11px] text-slate-400">{item.href}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
