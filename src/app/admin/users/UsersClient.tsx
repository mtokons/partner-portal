"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchAllUsersAction, updateUserRolesAction, createUserAction, deleteUserAction, setUserTestDataFlagAction, checkSuperAdminAction, ensurePartnerRecordAction, resetUserPasswordAction, type DeleteMode, fetchProjectOrgsAction, updateUserDetailsAction, fetchB2bPartnersAction } from "./actions";
import { startImpersonationAction } from "@/app/actions/impersonation";
import { UserProfile, UserRoleType } from "@/types";
import { AVAILABLE_ROLES } from "@/lib/role-options";
import { 
  Users, Search, Shield, Save, X, Edit2, 
  Activity, XCircle, CheckCircle2, UserPlus, Phone, Briefcase, Mail, User as UserIcon,
  Eye, Loader2, Trash2, FlaskConical, AlertTriangle, ShieldAlert, UserMinus,
} from "lucide-react";

export default function UsersClient() {
  const router = useRouter();
  const [users, setUsers] = useState<(UserProfile & { roles: string[] })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewingAsId, setViewingAsId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [syncingPartnerId, setSyncingPartnerId] = useState<string | null>(null);

  // Delete / flag state (super-admin only)
  const [deletingUser, setDeletingUser] = useState<(UserProfile & { roles: string[] }) | null>(null);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("flag");
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [flaggingId, setFlaggingId] = useState<string | null>(null);

  // Selection / Editing State
  const [editingUser, setEditingUser] = useState<(UserProfile & { roles: string[] }) | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<UserRoleType[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit fields state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editOrgId, setEditOrgId] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [b2bPartners, setB2bPartners] = useState<Array<{ id: string; name: string }>>([]);

  // Add User State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState<Partial<UserProfile & { orgId: string }>>({
    displayName: "",
    email: "",
    phone: "",
    role: "customer",
    company: "",
    status: "active",
    orgId: "",
  });
  // Credentials shown to admin after user creation
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; name: string } | null>(null);

  useEffect(() => {
    loadUsers();
    checkSuperAdminAction().then((r) => setIsSuperAdmin(r.isSuperAdmin)).catch(() => {});
    fetchProjectOrgsAction().then((res) => {
      if (res.success && res.data) {
        setOrgs(res.data);
      }
    });
    fetchB2bPartnersAction().then((res) => {
      if (res.success && res.data) {
        setB2bPartners(res.data);
      }
    });
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetchAllUsersAction();
      if (res.success && res.data) {
        setUsers(res.data as unknown as (UserProfile & { roles: string[] })[]);
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
    setEditName(user.displayName || "");
    setEditPhone(user.phone || "");
    setEditCompany(user.company || "");
    setEditStatus(user.status || "active");
    setEditOrgId((user as any).orgId || (user as any).registeredByPartnerId || (user as any).partnerId || "");
    setEditPassword("");
  };

  const handleToggleRole = (role: UserRoleType) => {
    setSelectedRoles((prev) => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    setIsUpdating(true);
    try {
      const isPartnerRole = selectedRoles.includes("partner");
      const selectedOrg = isPartnerRole 
        ? b2bPartners.find((o) => o.id === editOrgId)
        : orgs.find((o) => o.id === editOrgId);
      const res = await updateUserDetailsAction(editingUser.id, {
        displayName: editName,
        phone: editPhone,
        company: editCompany,
        status: editStatus,
        orgId: editOrgId,
        orgName: selectedOrg ? selectedOrg.name : "",
        roles: selectedRoles,
      });
      if (res.success) {
        if (editPassword.trim()) {
          const passRes = await resetUserPasswordAction(editingUser.email, editPassword.trim());
          if (!passRes.success) {
            alert("User updated but failed to set password: " + passRes.error);
          } else {
            alert("User updated successfully, including password");
          }
        } else {
          alert("User updated successfully");
        }
        setEditingUser(null);
        loadUsers(); // Refresh the list
      } else {
        alert(res.error || "Failed to update user");
      }
    } catch (err: any) {
      alert("Failed to update user");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleViewAs = async (user: UserProfile & { roles: string[] }) => {
    setViewingAsId(user.id);
    try {
      const result = await startImpersonationAction(
        user.email,
        user.displayName,
        user.roles?.length ? user.roles : [user.role],
        user.id
      );
      if (result.success && result.redirectTo) {
        router.push(result.redirectTo);
        router.refresh();
      } else {
        alert(result.error || "Failed to start impersonation");
        setViewingAsId(null);
      }
    } catch {
      alert("Failed to start impersonation");
      setViewingAsId(null);
    }
  };

  const openDeleteModal = (user: UserProfile & { roles: string[] }) => {
    setDeletingUser(user);
    setDeleteMode("flag");
    setConfirmText("");
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    if (deleteMode !== "flag" && confirmText.trim().toUpperCase() !== "DELETE") {
      alert('Type DELETE to confirm this irreversible action.');
      return;
    }
    setIsDeleting(true);
    try {
      const res = await deleteUserAction(deletingUser.id, deletingUser.email, deleteMode);
      if (res.success) {
        alert(res.message || "Done");
        setDeletingUser(null);
        loadUsers();
      } else {
        alert(res.error || "Operation failed");
      }
    } catch (err: any) {
      alert(err?.message || "Operation failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleTestFlag = async (user: UserProfile & { roles: string[] }) => {
    setFlaggingId(user.id);
    try {
      const res = await setUserTestDataFlagAction(user.id, !(user as any).isTestData);
      if (res.success) {
        loadUsers();
      } else {
        alert(res.error || "Failed to update flag");
      }
    } catch {
      alert("Failed to update flag");
    } finally {
      setFlaggingId(null);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {    e.preventDefault();
    if (!newUser.displayName || !newUser.email) return;
    setIsAdding(true);
    try {
      const isPartnerRole = newUser.role === "partner";
      const selectedOrg = isPartnerRole 
        ? b2bPartners.find((o) => o.id === (newUser as any).orgId)
        : orgs.find((o) => o.id === (newUser as any).orgId);

      const res = await createUserAction({
        ...newUser,
        orgName: selectedOrg ? selectedOrg.name : "",
        registeredByPartnerId: (newUser as any).orgId || "",
        registeredByPartnerName: selectedOrg ? selectedOrg.name : "",
        partnerId: (newUser as any).orgId || "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Omit<UserProfile, "id">);

      if (res.success) {
        setShowAddModal(false);
        setNewUser({ displayName: "", email: "", phone: "", role: "customer", company: "", status: "active", orgId: "" });
        loadUsers();
        // Show credentials popup so admin can copy & share them
        if ((res as any).tempPassword) {
          setCreatedCredentials({
            email: newUser.email as string,
            password: (res as any).tempPassword,
            name: newUser.displayName as string,
          });
        } else {
          alert("User created successfully");
        }
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
                <th className="px-6 py-4 font-semibold">Partner</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-center">View As</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
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
                          <div className="font-semibold text-foreground flex items-center gap-2">
                            {user.displayName}
                            {(user as any).isTestData && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300/60 uppercase tracking-wide">
                                <FlaskConical className="w-3 h-3" /> Test
                              </span>
                            )}
                          </div>
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
                      {(user as any).orgName || (user as any).registeredByPartnerName ? (
                        <div>
                          <span className="text-xs font-medium text-foreground">{(user as any).orgName || (user as any).registeredByPartnerName}</span>
                          {(user as any).candidateSccgId && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">{(user as any).candidateSccgId}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Direct / Self</span>
                      )}
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
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleViewAs(user)}
                        disabled={viewingAsId === user.id}
                        title={`View portal as ${user.displayName}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/15 text-cyan-500 border border-cyan-500/30 hover:bg-cyan-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {viewingAsId === user.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        View As
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Sync Partner record for partner-role users ─────── */}
                        {user.role === "partner" && (
                          <button
                            onClick={async () => {
                              setSyncingPartnerId(user.id);
                              try {
                                const res = await ensurePartnerRecordAction(user.email, user.displayName, user.company);
                                alert(res.success ? (res.existed ? `Partner record already exists for ${user.email}` : `Partner record created and approved for ${user.email}. User can now log in.`) : (res.error || "Failed"));
                              } finally { setSyncingPartnerId(null); loadUsers(); }
                            }}
                            disabled={syncingPartnerId === user.id}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-emerald-600 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                            title="Create / approve partner record so user can log in without approval screen"
                          >
                            {syncingPartnerId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          </button>
                        )}
                        {/* Get / reset login credentials for any user ──── */}
                        <button
                          onClick={async () => {
                            const res = await resetUserPasswordAction(user.email);
                            if (res.success && (res as any).tempPassword) {
                              setCreatedCredentials({ email: user.email, password: (res as any).tempPassword, name: user.displayName });
                            } else {
                              alert((res as any).error || "Failed to reset password");
                            }
                          }}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-blue-600 hover:bg-blue-500/10 transition-colors"
                          title="Generate / reset login password and show credentials to share"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEditClick(user)}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                          title="Edit Roles"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleToggleTestFlag(user)}
                              disabled={flaggingId === user.id}
                              className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors disabled:opacity-50 ${(user as any).isTestData ? "text-amber-600 bg-amber-500/10 hover:bg-amber-500/20" : "text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600"}`}
                              title={(user as any).isTestData ? "Unflag test data" : "Flag as test data"}
                            >
                              {flaggingId === user.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => openDeleteModal(user)}
                              className="inline-flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Credentials popup (shown after admin creates a user) ───────────── */}
      {createdCredentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-[#0c1024] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-white/10 p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">User created — share these credentials</h3>
                <p className="text-xs text-white/40">Ask the user to change their password after first login.</p>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <CredentialRow label="Name" value={createdCredentials.name} />
              <CredentialRow label="Login URL" value={`${typeof window !== "undefined" ? window.location.origin : ""}/login`} />
              <CredentialRow label="Email" value={createdCredentials.email} />
              <CredentialRow label="Temporary Password" value={createdCredentials.password} secret />
              <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                ⚠️ This password is shown only once. Copy it now before closing.
              </p>
            </div>
            <div className="flex justify-end border-t border-white/10 p-4">
              <button onClick={() => setCreatedCredentials(null)}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20">
                Done — I have copied the credentials
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border/50 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Edit User Profile</h3>
                  <p className="text-xs text-muted-foreground">{editingUser.email}</p>
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
            <div className="p-5 overflow-y-auto space-y-4 max-h-[70vh]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <UserIcon className="w-3 h-3" /> Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <Phone className="w-3 h-3" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                    <Briefcase className="w-3 h-3" /> Company
                  </label>
                  <input
                    type="text"
                    value={editCompany}
                    onChange={(e) => setEditCompany(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm appearance-none"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Set New Password
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to keep current password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Partner Assignment
                </label>
                <select
                  value={editOrgId}
                  onChange={(e) => setEditOrgId(e.target.value)}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm"
                >
                  <option value="">— Direct (No Partner Organization) —</option>
                  {selectedRoles.includes("partner") ? (
                    b2bPartners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  ) : (
                    orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[10px] text-muted-foreground px-1">
                  Assigning a partner links this user to the selected Project Partner organisation.
                </p>
              </div>

              <div className="space-y-1.5 border-t border-border/50 pt-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  System Roles
                </label>
                <div className="grid grid-cols-1 gap-2">
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
                          <div className="text-xs text-muted-foreground mt-0.5">
                            System identifier: <code className="bg-muted px-1 rounded">{roleDef.id}</code>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
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
                onClick={handleSaveUser}
                disabled={isUpdating}
                className="px-4 py-2 font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm shadow-primary/20"
              >
                {isUpdating ? (
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isUpdating ? "Saving..." : "Save Changes"}
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

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Partner Assignment
                </label>
                <select
                  value={newUser.orgId}
                  onChange={(e) => setNewUser(prev => ({ ...prev, orgId: e.target.value }))}
                  className="w-full px-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none transition-all text-sm"
                >
                  <option value="">— Direct (No Partner Organization) —</option>
                  {newUser.role === "partner" ? (
                    b2bPartners.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  ) : (
                    orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[10px] text-muted-foreground px-1">
                  Assigning a partner links this user to the selected Project Partner organisation.
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

      {/* Delete / Test-data Modal (super-admin only) */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border/50 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border/50 bg-rose-500/5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-500/10 text-rose-600 rounded-lg">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Delete User</h3>
                  <p className="text-xs text-muted-foreground">{deletingUser.displayName} &middot; {deletingUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingUser(null)}
                className="p-2 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3">
              <p className="text-sm text-muted-foreground">
                Choose how to handle this user. Use <strong>Flag as test data</strong> for dummy accounts so they are excluded from real metrics on the admin dashboard.
              </p>

              {/* Option: Flag */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${deleteMode === "flag" ? "bg-amber-500/5 border-amber-500/60" : "bg-background border-border hover:border-amber-500/30"}`}>
                <input type="radio" name="deleteMode" className="mt-1 accent-amber-500" checked={deleteMode === "flag"} onChange={() => setDeleteMode("flag")} />
                <div>
                  <div className="font-medium text-sm flex items-center gap-2"><FlaskConical className="w-4 h-4 text-amber-500" /> Only flag as test data</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Nothing is deleted. The user and their records are marked as dummy data.</div>
                </div>
              </label>

              {/* Option: Account only */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${deleteMode === "account" ? "bg-orange-500/5 border-orange-500/60" : "bg-background border-border hover:border-orange-500/30"}`}>
                <input type="radio" name="deleteMode" className="mt-1 accent-orange-500" checked={deleteMode === "account"} onChange={() => setDeleteMode("account")} />
                <div>
                  <div className="font-medium text-sm flex items-center gap-2"><UserMinus className="w-4 h-4 text-orange-500" /> Delete user account only</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Removes the login (Auth + profile + roles). Business records they created are kept.</div>
                </div>
              </label>

              {/* Option: All */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${deleteMode === "all" ? "bg-rose-500/5 border-rose-500/60" : "bg-background border-border hover:border-rose-500/30"}`}>
                <input type="radio" name="deleteMode" className="mt-1 accent-rose-500" checked={deleteMode === "all"} onChange={() => setDeleteMode("all")} />
                <div>
                  <div className="font-medium text-sm flex items-center gap-2"><Trash2 className="w-4 h-4 text-rose-500" /> Delete user AND all related records</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Full cascade: candidates, services, tasks, offers, orders, invoices, installments, B2B, partner record, account.</div>
                </div>
              </label>

              {deleteMode !== "flag" && (
                <div className="bg-rose-500/5 border border-rose-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4" /> This action is irreversible.
                  </div>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-rose-500/40 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="p-5 border-t border-border/50 bg-muted/20 flex justify-end gap-3">
              <button
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 font-medium bg-background text-foreground border border-border rounded-lg hover:bg-muted transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting || (deleteMode !== "flag" && confirmText.trim().toUpperCase() !== "DELETE")}
                className={`px-4 py-2 font-medium rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${deleteMode === "flag" ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-rose-600 text-white hover:bg-rose-700"}`}
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : deleteMode === "flag" ? <FlaskConical className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? "Working..." : deleteMode === "flag" ? "Flag as Test" : deleteMode === "account" ? "Delete Account" : "Delete Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CredentialRow({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">{label}</p>
        <p className={`truncate text-sm font-mono text-white ${secret ? "tracking-widest" : ""}`}>{value}</p>
      </div>
      <button onClick={copy} className="shrink-0 rounded bg-white/10 px-2 py-1 text-[11px] font-medium text-white hover:bg-white/20">
        {copied ? "✓ Copied" : "Copy"}
      </button>
    </div>
  );
}
