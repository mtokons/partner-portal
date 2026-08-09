# Access, Dashboard, and Impersonation Architecture Plan

## 1. Purpose

Fix the current `View As` routing failure and establish one maintainable access model for every user type. This phase is architecture and implementation planning only; it does not change production behavior.

The target system must guarantee that:

- Every authoritative role resolves to exactly one valid default console and dashboard.
- `View As` uses the target user's authoritative identity and lands on that same dashboard.
- A SharePoint business record can enrich a user profile but cannot silently change the user's authorization role.
- Menu visibility is configurable by role and user without being confused with route authorization.
- An administrator can preview the effective dashboard and menu before saving or impersonating.
- Redirects are bounded and can never form a loop.

## 2. Confirmed Current Failure

For `rabiul@mysccg.de`, User Management displays `sccg-admin` from Firestore and also reports `sharepoint-partners` as a source. The SharePoint source is not directly selecting the partner dashboard in the user table: when a Firestore user exists, the aggregator retains its Firestore role and only appends SharePoint as source metadata.

The reproducible failure is a disagreement between four separate routing implementations:

1. `resolveConsole(["sccg-admin"])` correctly returns `sccg`.
2. `startImpersonationAction` has no `sccg` entry in its local console map, so it returns `/dashboard`.
3. The shared dashboard redirects the effective SCCG user to `/sccg/dashboard`.
4. `proxy.ts` has no `/sccg` route policy and does not recognize `sccg-admin` or `sccg-staff` as portal roles, so it redirects to `/login`.
5. The login guard sees the real administrator session and redirects to `/admin/overview`.
6. `/admin/overview` re-exports the shared dashboard, which again sees the impersonated SCCG role and redirects to `/sccg/dashboard`.

This creates the observed `/sccg/dashboard -> /login -> /admin/overview -> /sccg/dashboard` loop. It also explains why the URL can appear to return to an admin or partner-oriented portal even though the role badge says SCCG Admin.

## 3. Architectural Decisions

### 3.1 Identity source authority

Use an explicit precedence model:

| Concern | Authoritative source | Other sources |
| --- | --- | --- |
| Login identity and account status | Firebase Auth | None |
| Roles, primary role, primary console | Firestore `users/{uid}` plus validated Firebase claims | SharePoint role only during controlled legacy migration |
| Partner/customer/expert membership IDs | SharePoint domain lists | Cached in the session for data scoping |
| Profile display fields | Firestore, with defined field-level fallback | SharePoint may fill missing company/name fields |
| Menu overrides | Firestore `menuOverrides` | Code defaults are the baseline |

A SharePoint Partners row means "this identity has a partner business record." It must not mean "this identity is authorized as a partner." The same person may be an SCCG administrator and also have a historical partner record.

### 3.2 Canonical access policy registry

Create one server-safe registry, for example `src/lib/access-policy.ts`, and remove local role/console maps from actions, middleware, login, and guards.

Each policy record should define:

```ts
type RolePolicy = {
  role: UserRoleType;
  console: ConsoleType;
  dashboard: string;
  allowedRoutePrefixes: string[];
  permissions: Permission[];
  defaultMenuKey: string;
};
```

The registry must expose pure functions usable by both Node and proxy runtimes:

- `normalizeRoles(roles)`
- `resolvePrimaryRole(user)`
- `resolveConsoleForRole(role)`
- `resolveDashboardForRole(role)`
- `canAccessRoute(roles, pathname)`
- `getEffectiveAccess(realSession, impersonation)`

There must be no fallback from an unknown role to `partner`. Unknown, empty, or malformed roles must go to a non-looping `/access-denied` page and emit a structured audit event.

### 3.3 Explicit primary role and console

Do not infer a user's landing page from the order of `roles[]`. Store and validate:

- `primaryRole`: the role that chooses the default console.
- `roles`: authoritative entitlements, if multi-role support is required.
- `primaryConsole`: derived from `primaryRole`; do not independently edit it unless multi-console selection is introduced.

Recommended role-to-console proposal:

