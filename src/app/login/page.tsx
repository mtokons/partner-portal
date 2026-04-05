"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/lib/actions";
import { Eye, EyeOff, Zap, ArrowRight, Shield, BarChart3, Globe } from "lucide-react";

const features = [
  { icon: BarChart3, label: "Real-time analytics", desc: "Live financial dashboards" },
  { icon: Shield, label: "Secure access", desc: "Enterprise-grade security" },
  { icon: Globe, label: "Multi-currency", desc: "BDT & EUR support" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await loginAction(email, password);
    setLoading(false);
    if (result.success) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setError(result.error || "Invalid credentials. Please try again.");
    }
  }

  return (
    <div className="min-h-screen flex bg-[#060818] relative overflow-hidden">

      {/* ── Ambient background ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/12 blur-[100px]" />
        <div className="absolute top-1/2 left-0 h-[300px] w-[300px] rounded-full bg-blue-600/8 blur-[80px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* ── Left panel — branding (hidden on mobile) ── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-14 relative z-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-[15px] leading-none font-[family-name:var(--font-outfit)]">Partner Portal</p>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mt-0.5">by SCCG</p>
          </div>
        </div>

        {/* Headline */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-indigo-300 font-medium">Enterprise B2B Platform</span>
          </div>

          <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.05] tracking-tight font-[family-name:var(--font-outfit)]">
            Your business,
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              crystal clear.
            </span>
          </h1>

          <p className="mt-6 text-white/50 text-lg leading-relaxed max-w-sm">
            Access orders, financials, clients and performance insights — all in one place.
          </p>

          {/* Feature list */}
          <div className="mt-10 space-y-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                  <f.icon className="h-4.5 w-4.5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/80">{f.label}</p>
                  <p className="text-xs text-white/35">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p className="text-xs text-white/20">© 2026 SCCG. All rights reserved.</p>
      </div>

      {/* ── Right panel — login form ── */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[400px]">

          {/* Card */}
          <div className="rounded-3xl bg-white/[0.055] border border-white/10 backdrop-blur-xl p-8 shadow-2xl">

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2.5 mb-8">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <p className="text-white font-bold text-sm">SCCG Partner Portal</p>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight font-[family-name:var(--font-outfit)]">
              Welcome back
            </h2>
            <p className="text-white/40 text-sm mt-1.5 mb-8">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className={`relative rounded-xl transition-all duration-200 ${focusedField === "email" ? "ring-2 ring-indigo-500/50" : ""}`}>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@partner.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="w-full h-12 px-4 rounded-xl bg-white/8 border border-white/12 text-white placeholder:text-white/25 text-sm outline-none transition-all focus:bg-white/12 focus:border-indigo-500/50"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className={`relative rounded-xl transition-all duration-200 ${focusedField === "password" ? "ring-2 ring-indigo-500/50" : ""}`}>
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="w-full h-12 px-4 pr-12 rounded-xl bg-white/8 border border-white/12 text-white placeholder:text-white/25 text-sm outline-none transition-all focus:bg-white/12 focus:border-indigo-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                  <div className="h-4 w-4 rounded-full bg-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-400 text-[10px] font-bold">!</span>
                  </div>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Forgot password */}
              <div className="flex justify-end">
                <a href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full h-12 rounded-xl font-semibold text-sm text-white overflow-hidden transition-all duration-200 mt-2 group disabled:opacity-70"
                style={{ background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)" }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-6 rounded-2xl bg-white/4 border border-white/8 p-4">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.15em] mb-3">Demo Credentials</p>
              <div className="space-y-2">
                {[
                  { role: "Partner", email: "alice@partner.com", pass: "password123" },
                  { role: "Admin", email: "admin@portal.com", pass: "admin123" },
                  { role: "Customer", email: "maria@customer.com", pass: "customer123" },
                  { role: "Expert", email: "andreas@expert.com", pass: "expert123" },
                ].map((c) => (
                  <button
                    key={c.role}
                    type="button"
                    onClick={() => { setEmail(c.email); setPassword(c.pass); }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/8 transition-colors group"
                  >
                    <div className="text-left">
                      <p className="text-xs font-semibold text-white/60 group-hover:text-white/80 transition-colors">{c.role}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{c.email}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-white/20 group-hover:text-indigo-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>

            {/* Create account link */}
            <p className="text-center text-sm text-white/40 mt-5">
              Don&apos;t have an account?{" "}
              <a href="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Create account
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
