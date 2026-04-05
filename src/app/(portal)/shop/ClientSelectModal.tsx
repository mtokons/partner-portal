"use client";

import { useState } from "react";
import type { Client } from "@/types";
import { Search, Building2, User, Check, Plus, X } from "lucide-react";

interface ClientSelectModalProps {
  clients: Client[];
  onSelect: (client: Client) => void;
  onCreateNew: (data: { name: string; email: string; company: string; phone: string }) => void;
  onClose: () => void;
}

export default function ClientSelectModal({
  clients,
  onSelect,
  onCreateNew,
  onClose,
}: ClientSelectModalProps) {
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"select" | "create">("select");
  const [newClient, setNewClient] = useState({ name: "", email: "", company: "", phone: "" });

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newClient.name || !newClient.email) return;
    onCreateNew(newClient);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="font-bold text-foreground text-lg">Select Client</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Choose an existing client or create a new one</p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6 pt-2">
          <button
            onClick={() => setMode("select")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              mode === "select"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-3.5 w-3.5 inline mr-1.5" />
            Existing ({clients.length})
          </button>
          <button
            onClick={() => setMode("create")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              mode === "create"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plus className="h-3.5 w-3.5 inline mr-1.5" />
            New Client
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === "select" ? (
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clients..."
                  className="w-full pl-9 pr-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Client list */}
              <div className="space-y-1.5">
                {filtered.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => onSelect(client)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/60 text-left transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{client.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.company} · {client.email}</p>
                    </div>
                    <Check className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="py-8 text-center">
                    <User className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No clients found</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              {[
                { key: "name", label: "Full Name", required: true, type: "text" },
                { key: "email", label: "Email", required: true, type: "email" },
                { key: "company", label: "Company", required: false, type: "text" },
                { key: "phone", label: "Phone", required: false, type: "tel" },
              ].map(({ key, label, required, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                    {label} {required && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type={type}
                    value={newClient[key as keyof typeof newClient]}
                    onChange={(e) => setNewClient((p) => ({ ...p, [key]: e.target.value }))}
                    required={required}
                    className="w-full px-4 py-2.5 bg-muted border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              ))}
              <button
                type="submit"
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Create & Select Client
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
