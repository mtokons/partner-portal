"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  UserCheck,
  ShieldCheck,
  Building2,
  UserPlus,
  Search,
  UserX,
  Eye,
  UserCog,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Menu as MenuIcon,
  Plus,
  Trash2,
} from "lucide-react";
import type { ManagedUserItem } from "@/lib/admin-users";
import { createSystemUserAction, updateUserStatusAction, updateUserRoleAction, deleteUserAction } from "@/app/actions/admin-users";
import {
  getUserMenuOverridesAction,
  saveUserMenuOverridesAction,
} from "@/app/actions/menu-overrides";
import { startImpersonationAction } from "@/app/actions/impersonation";
import { AVAILABLE_ROLES, DASHBOARD_OPTIONS, USER_CATEGORIES, resolveCategory } from "@/lib/role-options";
import {
  DEFAULT_MENUS,
  resolveConsole,
  UNAVAILABLE_MENU_KEYS,
  type MenuItem,
} from "@/lib/menu-engine";

interface UserManagementClientProps {
  initialUsers: ManagedUserItem[];
  currentAdminEmail?: string;
}

/** A single row in the per-user Menu Access editor. */
interface MenuAccessRow {
  menuKey: string;
  label: string;
  href: string;
  icon: string;
  groupName: string;
  groupOrder: number;
  itemOrder: number;
  isEnabled: boolean;
  isDefault: boolean;
}

