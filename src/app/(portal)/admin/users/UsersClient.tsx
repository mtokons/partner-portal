"use client";

import { useState, useEffect } from "react";
import { fetchAllUsersAction, updateUserRolesAction, createUserAction } from "./actions";
import { UserProfile, UserRoleType } from "@/types";
import { 
  Users, Search, Shield, Save, X, Edit2, 
  Activity, XCircle, CheckCircle2, UserPlus, Phone, Briefcase, Mail, User as UserIcon
} from "lucide-react";

const AVAILABLE_ROLES: { id: UserRoleType; label: string }[] = [
  { id: "admin", label: "Administrator" },
  { id: "finance", label: "Finance Manager" },
  { id: "hr", label: "HR Manager" },
  { id: "school-manager", label: "School Manager" },
  { id: "partner", label: "Partner" },
  { id: "expert", label: "Expert" },
  { id: "customer", label: "Customer" },
  { id: "teacher", label: "Teacher" },
];

export default function UsersClient() {
  const [users, setUsers] = useState<(UserProfile & { roles: string[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Selection / Editing State
  const [editingUser, setEditingUser] = useState<(UserProfile & { roles: string[] }) | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<UserRoleType[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Add User State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState<Partial<UserProfile>>({
    displayName: "",
    email: "",
    phone: "",
    role: "customer",
    company: "",
    status: "active",
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAllUsersAction();
      if (res.success && res.data) {
        setUsers(res.data as (UserProfile & { roles: string[] })[]);
      } else {
        alert(res.error || "Failed to load users");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const s = search.toLowerCase();
    return (
      u.displayName?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s) ||
      u.company?.toLowerCase().includes(s)
    );
  });

  const handleEditClick = (user: UserProfile & { roles: string[] }) => {
    setEditingUser(user);
    setSelectedRoles((user.roles as UserRoleType[]) || []);
  };

  const handleToggleRole = (role: UserRoleType) => {
    setSelectedRoles((prev) => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSaveRoles = async () => {
    if (!editingUser) return;
    setIsUpdating(true);
    try {
      const res = await updateUserRolesAction(editingUser.id, selectedRoles);
      if (res.success) {
        alert("User roles updated successfully");
        setEditingUser(null);
        loadUsers(); // Refresh the list
      } else {
        alert(res.error || "Failed to update roles");
      }
    } catch (err: any) {
      alert("Failed to update roles");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.displayName || !newUser.email) return;
    setIsAdding(true);
    try {
      const res = await createUserAction({
        ...newUser,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Omit<UserProfile, "id">);

      if (res.success) {
        alert("User created successfully");
        setShowAddModal(false);
        setNewUser({
          displayName: "",
          email: "",
          phone: "",
          role: "customer",
          company: "",
          status: "active",
        });
        loadUsers();
      } else {
        alert(res.error || "Failed to create user");
      }
    } catch (err: any) {
      alert("Failed to create user");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            User Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage system access and assign roles to platform users.
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all font-medium shadow-sm shadow-primary/20"
        >
          <UserPlus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      {/* Toolbar / Search */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card p-4 rounded-xl shadow-sm border border-border/50">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users by name, email, or company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50 outline-none transition-all"
          />
        </div>
        <div className="text-sm font-medium text-muted-foreground flex items-center">
          Total Users: <span className="ml-2 text-foreground">{filteredUsers.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Primary Type</th>
                <th className="px-6 py-4 font-semibold">Active Roles</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    No users found matching "{search}"
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold shrink-0">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{user.displayName}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">{user.email}</div>
                          {user.company && <div className="text-xs text-muted-foreground opacity-80">{user.company}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground capitalize border border-border">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map(r => (
                            <span key={r} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 capitalize">
                              {r}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No roles</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {user.status === "active" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Active
                        </span>
                      ) : user.status === "suspended" ? (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 text-xs font-medium">
                          <XCircle className="w-3.5 h-3.5" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs font-medium">
                          <Activity className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                        title="Edit Roles"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border/50 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Manage Roles</h3>
                  <p className="text-xs text-muted-foreground">{editingUser.displayName}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto min-h-[50vh]">
              <p className="text-sm border-b border-border/50 pb-4 mb-4 text-card-foreground">
                Select the roles you want to grant to this user. Each role unlocks different menu options and system access.
              </p>
              
              <div className="flex flex-col gap-3">
                {AVAILABLE_ROLES.map((roleDef) => {
                  const isSelected = selectedRoles.includes(roleDef.id);
                  return (
                    <label 
                      key={roleDef.id} 
                      className={`flex items-center p-3 rounded-xl border transition-all cursor-pointer select-none
                        ${isSelected 
                          ? 'bg-primary/5 border-primary shadow-sm' 
                          : 'bg-background border-border hover:bg-muted/50 hover:border-primary/30'
                        }
                      `}
                    >
                      <div className="flex items-center justify-center w-5 h-5 rounded border mr-3 shrink-0 transition-colors">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-primary rounded cursor-pointer"
                          checked={isSelected}
                          onChange={() => handleToggleRole(roleDef.id)}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm text-foreground">{roleDef.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">System identifier: <code className="bg-muted px-1 rounded">{roleDef.id}</code></div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-border/50 bg-muted/20 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 font-medium bg-background text-foreground border border-border rounded-lg hover:bg-muted transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoles}
                disabled={isUpdating}
                className="px-4 py-2 font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
              >
                {isUpdating ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isUpdating ? "Saving..." : "Save Roles"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border/50 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 text-blue-600 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Add New User</h3>
                  <p className="text-xs text-muted-foreground">Create a new platform profile</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <UserIcon className="w-3 h-3" /> Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.displayName}
                    onChange={(e) => setNewUser(prev => ({ ...prev, displayName: e.target.value }))}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <Mail className="w-3 h-3" /> Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <Phone className="w-3 h-3" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    placeholder="+1 234 567 890"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <Briefcase className="w-3 h-3" /> Company
                  </label>
                  <input
                    type="text"
                    value={newUser.company}
                    onChange={(e) => setNewUser(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    placeholder="e.g. Acme Corp"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Primary Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as any }))}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                >
                  {AVAILABLE_ROLES.map(r => (
                    <option key={r.id} value={r.id}>{r.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground px-1">
                  This sets the base profile type. You can add secondary roles later.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-6 py-2.5 font-medium bg-background text-foreground border border-border rounded-xl hover:bg-muted transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="px-6 py-2.5 font-medium bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-primary/20"
                >
                  {isAdding ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isAdding ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
