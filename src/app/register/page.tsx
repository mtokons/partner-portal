"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Zap, ArrowRight, Eye, EyeOff, User, Mail, Phone, Building,
  Shield, Users, UserCheck, CheckCircle2, AlertCircle, Clock,
} from "lucide-react";
import { firebaseAuthAction } from "@/lib/actions";
import { firebaseRegister, firebaseGoogleLogin, firebaseGoogleSignup, getFirebaseAuth, type FirebaseUserRole } from "@/lib/firebase-auth";

type UserRole = FirebaseUserRole;

const roleOptions: Array<{ value: UserRole; label: string; desc: string; icon: typeof Users; color: string }> = [
  { value: "partner", label: "Partner", desc: "Manage clients, orders & financials", icon: Building, color: "from-indigo-500 to-blue-600" },
  { value: "customer", label: "Customer", desc: "Access packages, sessions & invoices", icon: Users, color: "from-emerald-500 to-teal-600" },
  { value: "expert", label: "Expert", desc: "Deliver sessions & track payments", icon: UserCheck, color: "from-violet-500 to-purple-600" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "partner" as UserRole,
    company: "",
    specialization: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setLoading(true);
    try {
      // 1. Firebase Registration (Real Cloud Auth)
      const result = await firebaseRegister(
        form.email,
        form.password,
        form.name,
        form.phone,
        form.role,
        { company: form.company || undefined, specialization: form.specialization || undefined }
      );

      if (result.success) {
        // For customers (auto-active): create NextAuth session and redirect
        if (form.role === "customer") {
          const fbAuth = getFirebaseAuth();
          const idToken = await fbAuth.currentUser?.getIdToken();
          if (idToken) {
            const sessionResult = await firebaseAuthAction(idToken);
            if (sessionResult.success) {
              router.push("/customer/dashboard");
              router.refresh();
              return;
            }
          }
        }
        // For partners/experts (pending approval): just show success, no session
        setSuccess(true);
      } else {
        setError(result.error || "Registration failed. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060818] relative overflow-hidden">
        <Ambient />
        <div className="w-full max-w-md mx-auto p-6 relative z-10">
          <div className="rounded-3xl bg-white/[0.055] border border-white/10 backdrop-blur-xl p-10 shadow-2xl text-center">
            <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-6 border ${
              form.role === "customer" 
                ? "bg-emerald-500/20 border-emerald-500/30" 
                : "bg-amber-500/20 border-amber-500/30"
            }`}>
              {form.role === "customer" ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              ) : (
                <Clock className="h-8 w-8 text-amber-400" />
              )}
            </div>
            <h2 className="text-2xl font-black text-white mb-2">
              {form.role === "customer" ? "Account Created!" : "Application Received!"}
            </h2>
            <p className="text-white/50 text-sm mb-6">
              {form.role === "customer" ? (
                <>
                  A verification email has been sent to <strong className="text-white/80">{form.email}</strong>.
                  Please verify your email before signing in.
                </>
              ) : (
                <>
                  Your request to join as a <strong className="text-white/80 capitalize">{form.role}</strong> has been received. 
                  Please verify your email first, then wait for an administrator to approve your portal access.
                </>
              )}
            </p>
            {form.role === "customer" ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all group"
                style={{ background: "linear-gradient(135deg, #6366f1 0%, #7c3aed 100%)" }}
              >
                Go to Sign In
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            ) : (
              <div className="text-xs text-white/30 italic">
                You will receive an email once your account is active.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#060818] relative overflow-hidden">
      <Ambient />

      {/* Left branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 flex-col justify-between p-14 relative z-10">
        <div className="flex items-center gap-3">
          <img src="/assets/sccg-logo.png" alt="SCCG Logo" className="h-12 w-auto object-contain" />
          <div className="border-l border-white/10 pl-3">
            <p className="text-white font-bold text-[15px] leading-none">Partner Portal</p>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mt-1">by SCCG</p>
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 mb-6">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-300 font-medium">Create Your Account</span>
          </div>
          <h1 className="text-5xl xl:text-6xl font-black text-white leading-[1.05] tracking-tight">
            Join the
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              platform.
            </span>
          </h1>
          <p className="mt-6 text-white/50 text-lg leading-relaxed max-w-sm">
            Register as a Partner, Customer, or Expert and start collaborating.
          </p>

          {/* Role cards preview */}
          <div className="mt-10 space-y-3">
            {roleOptions.map((r) => (
              <div key={r.value} className="flex items-center gap-4">
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${r.color} flex items-center justify-center shadow-lg shrink-0`}>
                  <r.icon className="h-4.5 w-4.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/80">{r.label}</p>
                  <p className="text-xs text-white/35">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/20">© 2026 SCCG. All rights reserved.</p>
      </div>

      {/* Right — Registration form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10 overflow-y-auto">
        <div className="w-full max-w-[440px] my-8">
          <div className="rounded-3xl bg-white/[0.055] border border-white/10 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 mb-6">
              <img src="/assets/sccg-logo.png" alt="SCCG Logo" className="h-9 w-auto object-contain" />
              <p className="text-white font-bold text-sm border-l border-white/10 pl-3">SCCG Partner Portal</p>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight">
              Create Account
            </h2>
            <p className="text-white/40 text-sm mt-1.5 mb-6">Fill in your details to get started</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Role selector */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Account Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {roleOptions.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => update("role", r.value)}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                        form.role === r.value
                          ? "border-indigo-500/50 bg-indigo-500/15 ring-2 ring-indigo-500/30"
                          : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/8"
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${r.color} flex items-center justify-center`}>
                        <r.icon className="h-4 w-4 text-white" />
                      </div>
                      <span className={`text-xs font-semibold ${form.role === r.value ? "text-white" : "text-white/50"}`}>
                        {r.label}
                      </span>
                      {form.role === r.value && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-indigo-500 flex items-center justify-center">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full name */}
              <InputField
                label="Full Name"
                icon={User}
                type="text"
                placeholder="John Doe"
                value={form.name}
                onChange={(v) => update("name", v)}
                focused={focusedField === "name"}
                onFocus={() => setFocusedField("name")}
                onBlur={() => setFocusedField(null)}
                required
              />

              {/* Email */}
              <InputField
                label="Email Address"
                icon={Mail}
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(v) => update("email", v)}
                focused={focusedField === "email"}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                required
              />

              {/* Phone */}
              <InputField
                label="Phone Number"
                icon={Phone}
                type="tel"
                placeholder="+49 170 xxxxxxx"
                value={form.phone}
                onChange={(v) => update("phone", v)}
                focused={focusedField === "phone"}
                onFocus={() => setFocusedField("phone")}
                onBlur={() => setFocusedField(null)}
              />

              {/* Company (for partner/customer) */}
              {(form.role === "partner" || form.role === "customer") && (
                <InputField
                  label="Company"
                  icon={Building}
                  type="text"
                  placeholder="Your company name"
                  value={form.company}
                  onChange={(v) => update("company", v)}
                  focused={focusedField === "company"}
                  onFocus={() => setFocusedField("company")}
                  onBlur={() => setFocusedField(null)}
                />
              )}

              {/* Specialization (for expert) */}
              {form.role === "expert" && (
                <InputField
                  label="Specialization"
                  icon={Shield}
                  type="text"
                  placeholder="e.g., Business Consulting"
                  value={form.specialization}
                  onChange={(v) => update("specialization", v)}
                  focused={focusedField === "specialization"}
                  onFocus={() => setFocusedField("specialization")}
                  onBlur={() => setFocusedField(null)}
                />
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Password</label>
                <div className={`relative rounded-xl transition-all duration-200 ${focusedField === "password" ? "ring-2 ring-indigo-500/50" : ""}`}>
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Min 6 characters"
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="w-full h-11 px-4 pr-12 rounded-xl bg-white/8 border border-white/12 text-white placeholder:text-white/25 text-sm outline-none transition-all focus:bg-white/12 focus:border-indigo-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Confirm Password</label>
                <div className={`relative rounded-xl transition-all duration-200 ${focusedField === "confirm" ? "ring-2 ring-indigo-500/50" : ""}`}>
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={(e) => update("confirmPassword", e.target.value)}
                    onFocus={() => setFocusedField("confirm")}
                    onBlur={() => setFocusedField(null)}
                    required
                    className="w-full h-11 px-4 rounded-xl bg-white/8 border border-white/12 text-white placeholder:text-white/25 text-sm outline-none transition-all focus:bg-white/12 focus:border-indigo-500/50"
                  />
                </div>
                {form.confirmPassword && form.password !== form.confirmPassword && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
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

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full h-12 rounded-xl font-semibold text-sm text-white overflow-hidden transition-all duration-200 group disabled:opacity-70"
                style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
                <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0c1024] px-2 text-white/30 backdrop-blur-xl">Or register with</span>
                </div>
              </div>

              {/* Google Button */}
              <button
                type="button"
                onClick={async () => {
                  setError("");
                  setLoading(true);
                  const result = await firebaseGoogleSignup(form.role, form.company, form.specialization);
                  if (result.success) {
                    const idToken = await getFirebaseAuth().currentUser?.getIdToken();
                    if (idToken) await firebaseAuthAction(idToken);
                    router.push("/dashboard");
                    router.refresh();
                  } else {
                    setError(result.error || "Google registration failed");
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-3 font-semibold text-sm text-white/80 transition-all hover:bg-white/10 hover:border-white/20 disabled:opacity-50"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Register with Google
              </button>
            </form>

            {/* Sign in link */}
            <p className="text-center text-sm text-white/40 mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reusable Input Field ──

function InputField({
  label, icon: Icon, type, placeholder, value, onChange, focused, onFocus, onBlur, required,
}: {
  label: string; icon: typeof User; type: string; placeholder: string;
  value: string; onChange: (v: string) => void;
  focused: boolean; onFocus: () => void; onBlur: () => void; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">{label}</label>
      <div className={`relative rounded-xl transition-all duration-200 ${focused ? "ring-2 ring-indigo-500/50" : ""}`}>
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25" />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          required={required}
          className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/8 border border-white/12 text-white placeholder:text-white/25 text-sm outline-none transition-all focus:bg-white/12 focus:border-indigo-500/50"
        />
      </div>
    </div>
  );
}

// ── Ambient Background ──

function Ambient() {
  return (
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-emerald-600/12 blur-[100px]" />
      <div className="absolute top-1/2 left-0 h-[300px] w-[300px] rounded-full bg-violet-600/8 blur-[80px]" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(99,102,241,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}
