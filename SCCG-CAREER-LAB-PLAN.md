# SCCG Career Lab Portal — Two New Roles (SCCG Admin & SCCG Staff)

**End-to-end plan + implementation map**
Owner: Full‑stack team · Status: Foundation implemented, modules phased · Last updated: 2026‑08‑04

> **2026-08-04 architecture revision:** The detailed activation plan for Finance, HR,
> Language School, Certificates, and Candidate Gallery is in
> `SCCG-ADMIN-MODULE-ACTIVATION-PLAN.md`. Route-policy validation showed that SCCG roles
> own `/sccg/*`, while several earlier reuse links target `/admin/*` or `/partner/*` and
> inherit incorrect partner, student, or organization scope. For these modules, reuse
> shared components and domain services behind SCCG-owned routes; do not re-export route
> pages. The newer activation plan supersedes conflicting route-reuse decisions below.

---

## 1. Executive summary

The SCCG Career Lab Portal introduces an **internal operations console** with two access
levels that mirror how SCCG actually works day‑to‑day:

| Role | Internal meaning | Access |
| --- | --- | --- |
| **SCCG Admin** | Company administrator / management | Full access to every module incl. Finance, Partner Management, Administration |
| **SCCG Staff** | Operations employee | Everything **except** Partner Management, Finance and Administration |

Both roles share **one console** (`sccg`) and **reuse the existing admin pages**
(candidates, CV bank, operations, HR, school, wallets, sales). The difference between
the two roles is enforced by a **role‑filtered menu** plus **permission guards** — this is
standard RBAC and avoids duplicating pages.

> Design decision (made autonomously, see §9): reuse existing `/admin/*` pages behind a
> new `sccg` console with a role‑aware menu, rather than cloning pages. Fastest path,
> least maintenance, no regression to the legacy `admin` superuser role.

---

## 2. Where this plugs into the current architecture

The portal already has a mature role/menu/permission engine. The new roles slot in with
minimal, well‑isolated changes:

| Concern | File | Change |
| --- | --- | --- |
| Role unions | `src/types/index.ts` | add `sccg-admin`, `sccg-staff` |
| Role picker (admin UI) | `src/lib/role-options.ts` | add both roles |
| Console + menu | `src/lib/menu-engine.ts` | new `sccg` console, `SCCG_MENU`, `resolveConsole` mapping, `adminOnly` flag |
| Shell theme + staff filter | `src/components/layout/ConsoleShell.tsx` | theme entries + hide `adminOnly` items from Staff |
| Page guards | `src/lib/admin-guard.ts` | `requireSccgAccess`, `requireSccgAdmin`; let `sccg-admin` pass `requireAdmin` |
| Server‑action permissions | `src/lib/permissions.ts` | `sccg-admin` ⇒ admin parity; `sccg-staff` added to staff‑level entries |
| Auth resolution | `src/auth.ts` | resolve the roles from Firestore/SharePoint + optional email allowlist |
| Firestore role type | `src/lib/firebase-auth.ts` | widen `FirebaseUserRole` |
| Post‑login routing | `src/app/(shared)/dashboard/page.tsx`, `src/app/login/page.tsx` | send sccg roles to `/sccg/dashboard` |
| Dashboards | `src/app/(portal)/sccg/dashboard/*` | role‑aware Staff vs Admin dashboard |

---

## 3. Console layout & menu (exact operational order)

The console follows the **exact module order** from the requirement doc. `A` = Admin‑only.

### Main Console
1. **Dashboard** — role‑aware (see §4)
2. **Task Board** — SCCG Tasks + Partner Tasks (reuses `/admin/tasks`)

### Other Console (operational order)
1. **Candidate Gallery** — `All Candidates`, `Register a Candidate`, `Create Offer`, `Successful Candidate Gallery`
2. **Operation** — `Create CV & Cover Letter`, `Client Service Timeline`, `Assign Expert`, `Expert Session Overview`
3. **Candidate Bank** — Premier / Professional pools, CV Ausbildung, CV Job, CV Study, CV Waiting‑for‑review, GDPR, Candidate Sharing
4. **Partner Management** `A` — Manage Partner, Partner Performance, Project Partner, Approval
5. **Sales & Marketing** — Manage Product, Booking & Lead, Marketing Materials, Current Campaign/Promotion
6. **Finance** `A` — Overall / SCCG / Partner finance, Sales, Income, Due, P&L, Payout, Expert Payment, Reports, Refund
7. **Human Resource** — HR Dashboard, Employee
8. **Language School** — school management
9. **Wallet & Rewards** — wallet + rewards
10. **Administration** `A` — User Management, Access Control, Role Management, System Settings

Menu items in groups **4, 6 and 10** carry `adminOnly: true`; the shell hides them for
SCCG Staff. All hrefs point at **existing, working routes** where they already exist; new
routes are phased in (§6) and stay hidden until their page ships (via `UNAVAILABLE_MENU_KEYS`).

---

## 4. Dashboard requirements

**SCCG Staff dashboard**
- Total Registered Clients
- Current Partners
- Today's Due Payments

**SCCG Admin dashboard**
- Total Revenue / Income
- Total Due Amount
- Total Registered Clients
- Partner Performance

