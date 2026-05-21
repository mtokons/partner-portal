import Link from "next/link";
import { auth } from "@/auth";
import type { SessionUser } from "@/types";
import { Clock, CheckCircle } from "lucide-react";

export default async function PartnerPendingPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/20 p-5">
            <Clock className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Account Under Review
          </h1>
          <p className="text-muted-foreground mt-2">
            Your partner account is pending admin approval. You will receive an
            email once your account has been activated.
          </p>
        </div>

        {user && (
          <div className="rounded-xl border bg-card p-4 text-left space-y-2">
            <p className="text-sm font-medium text-foreground">
              Proud SCCG Partner — Verification Pending
            </p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        )}

        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
            <span>Registration submitted</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-500 shrink-0" />
            <span>Account under admin review</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full border-2 border-muted shrink-0" />
            <span>Partner portal access granted</span>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground px-6 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
