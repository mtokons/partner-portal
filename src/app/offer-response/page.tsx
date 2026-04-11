import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";

const icons: Record<string, typeof CheckCircle2> = {
  accepted: CheckCircle2,
  rejected: XCircle,
  already: Clock,
  invalid: AlertCircle,
  error: AlertCircle,
};

const colors: Record<string, string> = {
  accepted: "text-emerald-400",
  rejected: "text-red-400",
  already: "text-amber-400",
  invalid: "text-gray-400",
  error: "text-red-400",
};

const bgColors: Record<string, string> = {
  accepted: "bg-emerald-500/15 border-emerald-500/30",
  rejected: "bg-red-500/15 border-red-500/30",
  already: "bg-amber-500/15 border-amber-500/30",
  invalid: "bg-gray-500/15 border-gray-500/30",
  error: "bg-red-500/15 border-red-500/30",
};

export default async function OfferResponsePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; message?: string }>;
}) {
  const params = await searchParams;
  const status = params.status || "error";
  const message = params.message || "Something went wrong.";

  const Icon = icons[status] || AlertCircle;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060818] relative overflow-hidden">
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/12 blur-[100px]" />
      </div>

      <div className="w-full max-w-md mx-auto p-6 relative z-10">
        <div className="rounded-3xl bg-white/[0.055] border border-white/10 backdrop-blur-xl p-10 shadow-2xl text-center">
          <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center mb-6 border ${bgColors[status] || bgColors.error}`}>
            <Icon className={`h-8 w-8 ${colors[status] || colors.error}`} />
          </div>

          <h1 className="text-2xl font-black text-white mb-3">
            {status === "accepted" && "Offer Accepted"}
            {status === "rejected" && "Offer Declined"}
            {status === "already" && "Already Responded"}
            {status === "invalid" && "Invalid Link"}
            {status === "error" && "Error"}
          </h1>

          <p className="text-white/50 text-sm leading-relaxed">{message}</p>

          <div className="mt-8 text-xs text-white/20">
            <p>SCCG Partner Portal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
