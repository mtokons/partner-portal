"use client";

import { useState } from "react";
import type { Expert } from "@/types";
import { assignExpertAction } from "./actions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  packageId: string;
  packageName: string;
  customerName: string;
  experts: Expert[];
}

export default function AssignExpertButton({ packageId, packageName, customerName, experts }: Props) {
  const [open, setOpen] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAssign() {
    if (!selectedExpert) return;
    setLoading(true);
    try {
      await assignExpertAction(packageId, selectedExpert);
    } catch {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(buttonVariants({ size: "sm" }), "bg-indigo-600 hover:bg-indigo-700")}
      >
        Assign Expert
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Assign Expert</h2>
              <p className="text-sm text-gray-500 mt-1">
                {customerName} — {packageName}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Expert</label>
              <select
                value={selectedExpert}
                onChange={(e) => setSelectedExpert(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— choose —</option>
                {experts.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {e.specialization} · ⭐{e.rating}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAssign}
                disabled={!selectedExpert || loading}
                className={cn(buttonVariants(), "flex-1 bg-indigo-600 hover:bg-indigo-700")}
              >
                {loading ? "Assigning…" : "Assign"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