| Roles | Console | Default dashboard |
| --- | --- | --- |
| `admin`, `project-admin` | admin | `/admin/overview` |
| `sccg-admin`, `sccg-staff` | sccg | `/sccg/dashboard` |
| `finance`, `hr` | admin with scoped permissions | `/admin/dashboard` |
| `school-manager` | school-admin | `/admin/school` |
| `partner`, `partner-individual`, `partner-institutional` | partner | `/partner/dashboard` |
| `project-partner`, `project-partner-admin` | project-partner | `/project-partner/dashboard` |
| `customer` | customer | `/customer/dashboard` |
| `expert`, `teacher` | expert | `/expert/dashboard` |
| `student` | student | `/student/dashboard` |
| `job-seeker` | job-seeker | `/job-seeker/dashboard` |
| `job-partner` | job-partner | `/job-partner/dashboard` |
| `ausbildung-seeker` | ausbildung-seeker | `/ausbildung/seeker/dashboard` |
| `ausbildung-partner` | ausbildung-partner | `/ausbildung/partner/dashboard` |

Finance and HR need product-owner confirmation before implementation: either use a permission-filtered admin dashboard as proposed or receive dedicated dashboards.

### 3.4 Effective identity during impersonation

Treat impersonation as a single effective-access context:

```ts
type EffectiveAccessContext = {
  actor: RealAdminIdentity;
  subject: TargetUserIdentity;
  roles: string[];
  primaryRole: string;
  console: ConsoleType;
  dashboard: string;
  memberships: { partnerId?: string; customerId?: string; expertId?: string };
  isImpersonating: boolean;
};
```

Build this context server-side from the target email/UID. The browser must send only a stable target identifier, not a trusted role array. On every impersonation start, reload the target's current authoritative role and status. Reject suspended users, unknown roles, self-impersonation, and targets above the actor's privilege level.

The signed cookie should contain a short-lived session ID or minimal immutable claims. Remove the production fallback signing secret, validate the actor on every request, use constant-time signature comparison, and log start, stop, expiry, and denied actions.

### 3.5 Navigation is not authorization

Keep two separate controls:

1. Entitlements determine whether a route or server action is allowed.
2. Menu policy determines whether an allowed route is shown in navigation.

Hiding a menu item must never revoke or grant route access. Adding a menu item must only select from a registry of existing routes that the target role is authorized to open. Server actions and pages continue to enforce permissions independently.

## 4. Menu and Dashboard Management Design

Extend the existing per-user Menu Access dialog into an Access and Views manager with three scopes:

- System default: code-owned route and menu catalog.
- Role template: administrator-managed defaults for all users with a role.
- User override: exceptions for one user.

Resolution order remains `system default -> role template -> user override`, with locked safety items enforced after merging.

The admin experience should provide:

- Role template selector for all supported roles.
- User override editor showing inherited versus overridden values.
- Add view from a validated route catalog; no free-text URLs.
- Show/hide, rename label, choose icon, move group, and reorder controls.
- Default dashboard selector limited to authorized dashboard-capable routes.
- Reset user to role defaults and reset role to system defaults.
- Effective preview that renders the exact target console/menu without starting impersonation.
- Validation warnings for missing routes, inaccessible routes, duplicate keys, and a missing home/exit path.
- Audit history with actor, target, before/after values, and timestamp.

At least one locked dashboard/home item and the account/exit controls must remain available. Cross-console menu grants require an explicit permission grant; a menu override alone is insufficient.

## 5. Implementation Phases

### Phase 0: Production recovery

1. Add `sccg` to the impersonation destination map as `/sccg/dashboard`.
2. Add `/sccg` and SCCG roles to proxy route policy and shared portal roles.
3. Make `/dashboard` always resolve from the effective primary role, including when the real actor is an admin.
4. Prevent public login routes from redirecting based only on the real actor while impersonation is active.
5. Add an SCCG Admin impersonation regression test before deployment.

This is the smallest safe hotfix, but it is temporary duplication until Phase 1 removes all local maps.

