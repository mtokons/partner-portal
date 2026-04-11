"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveExpertAction, rejectExpertAction } from "./actions";

interface PendingExpert {
  uid: string;
  displayName: string;
  email: string;
  phone: string;
  specialization: string;
  company: string;
  createdAt: string;
}

export default function PendingExpertsList({ experts }: { experts: PendingExpert[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleApprove(uid: string) {
    setLoadingId(uid);
    await approveExpertAction(uid);
    router.refresh();
    setLoadingId(null);
  }

  async function handleReject(uid: string) {
    setLoadingId(uid);
    await rejectExpertAction(uid);
    router.refresh();
    setLoadingId(null);
  }

  if (experts.length === 0) return null;

  return (
    <div className="rounded-xl border bg-amber-50/50 border-amber-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">⏳</span>
        <h2 className="text-base font-semibold text-amber-900">
          Pending Expert Applications ({experts.length})
        </h2>
      </div>
      <div className="space-y-3">
        {experts.map((exp) => (
          <div
            key={exp.uid}
            className="flex items-center justify-between p-4 bg-white rounded-lg border border-amber-100 shadow-sm"
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-900">{exp.displayName}</p>
              <p className="text-xs text-gray-500">{exp.email}</p>
              <div className="flex gap-3 text-xs text-gray-400">
                {exp.specialization && <span>{exp.specialization}</span>}
                {exp.phone && <span>· {exp.phone}</span>}
                {exp.createdAt && (
                  <span>· Applied {new Date(exp.createdAt).toLocaleDateString("en-GB")}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleApprove(exp.uid)}
                disabled={loadingId === exp.uid}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {loadingId === exp.uid ? "..." : "Approve"}
              </button>
              <button
                onClick={() => handleReject(exp.uid)}
                disabled={loadingId === exp.uid}
                className="px-4 py-1.5 text-xs font-semibold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
