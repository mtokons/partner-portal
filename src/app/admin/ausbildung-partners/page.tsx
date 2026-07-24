"use client";

import React, { useState } from "react";
import { GraduationCap, Search, Trash2, Edit2, X } from "lucide-react";

interface AdminAusbildungPartner {
  id: string;
  academyName: string;
  contactEmail: string;
  activePositions: number;
  applicantsCount: number;
  recentActivity: string;
  status: "active" | "inactive";
}

export default function AdminAusbildungPartnersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPartner, setEditingPartner] = useState<AdminAusbildungPartner | null>(null);

  const [partners, setPartners] = useState<AdminAusbildungPartner[]>([
    { id: "ap-1", academyName: "IHK Bildungshaus Bayern", contactEmail: "info@ihk-bayern.de", activePositions: 4, applicantsCount: 6, recentActivity: "Updated listing for 'Fachinformatiker AE'", status: "active" },
    { id: "ap-2", academyName: "Metalltechnik München AG", contactEmail: "ausbildung@metalltechnik-muenchen.de", activePositions: 2, applicantsCount: 2, recentActivity: "Reviewed readiness report for Jonas Becker", status: "active" }
  ]);

  const toggleStatus = (id: string) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, status: p.status === "active" ? "inactive" : "active" } : p));
  };

  const deletePartner = (id: string) => {
    if (confirm("Are you sure you want to remove this Ausbildung Partner? All active apprenticeships will be disabled.")) {
      setPartners(prev => prev.filter(p => p.id !== id));
      if (editingPartner?.id === id) setEditingPartner(null);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPartner) {
      setPartners(prev => prev.map(p => p.id === editingPartner.id ? editingPartner : p));
      setEditingPartner(null);
    }
  };

  const filteredPartners = partners.filter(p => 
    p.academyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin: Ausbildung Partners</h1>
        <p className="text-slate-400 text-sm">Manage vocational training centers and companies, review applicant allocations, and configure profiles.</p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search academies or emails..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
        />
      </div>

      {/* Partners List Table */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-750 text-slate-350">
                <th className="p-4 font-semibold uppercase tracking-wider">Vocational Academy Partner</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Contact Email</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Active Positions</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Allocated Candidates</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Recent Activity</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-750">
              {filteredPartners.map(p => (
                <tr key={p.id} className="hover:bg-slate-750/30 transition-colors">
                  <td className="p-4 font-medium text-slate-100">{p.academyName}</td>
                  <td className="p-4 text-slate-350">{p.contactEmail}</td>
                  <td className="p-4 text-slate-300 font-bold">{p.activePositions} positions</td>
                  <td className="p-4 text-slate-300 font-bold">{p.applicantsCount} candidates</td>
                  <td className="p-4 text-slate-400 italic">{p.recentActivity}</td>
                  <td className="p-4">
                    <button 
                      onClick={() => toggleStatus(p.id)}
                      className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                        p.status === "active" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-slate-900 text-slate-500 border border-slate-700"
                      }`}
                    >
                      {p.status.toUpperCase()}
                    </button>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button 
                      onClick={() => setEditingPartner(p)}
                      className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-[10px] hover:bg-slate-750 transition-colors cursor-pointer inline-flex items-center space-x-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => deletePartner(p.id)}
                      className="px-2.5 py-1 bg-red-650/15 border border-red-500/30 text-red-400 rounded text-[10px] hover:bg-red-600/25 transition-all cursor-pointer inline-flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Partner Modal */}
      {editingPartner && (
        <form onSubmit={handleSaveEdit} className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-2xl shadow-2xl p-6 relative space-y-4 text-slate-100">
            <button 
              type="button"
              onClick={() => setEditingPartner(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-6 h-6 text-teal-400" />
              <h2 className="text-xl font-bold">Edit Ausbildung Partner</h2>
            </div>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-455 font-semibold mb-1">Academy / Company Name</label>
                <input 
                  type="text" 
                  value={editingPartner.academyName}
                  onChange={(e) => setEditingPartner(prev => prev ? { ...prev, academyName: e.target.value } : null)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-slate-455 font-semibold mb-1">Academy Email</label>
                <input 
                  type="email" 
                  value={editingPartner.contactEmail}
                  onChange={(e) => setEditingPartner(prev => prev ? { ...prev, contactEmail: e.target.value } : null)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-455 font-semibold mb-1">Active Positions Count</label>
                <input 
                  type="number" 
                  value={editingPartner.activePositions}
                  onChange={(e) => setEditingPartner(prev => prev ? { ...prev, activePositions: parseInt(e.target.value) || 0 } : null)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <button 
                type="button" 
                onClick={() => setEditingPartner(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-750 text-slate-350 rounded-xl text-xs"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
