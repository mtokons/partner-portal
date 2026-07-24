"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Mail,
  Phone,
  Search,
  ExternalLink,
  UserPlus,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Video,
  StickyNote,
} from "lucide-react";
import type { BookingAppointment } from "@/lib/bookings";
import { getConvertToLeadUrlAction } from "./actions";

const BOOKINGS_URL =
  "https://bookings.cloud.microsoft/book/SCCGFreeConsultation@studyandcareercoachgermany.com/?ismsaljsauthenabled=true";

function parseBookingDate(dt: { dateTime: string; timeZone: string }): Date {
  return new Date(dt.dateTime.endsWith("Z") ? dt.dateTime : dt.dateTime + "Z");
}

interface EnrichedAppointment extends BookingAppointment {
  isExistingCandidate: boolean;
  existingCandidateId?: string;
}

interface BookingsClientProps {
  appointments: EnrichedAppointment[];
}

const STATUS_STYLE: Record<string, string> = {
  booked:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  noShow:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
};

export function BookingsClient({ appointments }: BookingsClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const now = new Date();

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const apptDate = parseBookingDate(a.startDateTime);
      if (filter === "upcoming" && apptDate < now) return false;
      if (filter === "completed" && (apptDate >= now || a.status === "cancelled")) return false;
      if (filter === "cancelled" && a.status !== "cancelled") return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        a.customerName?.toLowerCase().includes(q) ||
        a.customerEmailAddress?.toLowerCase().includes(q) ||
        a.serviceName?.toLowerCase().includes(q)
      );
    });
  }, [appointments, search, filter, now]);

  async function handleConvert(appt: EnrichedAppointment) {
    if (appt.isExistingCandidate && appt.existingCandidateId) {
      router.push(`/partner/candidates/${appt.existingCandidateId}`);
      return;
    }
    setLoadingId(appt.id);
    try {
      const result = await getConvertToLeadUrlAction(appt);
      if ("url" in result) {
        router.push(result.url);
      }
    } finally {
      setLoadingId(null);
    }
  }

  const upcomingCount = appointments.filter((a) => parseBookingDate(a.startDateTime) >= now).length;
  const totalCount = appointments.length;
  const existingCount = appointments.filter((a) => a.isExistingCandidate).length;

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{totalCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Bookings</p>
        </div>
        <div className="bg-card rounded-2xl border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{upcomingCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Upcoming</p>
        </div>
        <div className="bg-card rounded-2xl border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{existingCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Already Enrolled</p>
        </div>
      </div>

      {/* Quick access to booking page */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/30 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Free Consultation Booking Page</p>
          <p className="text-xs text-muted-foreground mt-0.5">Share this link with leads to book a consultation</p>
        </div>
        <a
          href={BOOKINGS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          Open Bookings
        </a>
      </div>

      {/* Filters & search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email or service…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "upcoming", "completed", "cancelled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "border hover:bg-muted text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No appointments found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((appt) => {
            const apptDate = parseBookingDate(appt.startDateTime);
            const endDate = parseBookingDate(appt.endDateTime);
            const isUpcoming = apptDate >= now;
            const isExpanded = expandedId === appt.id;
            const isLoading = loadingId === appt.id;
            const statusKey = appt.status ?? (isUpcoming ? "booked" : "completed");

            return (
              <div
                key={appt.id}
                className={`bg-card rounded-2xl border transition-all ${
                  isUpcoming ? "border-primary/20" : ""
                }`}
              >
                {/* Main row */}
                <div className="p-4 flex items-center gap-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {appt.customerName?.[0]?.toUpperCase() ?? "?"}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {appt.customerName || "Unknown"}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[statusKey] ?? STATUS_STYLE.booked}`}>
                        {statusKey.replace(/([A-Z])/g, " $1").trim()}
                      </span>
                      {appt.isExistingCandidate && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                          ✓ Enrolled
                        </span>
                      )}
                      {appt.isLocationOnline && (
                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                          <Video className="w-3 h-3" /> Online
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {appt.customerEmailAddress}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {apptDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        {" "}
                        {apptDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {endDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <span className="text-xs text-muted-foreground">{appt.serviceName}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : appt.id)}
                      className="p-1.5 rounded-lg border hover:bg-muted transition-colors"
                      title="Show details"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleConvert(appt)}
                      disabled={isLoading}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                        appt.isExistingCandidate
                          ? "border hover:bg-muted text-muted-foreground"
                          : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : appt.isExistingCandidate ? (
                        <User className="w-3 h-3" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                      {appt.isExistingCandidate ? "View Candidate" : "Register Candidate"}
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t mt-0">
                    <div className="pt-3 grid grid-cols-2 gap-3 text-sm">
                      {appt.customerPhone && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4 shrink-0" />
                          <span>{appt.customerPhone}</span>
                        </div>
                      )}
                      {appt.joinWebUrl && (
                        <div className="flex items-center gap-2">
                          <Video className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <a
                            href={appt.joinWebUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline text-xs truncate"
                          >
                            Join Meeting Link
                          </a>
                        </div>
                      )}
                      {(appt.customerNotes || appt.additionalInformation) && (
                        <div className="col-span-2 flex items-start gap-2 text-muted-foreground">
                          <StickyNote className="w-4 h-4 shrink-0 mt-0.5" />
                          <p className="text-xs whitespace-pre-wrap">
                            {appt.customerNotes || appt.additionalInformation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
