import "server-only";
import { getAdminFirestore, getAdminApp } from "@/lib/firebase-admin";
import * as admin from "firebase-admin";
import { Repository } from "@/lib/repository";
import { getAllUserProfiles } from "@/lib/sharepoint";
import { resolveCategory } from "@/lib/role-options";

export interface ManagedUserItem {
  id: string;
  email: string;
  displayName: string;
  roles: string[];
  primaryRole: string;
  status: "active" | "pending" | "suspended";
  company?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
  source: string;
  /** Every store this account was found in (for sync diagnostics). */
  sources?: string[];
  /** Admin-assigned landing dashboard path that overrides role-based routing. */
  dashboardOverride?: string;
  category?: string;
}

/** Record that a user was also found in another store (deduped). */
function addSource(item: ManagedUserItem, name: string): void {
  if (!item.sources) item.sources = item.source ? [item.source] : [];
  if (!item.sources.includes(name)) item.sources.push(name);
}

const normalizeRole = (role: string): string => {
  const r = (role || "").toLowerCase().trim();
  if (r === "admin" || r === "super_admin" || r === "project-admin") return "admin";
  if (r.startsWith("partner")) return "partner";
  if (r === "expert" || r === "teacher") return "expert";
  if (r === "student") return "student";
  if (r === "job-seeker") return "job-seeker";
  if (r === "job-partner") return "job-partner";
  if (r === "project-partner" || r === "project-partner-admin") return "project-partner";
  return r || "customer";
};

async function fetchFirestoreRestUsers(): Promise<ManagedUserItem[]> {
  const projectIds = [
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    process.env.FIREBASE_PROJECT_ID,
    "sccg-partner-portal",
    "partner-portal-dev",
    "partner-portal",
  ].filter(Boolean) as string[];

  const results: ManagedUserItem[] = [];

  for (const projectId of projectIds) {
    try {
      const res = await fetch(
        `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users`,
        { cache: "no-store" }
      );
      if (!res.ok) continue;
      const json = await res.json();
      if (!json.documents || !Array.isArray(json.documents)) continue;

      json.documents.forEach((docSnap: any) => {
        const fields = docSnap.fields || {};
        const email = (fields.email?.stringValue || "").toLowerCase().trim();
        if (!email) return;

        const displayName =
          fields.displayName?.stringValue ||
          fields.fullName?.stringValue ||
          fields.name?.stringValue ||
          email.split("@")[0];

        const primaryRole = normalizeRole(fields.role?.stringValue || "customer");
        const status = (fields.status?.stringValue || "active").toLowerCase() as ManagedUserItem["status"];
        const company = fields.company?.stringValue || fields.orgName?.stringValue || "";
        const category = fields.category?.stringValue || "";
        const phone = fields.phone?.stringValue || "";
        const id = docSnap.name ? docSnap.name.split("/").pop() : email;

        results.push({
          id: id || email,
          email,
          displayName,
          roles: [primaryRole],
          primaryRole,
          status: status === "suspended" ? "suspended" : "active",
          company,
          category,
          phone,
          dashboardOverride: fields.dashboardOverride?.stringValue || undefined,
          source: "firestore-rest",
        });
      });

      if (results.length > 0) break;
    } catch {
      /* non-fatal */
    }
  }

  return results;
}

/**
 * Aggregates user profiles across Firestore (Admin SDK & REST API),
 * Firebase Auth, and SharePoint repositories (UserProfiles, Partners, Customers, Experts).
 * Deduplicates by lowercased email.
 */
