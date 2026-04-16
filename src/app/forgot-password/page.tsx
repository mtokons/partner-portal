"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, ArrowLeft, Mail, CheckCircle2, ArrowRight } from "lucide-react";
import { firebaseResetPassword, isFirebaseConfigured } from "@/lib/firebase-auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const firebaseReady = isFirebaseConfigured();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await firebaseResetPassword(email);
    setLoading(false);
    if (result.success) {
      setSent(true);
    } else {
      setError(result.error || "Failed to send reset email.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060818] relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/12 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="w-full max-w-md mx-auto p-6 relative z-10">
        <div className="rounded-3xl bg-white/[0.055] border border-white/10 backdrop-blur-xl p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <img src="/assets/sccg-logo.png" alt="SCCG Logo" className="h-10 w-auto object-contain" />
            <p className="text-white font-bold text-sm border-l border-white/10 pl-3 lowercase">SCCG Partner Portal</p>
          </div>

          {sent ? (
            <div className="text-center py-4">
              <div className="mx-auto h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-5">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <h2 className="text-xl font-black text-white mb-2">Check Your Email</h2>
              <p className="text-white/50 text-sm mb-6">
                We sent a password reset link to <strong className="text-white/80">{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black text-white tracking-tight">Reset Password</h2>
              <p className="text-white/40 text-sm mt-1.5 mb-6">
                Enter your email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Email Address</label>
                  <div className="relative rounded-xl">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full h-12 pl-10 pr-4 rounded-xl bg-white/8 border border-white/12 text-white placeholder:text-white/25 text-sm outline-none transition-all focus:bg-white/12 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !firebaseReady}
                  className="relative w-full h-12 rounded-xl font-semibold text-sm text-white overflow-hidden transition-all duration-200 group disabled:opacity-70"
                  style={{ background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)" }}
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
                </button>
              </form>

              <p className="text-center text-sm text-white/40 mt-6">
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors inline-flex items-center gap-1">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
                </Link>
              </p>
            </>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 text-[10px] text-white/20 text-center space-y-1">
            <p className="font-semibold text-white/30 truncate uppercase tracking-widest leading-none">SCCG CAREER LAB UG (HAFTUNGSBESCHRÄNKT)</p>
            <p>Julius-Ludowieg-Straße 46, 21073 Hamburg</p>
          </div>
        </div>
      </div>
    </div>
  );
}
