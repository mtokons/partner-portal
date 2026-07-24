"use client";

import React, { useState } from "react";
import { Building2, Search, Trash2, Edit2, X, Plus } from "lucide-react";

interface AdminPartnerRecord {
  id: string;
  companyName: string;
  activeJobs: number;
  interviewsScheduled: number;
  recentActivity: string;
  status: "active" | "inactive";
  contactEmail: string;
}

export default function AdminJobPartnersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingPartner, setEditingPartner] = useState<AdminPartnerRecord | null>(null);
  
  const [partners, setPartners] = useState<AdminPartnerRecord[]>([
    { id: "p-1", companyName: "SCCG Solution Partner", activeJobs: 2, interviewsScheduled: 1, recentActivity: "Created interview slot on 10.07.2026", status: "active", contactEmail: "recruiting@sccg.de" },
    { id: "p-2", companyName: "Educraft GmbH", activeJobs: 1, interviewsScheduled: 0, recentActivity: "Searched CV Master Pool for 'Kubernetes'", status: "active", contactEmail: "jobs@educraft.de" },
    { id: "p-3", companyName: "Handwerk Service AG", activeJobs: 0, interviewsScheduled: 0, recentActivity: "Updated company profile details", status: "inactive", contactEmail: "info@handwerk-service.de" }
  ]);

  const toggleStatus = (id: string) => {
    setPartners(prev => prev.map(p => p.id === id ? { ...p, status: p.status === "active" ? "inactive" : "active" } : p));
  };

  const deletePartner = (id: string) => {
    if (confirm("Are you sure you want to remove this Job Partner? All their job posts will be disabled.")) {
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
    p.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.contactEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 bg-slate-900 text-white min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin: Job Partners</h1>
        <p className="text-slate-400 text-sm">Manage recruiter accounts, toggle status, review activity, and update profile credentials.</p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search companies or emails..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-violet-500"
        />
      </div>

      {/* Partners List Table */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/60 border-b border-slate-750 text-slate-350">
                <th className="p-4 font-semibold uppercase tracking-wider">Company</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Contact Email</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Active Jobs</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Interviews</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Recent Activity</th>
                <th className="p-4 font-semibold uppercase tracking-wider">Status</th>
                <th className="p-4 font-semibold uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-750">
              {filteredPartners.map(p => (
                <tr key={p.id} className="hover:bg-slate-750/30 transition-colors">
                  <td className="p-4 font-medium text-slate-100">{p.companyName}</td>
                  <td className="p-4 text-slate-350">{p.contactEmail}</td>
                  <td className="p-4 text-slate-300 font-bold">{p.activeJobs} positions</td>
                  <td className="p-4 text-slate-300 font-bold">{p.interviewsScheduled} slots</td>
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-slate-800 border border-slate-700 max-w-md w-full rounded-2xl shadow-2xl p-6 relative space-y-4 text-slate-100">
            <button 
              type="button"
              onClick={() => setEditingPartner(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <Building2 className="w-6 h-6 text-violet-400" />
              <h2 className="text-xl font-bold">Edit Job Partner</h2>
            </div>
            
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-455 font-semibold mb-1">Company Name</label>
                <input 
                  type="text" 
                  value={editingPartner.companyName}
                  onChange={(e) => setEditingPartner(prev => prev ? { ...prev, companyName: e.target.value } : null)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>
              
              <div>
                <label className="block text-slate-455 font-semibold mb-1">Recruitment Email</label>
                <input 
                  type="email" 
                  value={editingPartner.contactEmail}
                  onChange={(e) => setEditingPartner(prev => prev ? { ...prev, contactEmail: e.target.value } : null)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-455 font-semibold mb-1">Active Job Postings Count</label>
                <input 
                  type="number" 
                  value={editingPartner.activeJobs}
                  onChange={(e) => setEditingPartner(prev => prev ? { ...prev, activeJobs: parseInt(e.target.value) || 0 } : null)}
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
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