export async function getAllManagedUsers(): Promise<ManagedUserItem[]> {
  const userMap = new Map<string, ManagedUserItem>();

  // 1. Fetch Firestore Users via Admin SDK
  try {
    const db = getAdminFirestore();
    const snap = await db.collection("users").get();
    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const email = String(data.email || "").toLowerCase().trim();
      if (!email) return;

      const primaryRole = String(data.role || "customer");
      const normPrimaryRole = normalizeRole(primaryRole);

      userMap.set(email, {
        id: docSnap.id || String(data.uid || email),
        email,
        displayName: String(data.displayName || data.fullName || data.name || email.split("@")[0]),
        roles: [normPrimaryRole],
        primaryRole: normPrimaryRole,
        status: (String(data.status || "active").toLowerCase() as ManagedUserItem["status"]) || "active",
        company: String(data.company || data.orgName || ""),
        category: resolveCategory(String(data.category || ""), normPrimaryRole),
        phone: String(data.phone || ""),
        createdAt: String(data.createdAt || new Date().toISOString()),
        updatedAt: String(data.updatedAt || new Date().toISOString()),
        dashboardOverride: String(data.dashboardOverride || "") || undefined,
        source: "firestore",
        sources: ["firestore"],
      });
    });
  } catch (err) {
    console.warn("getAllManagedUsers: Admin SDK query skipped/failed, trying REST API fallback...", err);
    try {
      const restUsers = await fetchFirestoreRestUsers();
      restUsers.forEach((u) => userMap.set(u.email, u));
    } catch (restErr) {
      console.warn("getAllManagedUsers: REST API fallback failed:", restErr);
    }
  }

  // 2. Fetch Firebase Auth Users
  try {
    const app = getAdminApp();
    if (app) {
      const listResult = await admin.auth(app).listUsers(1000);
      listResult.users.forEach((authUser) => {
        const email = String(authUser.email || "").toLowerCase().trim();
        if (!email) return;

        const customRole = String(authUser.customClaims?.role || "customer");
        const existing = userMap.get(email);
        if (!existing) {
          userMap.set(email, {
            id: authUser.uid,
            email,
            displayName: authUser.displayName || email.split("@")[0],
            roles: [normalizeRole(customRole)],
            primaryRole: normalizeRole(customRole),
            status: authUser.disabled ? "suspended" : "active",
            createdAt: authUser.metadata.creationTime || new Date().toISOString(),
            source: "firebase-auth",
            sources: ["firebase-auth"],
          });
        } else {
          addSource(existing, "firebase-auth");
        }
      });
    }
  } catch (err) {
    console.warn("getAllManagedUsers: Firebase Auth list Users skipped/failed:", err);
  }

  // 3. Fetch SharePoint UserProfiles & UserRoles
  try {
    const spProfiles = await getAllUserProfiles();
    spProfiles.forEach((p) => {
      const email = String(p.email || "").toLowerCase().trim();
      if (!email) return;

      const existing = userMap.get(email);
      if (existing) {
        if (p.company && !existing.company) existing.company = p.company;
        if ((p as any).category && !existing.category) existing.category = (p as any).category;
        addSource(existing, "sharepoint-userprofiles");
      } else {
        const normPrimary = normalizeRole(p.role || "customer");
        userMap.set(email, {
          id: p.id,
          email,
          displayName: p.displayName || email.split("@")[0],
          roles: [normPrimary],
          primaryRole: normPrimary,
          status: p.status === "suspended" ? "suspended" : "active",
          company: p.company || "",
          category: (p as any).category || "",
          phone: p.phone || "",
          source: "sharepoint-userprofiles",
          sources: ["sharepoint-userprofiles"],
        });
      }
    });
  } catch (err) {
    console.warn("getAllManagedUsers: SharePoint UserProfiles query skipped/failed:", err);
  }

  // 4. Fetch SharePoint Partners
  try {
    const partners = await Repository.partners.getAll();
    partners.forEach((p) => {
      const email = String(p.email || "").toLowerCase().trim();
      if (!email) return;

      const existing = userMap.get(email);
      if (existing) {
        if (p.company && !existing.company) existing.company = p.company;
        addSource(existing, "sharepoint-partners");
      } else {
        userMap.set(email, {
          id: p.id,
          email,
          displayName: p.name || email.split("@")[0],
          roles: ["partner"],
          primaryRole: "partner",
          status: p.status === "suspended" ? "suspended" : "active",
          company: p.company || "",
          source: "sharepoint-partners",
          sources: ["sharepoint-partners"],
        });
      }
    });
  } catch (err) {
    console.warn("getAllManagedUsers: SharePoint partners query skipped/failed:", err);
  }

  // 5. Fetch SharePoint Customers
  try {
    const customers = await Repository.customers.getAll();
    customers.forEach((c) => {
      const email = String(c.email || "").toLowerCase().trim();
      if (!email) return;

      const existing = userMap.get(email);
      if (existing) {
        if (c.company && !existing.company) existing.company = c.company;
        addSource(existing, "sharepoint-customers");
      } else {
        userMap.set(email, {
          id: c.id,
          email,
          displayName: c.name || email.split("@")[0],
          roles: ["customer"],
          primaryRole: "customer",
          status: c.status === "suspended" ? "suspended" : "active",
          company: c.company || "",
          source: "sharepoint-customers",
          sources: ["sharepoint-customers"],
        });
      }
    });
  } catch (err) {
    console.warn("getAllManagedUsers: SharePoint customers query skipped/failed:", err);
  }

  // 6. Fetch SharePoint Experts
  try {
    const experts = await Repository.experts.getAll();
    experts.forEach((e) => {
      const email = String(e.email || "").toLowerCase().trim();
      if (!email) return;

      const existing = userMap.get(email);
      if (existing) {
        addSource(existing, "sharepoint-experts");
      } else {
        userMap.set(email, {
          id: e.id,
          email,
          displayName: e.name || email.split("@")[0],
          roles: ["expert"],
          primaryRole: "expert",
          status: e.status === "inactive" ? "suspended" : "active",
          company: e.specialization || "",
          source: "sharepoint-experts",
          sources: ["sharepoint-experts"],
        });
      }
    });
  } catch (err) {
    console.warn("getAllManagedUsers: SharePoint experts query skipped/failed:", err);
  }

  // 7. Ensure default admin accounts exist
  const fallbackAdmins = [
    { email: "hasnain@mysccg.de", name: "Hasnain Admin" },
    { email: "jfridoy@mysccg.de", name: "Fridoy Admin" },
  ];

  fallbackAdmins.forEach((adminUser) => {
    if (!userMap.has(adminUser.email)) {
      userMap.set(adminUser.email, {
        id: `admin-${adminUser.email.split("@")[0]}`,
        email: adminUser.email,
        displayName: adminUser.name,
        roles: ["admin"],
        primaryRole: "admin",
        status: "active",
        company: "SCCG Admin",
        createdAt: new Date().toISOString(),
        source: "system",
      });
    }
  });

  const allUsers = Array.from(userMap.values()).filter((user) => {
    // Keep fallback admins or users with no explicit sources
    if (!user.sources || user.sources.length === 0) return true;
    // Keep user if they exist in Firebase (Firestore or Auth)
    return user.sources.some((s) => !s.startsWith("sharepoint"));
  }).map(user => {
    // Enforce max one category — always resolve to one of the 4 valid values
    user.category = resolveCategory(user.category, user.primaryRole);
    return user;
  });
  return allUsers.sort((a, b) => a.displayName.localeCompare(b.displayName));
}