export default function UserManagementClient({
  initialUsers,
  currentAdminEmail,
}: UserManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [usersList, setUsersList] = useState<ManagedUserItem[]>(initialUsers);

  // Sync state if server re-fetches
  useEffect(() => {
    setUsersList(initialUsers);
  }, [initialUsers]);

  // Client-side Firestore real-time / query fallback
  useEffect(() => {
    async function loadClientFirestoreUsers() {
      try {
        const { getFirestoreDb } = await import("@/lib/firebase-auth");
        const { collection, getDocs } = await import("firebase/firestore");
        const db = getFirestoreDb();
        const snap = await getDocs(collection(db, "users"));

        if (!snap.empty) {
          setUsersList((prevUsers) => {
            const map = new Map<string, ManagedUserItem>();
            prevUsers.forEach((u) => map.set(u.email.toLowerCase(), u));

            snap.docs.forEach((docSnap) => {
              const data = docSnap.data();
              const email = String(data.email || "").toLowerCase().trim();
              if (!email) return;

              const existing = map.get(email);
              const primaryRole = String(data.role || "customer");
              if (!existing) {
                map.set(email, {
                  id: docSnap.id,
                  email,
                  displayName: String(data.displayName || data.fullName || email.split("@")[0]),
                  roles: [primaryRole],
                  primaryRole,
                  status: (String(data.status || "active").toLowerCase() as any) || "active",
                  company: String(data.company || data.orgName || ""),
                  phone: String(data.phone || ""),
                  dashboardOverride: String(data.dashboardOverride || "") || undefined,
                  source: "firestore-client",
                });
              } else {
                if (data.company && !existing.company) existing.company = String(data.company);
                if (data.phone && !existing.phone) existing.phone = String(data.phone);
                if (data.dashboardOverride && !existing.dashboardOverride)
                  existing.dashboardOverride = String(data.dashboardOverride);
              }
            });

            return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
          });
        }
      } catch (err) {
        console.warn("Client firestore query skipped:", err);
      }
    }

    loadClientFirestoreUsers();
  }, []);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Create User Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("partner");
  const [newCompany, setNewCompany] = useState("");
  const [createResult, setCreateResult] = useState<{
    success?: boolean;
    password?: string;
    error?: string;
  } | null>(null);

  // Impersonate state
  const [impersonatingEmail, setImpersonatingEmail] = useState<string | null>(null);

  // Edit Role Modal State
  const [editingUser, setEditingUser] = useState<ManagedUserItem | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editName, setEditName] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editDashboard, setEditDashboard] = useState("");
  const [editNote, setEditNote] = useState<string | null>(null);

  // Delete confirmation state
  const [deletingUser, setDeletingUser] = useState<ManagedUserItem | null>(null);

  // Menu Access Modal State
  const [menuUser, setMenuUser] = useState<ManagedUserItem | null>(null);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuSaving, setMenuSaving] = useState(false);
  const [menuRows, setMenuRows] = useState<MenuAccessRow[]>([]);
  const [menuAddKey, setMenuAddKey] = useState("");
  const [menuError, setMenuError] = useState<string | null>(null);

  // Flat, de-duplicated catalog of every real (non-404) menu item across consoles.
  const globalMenuCatalog = useMemo<MenuItem[]>(() => {
    const map = new Map<string, MenuItem>();
    (Object.values(DEFAULT_MENUS) as MenuItem[][]).forEach((list) =>
      list.forEach((item) => {
        if (!UNAVAILABLE_MENU_KEYS.has(item.key) && !map.has(item.key)) {
          map.set(item.key, item);
        }
      })
    );
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, []);


  // Stats calculation
  const totalUsers = usersList.length;
  const activeUsers = usersList.filter((u) => u.status === "active").length;
  const adminUsers = usersList.filter((u) => u.primaryRole === "admin").length;
  const partnerUsers = usersList.filter((u) => u.primaryRole === "partner").length;

  // Filtered Users
  const filteredUsers = usersList.filter((user) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      user.displayName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.company && user.company.toLowerCase().includes(query));

    const matchesRole =
      roleFilter === "all" || user.primaryRole === roleFilter || user.roles.includes(roleFilter);

    const matchesStatus = statusFilter === "all" || user.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateUser = () => {
    setCreateResult(null);
    if (!newFullName.trim() || !newEmail.trim()) {
      setCreateResult({ error: "Please enter a valid name and email address." });
      return;
    }

    startTransition(async () => {
      const res = await createSystemUserAction({
        displayName: newFullName.trim(),
        email: newEmail.trim(),
        role: newRole,
        company: newCompany.trim(),
      });

      if (!res.success) {
        setCreateResult({ error: res.error || "Failed to create user." });
      } else {
        setCreateResult({ success: true, password: res.password });
        setNewFullName("");
        setNewEmail("");
        setNewCompany("");
        router.refresh();
      }
    });
  };

  const handleImpersonate = (user: ManagedUserItem) => {
    setImpersonatingEmail(user.email);
    startTransition(async () => {
      const res = await startImpersonationAction(
        user.email,
        user.displayName,
        [user.primaryRole],
        user.id
      );

      if (res.success && res.redirectTo) {
        window.location.href = res.redirectTo;
      } else {
        alert(res.error || "Failed to start impersonation session.");
        setImpersonatingEmail(null);
      }
    });
  };

  const handleToggleStatus = (user: ManagedUserItem) => {
    const nextStatus = user.status === "active" ? "suspended" : "active";
    if (
      confirm(
        `Are you sure you want to ${nextStatus === "suspended" ? "suspend" : "activate"} user ${
          user.displayName
        } (${user.email})?`
      )
    ) {
      startTransition(async () => {
        const res = await updateUserStatusAction({
          userId: user.id,
          email: user.email,
          status: nextStatus,
        });

        if (res.success) {
          router.refresh();
        } else {
          alert(res.error || "Failed to update user status.");
        }
      });
    }
  };

  const handleSaveRole = () => {
    if (!editingUser || !editRole) return;
    setEditNote(null);
    startTransition(async () => {
      const res = await updateUserRoleAction({
        userId: editingUser.id,
        email: editingUser.email,
        role: editRole,
        displayName: editName.trim() || editingUser.displayName,
        company: editCompany,
        dashboardOverride: editDashboard,
        category: editCategory === "none" ? "" : editCategory,
      });

      if (res.success) {
        setEditNote(res.note || "Saved.");
        router.refresh();
        // Keep the dialog open briefly so the admin sees the re-login note.
        setTimeout(() => setEditingUser(null), 1400);
      } else {
        alert(res.error || "Failed to update user role.");
      }
    });
  };

  const handleDeleteUser = () => {
    if (!deletingUser) return;
    const target = deletingUser;
    startTransition(async () => {
      const res = await deleteUserAction({ userId: target.id, email: target.email });
      if (res.success) {
        setUsersList((prev) => prev.filter((u) => u.email !== target.email));
        setDeletingUser(null);
        router.refresh();
      } else {
        alert(res.error || "Failed to delete user.");
      }
    });
  };

  const openEditUser = (user: ManagedUserItem) => {
    setEditingUser(user);
    setEditRole(user.primaryRole);
    setEditCategory(resolveCategory(user.category, user.primaryRole));
    setEditName(user.displayName || "");
    setEditCompany(user.company || "");
    setEditDashboard(user.dashboardOverride || "");
    setEditNote(null);
  };

  const openMenuAccess = (user: ManagedUserItem) => {
    setMenuUser(user);
    setMenuError(null);
    setMenuAddKey("");
    setMenuRows([]);
    setMenuLoading(true);

    const consoleName = resolveConsole([user.primaryRole]);
    const defaults = (DEFAULT_MENUS[consoleName] || []).filter(
      (m) => !UNAVAILABLE_MENU_KEYS.has(m.key)
    );

    startTransition(async () => {
      const res = await getUserMenuOverridesAction(user.email);
      const overrides = res.success && res.overrides ? res.overrides : [];
      const overrideByKey = new Map(overrides.map((o) => [o.menuKey, o]));

      const rows: MenuAccessRow[] = defaults.map((m) => {
        const ov = overrideByKey.get(m.key);
        return {
          menuKey: m.key,
          label: m.label,
          href: m.href,
          icon: m.icon,
          groupName: m.groupLabel,
          groupOrder: m.groupOrder,
          itemOrder: m.itemOrder,
          isEnabled: ov ? ov.isEnabled : m.isEnabled,
          isDefault: true,
        };
      });

      // Extra (granted) items: overrides that are not part of the console defaults.
      overrides.forEach((o) => {
        if (rows.some((r) => r.menuKey === o.menuKey)) return;
        rows.push({
          menuKey: o.menuKey,
          label: o.label,
          href: o.href,
          icon: o.icon,
          groupName: o.groupName,
          groupOrder: o.groupOrder,
          itemOrder: o.itemOrder,
          isEnabled: o.isEnabled,
          isDefault: false,
        });
      });

      setMenuRows(rows);
      setMenuLoading(false);
    });
  };

  const toggleMenuRow = (menuKey: string) => {
    setMenuRows((prev) =>
      prev.map((r) => (r.menuKey === menuKey ? { ...r, isEnabled: !r.isEnabled } : r))
    );
  };

  const addMenuRow = () => {
    if (!menuAddKey) return;
    const item = globalMenuCatalog.find((m) => m.key === menuAddKey);
    if (!item) return;
    if (menuRows.some((r) => r.menuKey === item.key)) {
      setMenuAddKey("");
      return;
    }
    setMenuRows((prev) => [
      ...prev,
      {
        menuKey: item.key,
        label: item.label,
        href: item.href,
        icon: item.icon,
        groupName: item.groupLabel,
        groupOrder: item.groupOrder,
        itemOrder: item.itemOrder,
        isEnabled: true,
        isDefault: false,
      },
    ]);
    setMenuAddKey("");
  };

  const removeMenuRow = (menuKey: string) => {
    setMenuRows((prev) => prev.filter((r) => r.menuKey !== menuKey));
  };

  const handleSaveMenuAccess = () => {
    if (!menuUser) return;
    setMenuError(null);
    setMenuSaving(true);

    // Only persist rows that differ from the console default:
    //  - default items the admin has DISABLED, and
    //  - extra (non-default) items the admin has GRANTED.
    const overrides = menuRows
      .filter((r) => (r.isDefault ? !r.isEnabled : true))
      .map((r) => ({
        menuKey: r.menuKey,
        label: r.label,
        href: r.href,
        icon: r.icon,
        groupName: r.groupName,
        groupOrder: r.groupOrder,
        itemOrder: r.itemOrder,
        isEnabled: r.isEnabled,
      }));

    startTransition(async () => {
      const res = await saveUserMenuOverridesAction(menuUser.email, overrides);
      setMenuSaving(false);
      if (res.success) {
        setMenuUser(null);
        router.refresh();
      } else {
        setMenuError(res.error || "Failed to save menu access.");
      }
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role.toLowerCase()) {
      case "admin":
        return "destructive";
      case "partner":
        return "default";
      case "expert":
        return "secondary";
      case "customer":
        return "outline";
      case "student":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            User Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage system accounts from Firestore and SharePoint across all roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            disabled={isPending}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setIsAddUserOpen(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add New User
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Total Users
            </CardTitle>
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-slate-500">Firestore & SharePoint</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Active Accounts
            </CardTitle>
            <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers}</div>
            <p className="text-xs text-slate-500">Authorized active logins</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Partners
            </CardTitle>
            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partnerUsers}</div>
            <p className="text-xs text-slate-500">Individual & Institutional</p>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Administrators
            </CardTitle>
            <UserCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{adminUsers}</div>
            <p className="text-xs text-slate-500">Platform Admins</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {AVAILABLE_ROLES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-900">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-800">
            <TableRow>
              <TableHead className="font-semibold">User</TableHead>
              <TableHead className="font-semibold">Role</TableHead>
              <TableHead className="font-semibold">Company / Org</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Source</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-slate-500">
                  No user accounts found matching your filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const isCurrentSelf =
                  currentAdminEmail &&
                  user.email.toLowerCase() === currentAdminEmail.toLowerCase();

                return (
                  <TableRow key={user.email}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold uppercase text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {user.displayName ? user.displayName.slice(0, 2) : "U"}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">
                            {user.displayName}
                            {isCurrentSelf && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={getRoleBadgeVariant(user.primaryRole)} className="capitalize">
                          {user.primaryRole}
                        </Badge>
                      </div>
                    </TableCell>

                    <TableCell className="text-sm text-slate-600 dark:text-slate-400">
                      {user.company || "—"}
                    </TableCell>

                    <TableCell className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                      {(() => {
                        const cat = resolveCategory(user.category, user.primaryRole);
                        const found = USER_CATEGORIES.find(c => c.id === cat);
                        return found ? found.label : cat;
                      })()}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={user.status === "active" ? "default" : "destructive"}
                        className={
                          user.status === "active"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
                            : ""
                        }
                      >
                        {user.status}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-xs capitalize text-slate-500">
                      {user.sources && user.sources.length ? user.sources.join(", ") : user.source}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Impersonate Button */}
                        {!isCurrentSelf && (
                          <Button
                            variant="secondary"
                            size="sm"
                            title="Impersonate User"
                            onClick={() => handleImpersonate(user)}
                            disabled={isPending && impersonatingEmail === user.email}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {impersonatingEmail === user.email ? "Switching..." : "View As"}
                          </Button>
                        )}

                        {/* Edit Role Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit Role & Profile"
                          onClick={() => openEditUser(user)}
                        >
                          <UserCog className="h-4 w-4 text-slate-600" />
                        </Button>

                        {/* Menu Access Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Customize Menu Access"
                          onClick={() => openMenuAccess(user)}
                        >
                          <MenuIcon className="h-4 w-4 text-indigo-600" />
                        </Button>

                        {/* Suspend / Activate Button */}
                        {!isCurrentSelf && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title={user.status === "active" ? "Suspend Account" : "Activate Account"}
                            onClick={() => handleToggleStatus(user)}
                          >
                            {user.status === "active" ? (
                              <UserX className="h-4 w-4 text-red-500" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                          </Button>
                        )}

                        {/* Delete Button */}
                        {!isCurrentSelf && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete Account"
                            onClick={() => setDeletingUser(user)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add User Modal Dialog */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              Add New Platform User
            </DialogTitle>
            <DialogDescription>
              Provision a new user account with Firebase authentication and role permissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input
                placeholder="e.g. John Doe"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email Address *</Label>
              <Input
                type="email"
                placeholder="e.g. user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Primary Role *</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Company / Organization Name (Optional)</Label>
              <Input
                placeholder="e.g. Acme Corp"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
              />
            </div>

            {createResult?.error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{createResult.error}</span>
              </div>
            )}

            {createResult?.success && (
              <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                <div className="flex items-center gap-2 font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Account provisioned successfully!
                </div>
                {createResult.password && (
                  <div className="mt-2 text-xs">
                    Temporary Password:{" "}
                    <code className="rounded bg-emerald-200/60 px-1.5 py-0.5 font-mono font-bold text-emerald-900 dark:bg-emerald-800 dark:text-white">
                      {createResult.password}
                    </code>
                    <p className="mt-1 text-[11px] text-emerald-700">
                      Share this temporary password securely with the user.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
              Close
            </Button>
            <Button onClick={handleCreateUser} disabled={isPending}>
              {isPending ? "Provisioning..." : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Role Modal Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-indigo-600" />
              Edit User Role & Profile
            </DialogTitle>
            <DialogDescription>
              Update access role and profile details for {editingUser?.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Company / Organization</Label>
              <Input
                value={editCompany}
                onChange={(e) => setEditCompany(e.target.value)}
                placeholder="Company (optional)"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_CATEGORIES.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Primary Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ROLES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Landing Dashboard</Label>
              <Select
                value={editDashboard || "__default__"}
                onValueChange={(v) => setEditDashboard(v === "__default__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DASHBOARD_OPTIONS.map((d) => (
                    <SelectItem key={d.path || "__default__"} value={d.path || "__default__"}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] leading-snug text-slate-500">
                Overrides where this user lands after login. Leave as “Default” to route by role.
              </p>
            </div>

            {editNote && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{editNote}</span>
              </div>
            )}

            <p className="text-[11px] leading-snug text-slate-500">
              Firestore is the authoritative identity store; the change is mirrored to Firebase Auth
              claims and (best-effort) SharePoint. The user must sign out and back in for a new role
              to take effect.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Access Modal Dialog */}
      <Dialog open={!!menuUser} onOpenChange={(open) => !open && setMenuUser(null)}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MenuIcon className="h-5 w-5 text-indigo-600" />
              Customize Menu Access
            </DialogTitle>
            <DialogDescription>
              Enable or disable sidebar items for {menuUser?.displayName} ({menuUser?.email}), or
              grant access to additional menus.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {menuLoading ? (
              <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading menu configuration…
              </div>
            ) : (
              <>
                <div className="max-h-[320px] space-y-1.5 overflow-y-auto rounded-lg border p-2">
                  {menuRows.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500">
                      No configurable menu items for this console.
                    </p>
                  ) : (
                    menuRows.map((row) => (
                      <div
                        key={row.menuKey}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={row.isEnabled}
                            onChange={() => toggleMenuRow(row.menuKey)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          <div>
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {row.label}
                              {!row.isDefault && (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  Granted
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{row.href}</div>
                          </div>
                        </div>
                        {!row.isDefault && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Remove granted item"
                            onClick={() => removeMenuRow(row.menuKey)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Grant access to an additional menu</Label>
                  <div className="flex items-center gap-2">
                    <Select value={menuAddKey} onValueChange={setMenuAddKey}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a menu item…" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[280px]">
                        {globalMenuCatalog
                          .filter((m) => !menuRows.some((r) => r.menuKey === m.key))
                          .map((m) => (
                            <SelectItem key={m.key} value={m.key}>
                              {m.label} — {m.href}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="secondary"
                      onClick={addMenuRow}
                      disabled={!menuAddKey}
                      className="flex items-center gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>

                {menuError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{menuError}</span>
                  </div>
                )}

                <p className="text-[11px] leading-snug text-slate-500">
                  Only real, existing routes can be granted. Changes apply the next time the user
                  loads the portal.
                </p>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMenuUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMenuAccess} disabled={menuSaving || menuLoading}>
              {menuSaving ? "Saving..." : "Save Menu Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete User
            </DialogTitle>
            <DialogDescription>
              This permanently removes the Firebase Auth account and Firestore profile for{" "}
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {deletingUser?.displayName}
              </span>{" "}
              ({deletingUser?.email}). They will no longer be able to sign in. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingUser(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser} disabled={isPending}>
              {isPending ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
