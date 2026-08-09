import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 text-center">
      <div className="max-w-lg space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Access unavailable</p>
        <h1 className="text-3xl font-bold text-slate-900">Your account cannot open this view</h1>
        <p className="text-slate-600">
          The requested role or dashboard is not configured. Contact an administrator to review your account access.
        </p>
        <Link className="inline-flex rounded-md bg-slate-900 px-4 py-2 font-medium text-white" href="/login?switch=1">
          Return to sign in
        </Link>
      </div>
    </main>
  );
}
