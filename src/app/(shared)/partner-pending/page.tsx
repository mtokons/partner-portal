import Link from "next/link";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { Clock, CheckCircle, Award, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Repository } from "@/lib/repository";
import ActivateButton from "./ActivateButton";

export default async function PartnerPendingPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  let isApproved = false;
  let requireRelogin = false;

  if (user?.email) {
    try {
      const partner = await Repository.partners.getByEmail(user.email);
      if (partner && partner.onboardingStatus?.toLowerCase() === "approved") {
        isApproved = true;
      }

      // If this is an Admin user but they don't have a partner record, auto-create one
      // so they can use the Partner Console for testing/management.
      if (!isApproved && (user.role === "admin" || user.role === "project-admin")) {
        const { createPartner, approvePartnerOnboarding, updatePartnerTierAndMargin } = await import("@/lib/sharepoint");
        
        if (!partner) {
          const newPartner = await createPartner({
            name: user.name || "Admin",
            email: user.email,
            passwordHash: "",
            role: "partner",
            status: "active",
            company: user.company || "SCCG Internal",
            phone: "",
            partnerType: "individual",
            commissionTier: "standard",
            tierStatus: "Platinum",
            marginPercentage: 25,
            onboardingStatus: "approved",
          });
          requireRelogin = true;
        } else {
          await approvePartnerOnboarding(partner.id);
          await updatePartnerTierAndMargin(partner.id, "Platinum", 25);
          requireRelogin = true;
        }
        isApproved = true;
      }
    } catch (err) {
      console.error("Error loading partner status in pending page:", err);
    }
  }

  if (isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060818] p-6 relative overflow-hidden">
        {/* Ambient background blur */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/3 h-[500px] w-[500px] rounded-full bg-emerald-600/15 blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/3 h-[400px] w-[400px] rounded-full bg-teal-600/12 blur-[100px]" />
          {/* Subtle Grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)`,
              backgroundSize: "48px 48px",
            }}
          />
        </div>

        <div className="max-w-md w-full relative z-10">
          <div className="rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl p-8 shadow-2xl space-y-6 text-center">
            {/* Header Badge */}
            <div className="flex justify-center">
              <div className="rounded-full bg-emerald-500/10 border border-emerald-500/30 p-5 relative animate-pulse">
                <Award className="w-12 h-12 text-emerald-400" />
                <div className="absolute -top-1 -right-1 bg-emerald-400 rounded-full p-1 animate-bounce">
                  <Sparkles className="w-4 h-4 text-emerald-950" />
                </div>
              </div>
            </div>

            {/* Title & Desc */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-xs font-semibold text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified & Approved
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight leading-none font-[family-name:var(--font-outfit)] mt-2">
                Welcome to SCCG!
              </h1>
              <p className="text-white/60 text-sm mt-2 leading-relaxed">
                Your partner account has been officially verified and approved. We have prepared your partner console workspace.
              </p>
            </div>

            {/* Profile Summary Card */}
            {user && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left space-y-1">
                <p className="text-xs font-bold text-white/40 uppercase tracking-wider">Approved Profile</p>
                <p className="text-sm font-semibold text-white">{user.name || "Md Hasnain"}</p>
                <p className="text-xs text-white/50">{user.email}</p>
              </div>
            )}

            {/* Action & Note */}
            <div className="space-y-4">
              <ActivateButton />
              
              <p className="text-[11px] text-white/30 leading-snug">
                Note: A quick secure sign-in reload is required to synchronize your admin-approved credentials and unlock B2B dashboard features.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Pending Review State
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060818] p-6 relative overflow-hidden">
      {/* Ambient background blur */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 h-[500px] w-[500px] rounded-full bg-amber-600/10 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 h-[400px] w-[400px] rounded-full bg-indigo-600/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(245,158,11,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,1) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl p-8 shadow-2xl space-y-6 text-center">
          {/* Header Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-500/10 border border-amber-500/30 p-5 relative">
              <Clock className="w-12 h-12 text-amber-500 animate-pulse" />
            </div>
          </div>

          {/* Title & Desc */}
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white tracking-tight leading-none font-[family-name:var(--font-outfit)]">
              Account Under Review
            </h1>
            <p className="text-white/60 text-sm mt-2 leading-relaxed">
              Your partner account is pending admin approval. You will receive an email once your account has been activated.
            </p>
          </div>

          {/* Pending Profile Card */}
          {user && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left space-y-1">
              <p className="text-xs font-bold text-white/40 uppercase tracking-wider">
                Proud SCCG Partner — Verification Pending
              </p>
              <p className="text-sm text-white/70">{user.email}</p>
            </div>
          )}

          {/* Checklist */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.015] p-5 text-left space-y-3.5 text-xs text-white/60">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <span className="font-semibold text-white/90">Registration submitted</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
              <span className="font-semibold text-white/90">Account under admin review</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
              </div>
              <span className="text-white/40">Partner portal access granted</span>
            </div>
          </div>

          {/* Navigation link */}
          <Link
            href="/dashboard"
            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center gap-2 font-semibold text-sm text-white transition-all hover:bg-white/10 hover:border-white/20 active:scale-[0.98] mt-4"
          >
            Back to Dashboard
            <ArrowRight className="w-4 h-4 text-white/50" />
          </Link>
        </div>
      </div>
    </div>
  );
}