Both render from existing SharePoint aggregations (`getClients`, `getPartners`,
`getInstallments`, `getFinancials`, `getSalesOrders`) already used by the legacy admin
dashboard — no new data source required for the foundation.

---

## 5. Module‑by‑module reuse map

| Requirement module | Reuse (existing) | Gap to build |
| --- | --- | --- |
| Task Board (SCCG + Partner flows, priority, deadline, comments) | `/admin/tasks` task board | Split into two tabs (SCCG vs Partner); ensure priority = Prio/General/Low |
| Candidate Gallery + filters | `/admin/candidates`, `/admin/candidates/new`, offers | `Successful Candidate Gallery` view by category |
| Operation → CV & Cover Letter | `/admin/cv-maker`, `/admin/cover-letters`, `/admin/cv-tailor` | — |
| Operation → Client Service Timeline | `customer/timeline` model | Template generator (name/contact/ID, plan, week/month timeline, remarks) |
| Operation → Assign Expert + Session Overview | `/admin/expert-bank`, expert sessions | Session scheduler w/ statuses + colours, meeting‑link send |
| Candidate Bank (pools, sectors, study levels, waiting‑review) | `/admin/cv-bank`, `/admin/cv-suite`, `/admin/gdpr` | Pool categorisation + sector taxonomy + review queue |
| Candidate Sharing with Partner | `/admin/send-email`, email templates | Select candidate → attach CV/profile → pick partner → editable email |
| Partner Management `A` | `/admin/partners`, `/admin/approvals`, `/admin/projects` | Partner Performance view |
| Sales & Marketing | `/admin/products`, `/sales/bookings`, `/admin/promotions` | Marketing Materials store |
| Finance `A` | `/admin/financials`, `invoices`, `payments`, `payouts`, `reports` | Finance summary landing (SCCG vs Partner split), Expert Payment, Refund views |
| Human Resource | `/admin/hr` | Employee records depth |
| Language School | `/admin/school` (+ subpages) | re‑enable subpages as built |
| Wallet & Rewards | `/admin/wallets`, `gift-cards`, `sccg-cards` | — |
| Administration `A` | `/admin/users`, `menu-config`, `activity-log`, `data-sources` | Access Control / Role Management surface |
| Notifications | `notifications-bus`, `NotificationsLiveBridge` | wire task/payment/candidate/partner events |
| GDPR / Activity log / Search / Responsive | `gdpr-service`, `activity-log`, existing search, responsive shell | — |

---

## 6. Delivery phases

**Phase 0 — Role foundation (this pass, implemented):**
roles, `sccg` console, role‑filtered menu (exact order), permissions, auth wiring,
page guards, Staff & Admin dashboards. The two roles are now real and usable against
every reused module.

**Phase 1 — Operational depth:** Task Board dual‑flow + priorities; Successful Candidate
Gallery; Candidate Bank pools & review queue; Candidate Sharing wizard.

**Phase 2 — Operation tooling:** Client Service Timeline template; Assign Expert
scheduler with coloured session statuses and meeting‑link sending; Expert Session Overview.

**Phase 3 — Finance & Partner depth:** Finance summary landing (SCCG vs Partner),
Expert Payment, Refund; Partner Performance.

**Phase 4 — Marketing & Admin surface:** Marketing Materials store; Access Control /
Role Management UI; notification wiring for all event types.

Each phase re‑enables its menu keys from `UNAVAILABLE_MENU_KEYS` as pages ship, verified
by `scratch/audit-menu-routes.mjs`.

---

## 7. Security & compliance

- **RBAC everywhere:** menu visibility + `requireSccgAccess`/`requireSccgAdmin` page guards
  + `requirePermission` on every mutating server action. Staff can never reach admin‑only
  modules by URL because the reused pages carry the admin guard.
- **GDPR:** candidate records/permissions continue through `gdpr-service`; Candidate Bank
  respects consent before sharing.
- **Audit:** every denied permission and privileged action is written via `writeAuditLog`
  / `activity-log`, surfaced in Administration → Activity Log.
- **Responsive:** the shared `ConsoleShell` is already responsive (desktop/laptop/tablet/mobile).

---

## 8. Test plan

1. Create one `sccg-admin` and one `sccg-staff` user via Admin → Manage Users.
2. Log in as each; confirm both land on `/sccg/dashboard` with the correct metrics.
3. Staff: confirm Partner Management, Finance, Administration groups are **absent** from the
   sidebar and that direct URLs (`/admin/financials`, `/admin/partners`, `/admin/users`)
   redirect away.
4. Admin: confirm all groups visible and reachable.
5. `npm run build` must pass (Vitest can't run on this Windows/Node 25 box — see repo memory).

---

## 9. Decisions log

- **Reuse admin pages** behind a new `sccg` console (vs cloning) — least duplication.
- **SCCG Admin = internal full access** but on the *new* console, not the legacy `admin`
  console, so the two hierarchies stay clean.
- **SCCG Staff** access is the doc's staff set: everything except Partner Management,
  Finance, Administration.
- **Exact menu order** from the requirement doc is honoured for the `sccg` console.
</content>
</invoke>
