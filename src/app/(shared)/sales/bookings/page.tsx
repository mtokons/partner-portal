import { redirect } from "next/navigation";
import { getEffectiveSession } from "@/lib/effective-user";
import type { SessionUser } from "@/types";
import { Calendar, ExternalLink, Info } from "lucide-react";
import { getBookingAppointments, BOOKINGS_URL } from "@/lib/bookings";
import { getCandidates } from "@/lib/sharepoint";
import { BookingsClient } from "./BookingsClient";

export default async function BookingsPage() {
  const session = await getEffectiveSession();
  if (!session?.user) redirect("/login");

  const user = session.user as SessionUser;
  const roles = (user.roles || [user.role]) as string[];
  const isAdmin = roles.includes("admin");

  if (!isAdmin) redirect("/partner/dashboard");

  // Fetch appointments and existing candidates in parallel
  const [{ appointments, error }, candidates] = await Promise.all([
    getBookingAppointments(),
    getCandidates(isAdmin ? undefined : user.partnerId),
  ]);

  // Build a set of existing candidate emails for quick lookup
  const candidateEmailMap = new Map(
    candidates.map((c) => [c.email?.toLowerCase(), c.id])
  );

  // Enrich appointments with existing-candidate info
  const enriched = appointments.map((appt) => {
    const email = appt.customerEmailAddress?.toLowerCase();
    const existingId = email ? candidateEmailMap.get(email) : undefined;
    return {
      ...appt,
      isExistingCandidate: !!existingId,
      existingCandidateId: existingId,
    };
  });

  const apiReady = error === null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Bookings & Leads</h1>
            <p className="text-sm text-muted-foreground">
              Microsoft Bookings — Free Consultation calendar
            </p>
          </div>
        </div>
        <a
          href={BOOKINGS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Manage in Bookings
        </a>
      </div>

      {/* API setup banner — only shown when permission not yet granted */}
      {!apiReady && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 flex gap-3">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Automatic sync not yet active
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              To pull appointments into this page, grant{" "}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 rounded">
                BookingsAppointment.ReadWrite.All
              </code>{" "}
              in Azure Portal → App Registrations → your app → API Permissions → Add application permission → Microsoft Graph → Bookings → Grant admin consent.
            </p>
          </div>
        </div>
      )}

      {/* Two-column layout: booking embed + lead list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking form embed */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Booking Form — Share or embed for leads
          </p>
          <div className="rounded-2xl border overflow-hidden bg-card" style={{ height: 560 }}>
            <iframe
              src={BOOKINGS_URL}
              title="SCCG Free Consultation Booking"
              className="w-full h-full border-0"
              allow="camera; microphone"
            />
          </div>
        </div>

        {/* Appointments / lead tracker */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {apiReady ? `Appointments (${appointments.length})` : "Lead Tracker — API sync pending"}
          </p>
          {apiReady ? (
            <BookingsClient appointments={enriched} />
          ) : (
            <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground space-y-3">
              <Calendar className="w-10 h-10 mx-auto opacity-20" />
              <p className="text-sm">Appointments will appear here once the API permission is granted.</p>
              <p className="text-xs">Each booking can then be converted to a candidate with one click.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