### Phase 1: Canonical policy and redirect consolidation

1. Introduce the canonical access policy registry.
2. Replace maps in `proxy.ts`, impersonation actions, `admin-guard.ts`, login, and shared dashboard.
3. Introduce `/access-denied` as the terminal destination for unknown or unauthorized roles.
4. Add a redirect-loop guard: never redirect when the resolved destination equals the current pathname; deny instead.
5. Add table-driven unit tests covering every role and console.

### Phase 2: Identity and source normalization

1. Add `primaryRole`, normalized `roles`, and optional `memberships` to the authoritative user model.
2. Stop deriving authorization roles from SharePoint Partners/Customers/Experts for users with an authoritative account record.
3. Build a dry-run audit script listing conflicting users, such as `primaryRole=sccg-admin` plus partner membership.
4. Review conflicts before migration; do not delete SharePoint records because they may own business data.
5. Refresh or revoke active sessions after role changes so stale JWT roles cannot persist.

### Phase 3: Secure impersonation context

1. Change `startImpersonationAction` to accept target UID/email only.
2. Resolve role, dashboard, status, and memberships on the server.
3. Centralize effective context consumption in layouts, pages, guards, and server actions.
4. Harden the cookie/session and privilege checks.
5. Add an emergency "Exit View As" endpoint that can clear the cookie without entering a protected console.

### Phase 4: Role templates and view management

1. Add role-scope read/write actions with schema validation and audit logging.
2. Replace the global mixed-console picker with an authorization-filtered route catalog.
3. Add dashboard selection, ordering, reset, and preview controls.
4. Validate all configured routes during build/CI with the existing menu route audit.
5. Add optimistic concurrency/version fields to prevent two administrators overwriting each other.

### Phase 5: Deployment and cleanup

1. Run unit, integration, and authenticated Playwright tests.
2. Deploy the Phase 0 fix separately for rapid recovery.
3. Deploy policy consolidation behind a feature flag, compare routing audit logs, then remove old maps.
4. Remove legacy SharePoint role fallback only after the conflict audit is reviewed.

## 6. Test and Acceptance Matrix

Automated tests must be table-driven for every role in `AVAILABLE_ROLES`.

For each role verify:

- Normal login lands on the expected dashboard.
- Direct `/dashboard` lands on the same dashboard.
- `View As` lands on the same dashboard and displays the impersonation banner.
- Refresh and representative sub-page navigation remain in the target console.
- An unauthorized console returns access denied without visiting a login page.
- Exit impersonation always clears the cookie and returns to User Management.
- A SharePoint membership does not override the authoritative primary role.
- Role and user menu overrides merge in the documented order.
- Hidden menu routes remain protected by route policy.
- Added menu routes are rejected when the role lacks permission.
- No request chain contains repeated URLs or exceeds two redirects after authentication.

Specific production regression case:

1. Set `rabiul@mysccg.de` authoritative `primaryRole` to `sccg-admin`.
2. Retain the existing SharePoint Partners record.
3. Start `View As` from User Management.
4. Expect `/sccg/dashboard`, SCCG Admin dashboard content, SCCG menu, and the banner.
5. Expect no visit to `/partner/dashboard`, `/login`, or `/admin/overview`.

## 7. Delivery Gates

- Gate A: Phase 0 test passes locally and against staging.
- Gate B: Every available role has an explicit policy; no fallback maps to partner.
- Gate C: Identity conflict audit is reviewed before data migration.
- Gate D: Menu changes cannot grant route access and cannot reference missing routes.
- Gate E: Authenticated staging tests pass for login, impersonation, sub-pages, exit, and menu preview.
- Gate F: Production smoke test confirms the Rabiul case and at least one user from every console family.

## 8. Recommended Next Development Slice

Implement Phase 0 plus its SCCG Admin regression test first. It directly resolves the active incident with a small blast radius. After production verification, implement Phase 1 before adding more menu-management features; otherwise each new role or dashboard will continue to require edits in several conflicting routing maps.