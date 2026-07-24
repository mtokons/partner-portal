"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { firebaseAuthAction } from "@/lib/actions";
import { firebaseLogin, getFirebaseAuth } from "@/lib/firebase-auth";

const demoEmail = process.env.NEXT_PUBLIC_PUBLIC_DEMO_EMAIL || "public.demo@mysccg.de";
const demoPassword = process.env.NEXT_PUBLIC_PUBLIC_DEMO_PASSWORD || "PortalDemo2026!";

export default function DemoLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(demoEmail);
  const [password, setPassword] = useState(demoPassword);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await firebaseLogin(email, password);
      if (!result.success) {
        setError(result.error || "Demo login failed.");
        return;
      }

      const auth = getFirebaseAuth();
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError("Could not get authentication token.");
        return;
      }

      const sessionResult = await firebaseAuthAction(idToken);
      if (!sessionResult.success) {
        setError(sessionResult.error || "Demo session setup failed.");
        return;
      }

      router.push("/demo/roles");
      router.refresh();
    } catch {
      setError("Unexpected error during demo login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl border border-cyan-400/30 bg-cyan-500/10 p-8">
          <p className="inline-flex rounded-full border border-cyan-300/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-200">
            Separate ERP Demo Portal
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight">Demo Login</h1>
          <p className="mt-2 text-sm text-slate-200/90">
            This login is isolated from the regular portal login and always starts from
            <span className="mx-1 font-mono text-cyan-200">/demo</span>.
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-sm outline-none focus:border-cyan-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 pr-12 text-sm outline-none focus:border-cyan-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white"
                >
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 font-bold text-slate-950 transition-colors hover:bg-cyan-300 disabled:opacity-70"
            >
              {loading ? "Signing in..." : "Sign In To Demo"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-slate-200">
            <p className="font-semibold text-white">Quick Access Credentials</p>
            <p className="mt-2">
              Username: <span className="font-mono">{demoEmail}</span>
            </p>
            <p>
              Password: <span className="font-mono">{demoPassword}</span>
            </p>
          </div>

          <div className="mt-6 text-sm">
            <Link href="/erp-experience" className="font-semibold text-cyan-200 underline underline-offset-2 hover:text-white">
              Back to ERP experience page
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
