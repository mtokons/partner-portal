"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logoutAction } from "@/lib/actions";
import { ArrowRight, Sparkles } from "lucide-react";

export default function ActivateButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleActivate() {
    setLoading(true);
    try {
      await logoutAction();
      router.push("/login?approved=true");
    } catch (err) {
      console.error("Failed to activate partner session:", err);
      router.push("/login");
    }
  }

  return (
    <button
      onClick={handleActivate}
      disabled={loading}
      className="relative w-full h-12 rounded-xl font-bold text-sm text-white overflow-hidden transition-all duration-200 mt-4 group disabled:opacity-70 flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.4)] cursor-pointer active:scale-[0.98]"
      style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
    >
      {loading ? (
        <>
          <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          Activating Partner Console...
        </>
      ) : (
        <>
          <Sparkles className="w-4.5 h-4.5 text-emerald-100 animate-pulse" />
          Activate & Go to Dashboard
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </>
      )}
    </button>
  );
}
