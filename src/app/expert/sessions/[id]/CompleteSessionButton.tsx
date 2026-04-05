"use client";

import { useState } from "react";
import { completeSessionAction } from "./actions";

export default function CompleteSessionButton({ sessionId }: { sessionId: string }) {
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await completeSessionAction(sessionId, notes, duration);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete session");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Duration (minutes)
        </label>
        <input
          type="number"
          min={15}
          max={240}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expert Notes (internal — not shown to customer)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Session summary, action items, next steps…"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="bg-indigo-700 hover:bg-indigo-800 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        {loading ? "Saving…" : "Mark as Completed"}
      </button>
    </form>
  );
}
