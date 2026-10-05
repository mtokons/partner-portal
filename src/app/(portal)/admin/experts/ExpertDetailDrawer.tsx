"use client";

import { useState, useTransition, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  CreditCard,
  Video,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Edit2,
  Save,
  Trash2,
  Loader2,
  ExternalLink,
} from "lucide-react";
import type { UnifiedExpertRecord } from "./actions";
import { updateExpertAction, deleteExpertAction } from "./actions";

interface ExpertDetailDrawerProps {
  expert: UnifiedExpertRecord | null;
  onClose: () => void;
  onExpertUpdated?: () => void;
  initialEditMode?: boolean;
}

import { createPortal } from "react-dom";

export default function ExpertDetailDrawer({
  expert,
  onClose,
  onExpertUpdated,
  initialEditMode = false,
}: ExpertDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "sessions" | "payments">("profile");
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: expert?.name || "",
    email: expert?.email || "",
    phone: expert?.phone || "",
    specialization: expert?.specialization || "",
    nationality: expert?.nationality || "",
    currentLocation: expert?.currentLocation || "",
    ratePerSession: expert?.ratePerSession || 50,
    status: expert?.status || "active",
    bio: expert?.bio || "",
  });

  useEffect(() => {
    setIsEditing(initialEditMode);
    if (expert) {
      setEditForm({
        name: expert.name || "",
        email: expert.email || "",
        phone: expert.phone || "",
        specialization: expert.specialization || "",
        nationality: expert.nationality || "",
        currentLocation: expert.currentLocation || "",
        ratePerSession: expert.ratePerSession || 50,
        status: expert.status || "active",
        bio: expert.bio || "",
      });
    }
  }, [expert, initialEditMode]);

  if (!expert || !mounted) return null;

  const handleSave = () => {
    setErrorMessage(null);
    startSaving(async () => {
      const res = await updateExpertAction(expert.id, expert.expertType, {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        specialization: editForm.specialization,
        nationality: editForm.nationality,
        currentLocation: editForm.currentLocation,
        ratePerSession: Number(editForm.ratePerSession) || 0,
        status: editForm.status,
        bio: editForm.bio,
      });

      if (res.success) {
        setIsEditing(false);
        if (onExpertUpdated) onExpertUpdated();
      } else {
        setErrorMessage(res.error || "Failed to update expert.");
      }
    });
  };

  const handleDelete = () => {
    if (!confirm(`Are you sure you want to delete expert "${expert.name}"?`)) return;
    setErrorMessage(null);
    startDeleting(async () => {
      const res = await deleteExpertAction(expert.id, expert.expertType);
      if (res.success) {
        onClose();
        if (onExpertUpdated) onExpertUpdated();
      } else {
        setErrorMessage(res.error || "Failed to delete expert.");
      }
    });
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in-0">
      <div className="flex h-full w-full max-w-2xl flex-col bg-card border-l border-border shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Top Header */}
        <div className="flex items-start justify-between border-b border-border p-5 bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
              {expert.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground truncate">{expert.name}</h2>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-bold uppercase ${
                    expert.expertType === "service"
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                      : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {expert.expertType === "service" ? "Service Expert / Coach" : "Project Expert / Consultant"}
                </span>
                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 capitalize">
                  {expert.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{expert.email} • {expert.specialization}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                Edit
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-border bg-muted/10 px-5">
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "profile"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-4 w-4" />
            Personal & Professional Profile
          </button>

          {expert.expertType === "service" && (
            <>
              <button
                onClick={() => setActiveTab("sessions")}
                className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "sessions"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Video className="h-4 w-4" />
                Sessions History ({expert.sessions.length})
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={`flex items-center gap-2 border-b-2 py-3 px-4 text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === "payments"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <CreditCard className="h-4 w-4" />
                Payment Ledger (€{expert.totalEarningsEur})
              </button>
            </>
          )}
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: PROFILE */}
          {activeTab === "profile" && (
            <div className="space-y-5">
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-foreground">Full Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Phone</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Specialization / Role</label>
                    <input
                      type="text"
                      value={editForm.specialization}
                      onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Rate Per Session (€)</label>
                    <input
                      type="number"
                      value={editForm.ratePerSession}
                      onChange={(e) => setEditForm({ ...editForm, ratePerSession: Number(e.target.value) })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Nationality</label>
                    <input
                      type="text"
                      value={editForm.nationality}
                      onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-foreground">Location</label>
                    <input
                      type="text"
                      value={editForm.currentLocation}
                      onChange={(e) => setEditForm({ ...editForm, currentLocation: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-foreground">Bio / Experience</label>
                    <textarea
                      rows={3}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary mt-1 py-2"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Summary Grid */}
                  <div className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-3">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Expert Credentials & Contact
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Email Address</span>
                        <span className="font-semibold text-foreground">{expert.email}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Phone Number</span>
                        <span className="font-medium text-foreground">{expert.phone || "Not recorded"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Specialization</span>
                        <span className="font-medium text-foreground">{expert.specialization}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Rate Per Session</span>
                        <span className="font-mono font-bold text-foreground">
                          {expert.ratePerSession ? `€${expert.ratePerSession}` : "Project-based"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Nationality</span>
                        <span className="font-medium text-foreground">{expert.nationality || "International"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Current Location</span>
                        <span className="font-medium text-foreground">{expert.currentLocation || "Germany"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {expert.bio && (
                    <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-1">
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bio & Background</h3>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{expert.bio}</p>
                    </div>
                  )}

                  {/* Project Expert Extra Info */}
                  {expert.expertType === "project" && expert.assignedProjectName && (
                    <div className="rounded-xl border border-border bg-blue-500/5 border-blue-500/20 p-4 space-y-1">
                      <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                        Assigned Project
                      </h3>
                      <p className="text-xs font-bold text-foreground">{expert.assignedProjectName}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SESSIONS HISTORY */}
          {activeTab === "sessions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Delivered & Scheduled Sessions</h3>
                  <p className="text-xs text-muted-foreground">All mentoring, coaching, and language sessions.</p>
                </div>
                <div className="flex gap-2">
                  <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-600">
                    {expert.completedSessions} Completed
                  </span>
                  <span className="rounded-md bg-blue-500/10 px-2 py-1 text-xs font-bold text-blue-600">
                    {expert.upcomingSessions} Upcoming
                  </span>
                </div>
              </div>

              {expert.sessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center">
                  <Video className="mx-auto h-8 w-8 text-muted-foreground/50" />
                  <p className="mt-2 text-xs font-semibold text-foreground">No individual sessions logged yet</p>
                  <p className="text-[11px] text-muted-foreground">
                    Total completed sessions on file: {expert.totalSessions}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expert.sessions.map((sess, idx) => (
                    <div
                      key={sess.id || idx}
                      className="rounded-xl border border-border bg-card p-4 shadow-2xs space-y-2 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                              Session #{sess.sessionNumber || idx + 1} with {sess.customerName || "Candidate"}
                            </span>
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                sess.status === "completed"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : "bg-blue-500/10 text-blue-600"
                              }`}
                            >
                              {sess.status}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {sess.scheduledAt ? new Date(sess.scheduledAt).toLocaleString() : "Date not set"}
                            {sess.durationMinutes ? ` • ${sess.durationMinutes} mins` : ""}
                          </p>
                        </div>

                        {sess.meetingUrl && (
                          <a
                            href={sess.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-primary font-bold hover:underline shrink-0"
                          >
                            Join Meeting
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>

                      {sess.expertNotes && (
                        <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                          <strong>Notes:</strong> {sess.expertNotes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENT LEDGER */}
          {activeTab === "payments" && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                  <span className="text-[11px] font-semibold text-muted-foreground block">Session Rate</span>
                  <span className="text-base font-bold text-foreground mt-1 block">€{expert.ratePerSession}</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-600 block">Total Paid Out</span>
                  <span className="text-base font-bold text-emerald-600 mt-1 block">€{expert.totalEarningsEur.toLocaleString()}</span>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                  <span className="text-[11px] font-semibold text-amber-600 block">Pending Payouts</span>
                  <span className="text-base font-bold text-amber-600 mt-1 block">€{expert.pendingEarningsEur.toLocaleString()}</span>
                </div>
              </div>

              {expert.payments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-6 text-center">
                  <CreditCard className="mx-auto h-7 w-7 text-muted-foreground/50" />
                  <p className="mt-2 text-xs font-semibold text-foreground">No individual payment items</p>
                  <p className="text-[11px] text-muted-foreground">
                    Estimated total earnings from completed sessions: €{expert.completedSessions * expert.ratePerSession}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase">Payment Transactions</h4>
                  {expert.payments.map((p, i) => (
                    <div key={p.id || i} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                      <div>
                        <span className="text-xs font-bold text-foreground block">
                          Session with {p.customerName || "Candidate"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {p.paidAt ? `Paid on ${new Date(p.paidAt).toLocaleDateString()}` : "Pending approval"}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-foreground">€{p.amountEur || p.amount}</span>
                        <span className="block text-[10px] uppercase font-bold text-emerald-600">{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4 bg-muted/20">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-500/20 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete Expert
          </button>

          <button
            onClick={onClose}
            className="rounded-lg bg-secondary px-4 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
