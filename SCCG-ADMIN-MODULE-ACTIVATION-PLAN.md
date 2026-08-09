# SCCG Admin Module Activation Plan

**Scope:** Finance, Human Resources, Language School, Certificates, and Candidate Gallery  
**Audience:** Product owner, solution architect, engineering, QA, and operations  
**Status:** Architecture and delivery plan; implementation not started  
**Prepared:** 2026-08-04  
**Related baseline:** `SCCG-CAREER-LAB-PLAN.md`

---

## 1. Executive decision

The feedback is valid, but the solution is not to remove menu items from
`UNAVAILABLE_MENU_KEYS` or point more SCCG links at `/admin/*` and `/partner/*`.
The current access policy gives `sccg-admin` and `sccg-staff` ownership of
`/sccg/*` only. Several menu items currently cross that boundary and either redirect,
reuse the wrong business scope, or expose incomplete workflows.

The target architecture is:

1. Every SCCG workflow is owned by a route under `/sccg/*`.
2. Existing components, repositories, and domain services are reused where their
   business rules are genuinely shared.
3. Partner pages remain partner-scoped. SCCG actions use global scope or an explicitly
   validated partner selected by the SCCG user.
4. Every mutation is authorized server-side, reloads authoritative records by ID,
   validates state transitions, and writes an audit event.
5. A menu item is activated only after its route, guard, data state, empty/error states,
   unit/integration tests, and authenticated E2E scenario are complete.
6. Production release is phased and reversible. Finance security and candidate ownership
   defects are corrected before broad activation.

This preserves the original role model:

- `sccg-admin`: all SCCG modules, including Finance and sensitive HR operations.
- `sccg-staff`: Candidate, HR operations, and School operations, but no Finance,
  Partner Management, Administration, salary data, refunds, or payouts.

---

## 2. Current-state findings

### 2.1 Cross-cutting route ownership

- `src/lib/access-policy.ts` permits SCCG roles under `/sccg`.
- `src/lib/menu-engine.ts` still sends Candidate Gallery, HR, School, Invoices,
  Payments, Payouts, and Reports to `/admin/*` routes.
- `/admin/candidates` aliases a partner page; `/admin/hr` aliases Project Partner user
  management; `/admin/school` aliases the current student's dashboard.
- Candidate registration and offers are hidden in `UNAVAILABLE_MENU_KEYS` because their
  target routes are absent or unsuitable.

**Conclusion:** route-page re-export is not a safe reuse strategy. Reuse must happen at
component, domain-service, and repository boundaries.

### 2.2 Finance

Available assets:

- `/sccg/finance`, `/sccg/expert-payments`, `/sccg/refunds`, and
  `/sccg/partner-performance` exist.
- SharePoint financial, transaction, invoice, installment, payment, and partner data
  access already exists.
- Permission and audit patterns exist for payments, refunds, payouts, reports, and
  expert payment transitions.

Gaps and risks:

- Finance Overview is mainly a read-only summary and only links to three workflows.
- `/admin/invoices`, `/admin/payments`, and `/admin/payouts` reuse partner pages that
  resolve a partner from the signed-in email and can redirect SCCG users to
  `/partner-pending`.
- `expenses` is hard-coded to zero.
- Current `Financial` records require `partnerId`; calculating direct SCCG revenue as
  total minus partner-attributed revenue can therefore return zero or misclassify data.
- Refund issuance accepts a client-supplied transaction object. The server must reload
  the refund request by ID before using amount, client, partner, or order fields.
- There is no single finance read model defining gross revenue, SCCG share, partner
  share, collected, due, expenses, refunds, liabilities, and net position.

### 2.3 Human Resources

Available assets:

- Firestore services already support employees, documents, onboarding tasks, and
  default onboarding checklists.
- Rich Employee and HR models already exist.
- Permission names already distinguish employee operations from salary and document
  access.

Gaps and risks:

- `/admin/hr` is not HR; it reuses Project Partner organization-user management.
- `/admin/hr/employees` does not exist.
- HR services have no complete SCCG pages/actions, workflow orchestration, audit trail,
  or E2E coverage.
- Project Partner `orgId` is not a valid ownership boundary for SCCG employees.

### 2.4 Language School and certificates

Available assets:

- Firestore services already support courses, batches, enrollments, content,
  attendance, results, teachers, teacher earnings, certificates, and revocation.
- Student/customer self-service school views exist.
- A printable certificate component, QR verification data, and public
  `/verify/[code]` route exist.

Gaps and risks:

- `/admin/school` is the student dashboard, not a management console.
- Course, batch, enrollment, teacher, student, certificate, report, and model-test menu
  items are hidden because their management pages do not exist.
- Management server actions and audit records are missing.
- Certificate creation lacks orchestration for eligibility, duplicate prevention,
  enrollment/result linkage, replacement, and controlled revocation.
- Existing self-service actions derive the student from the current session and cannot
  be reused as SCCG management actions.

### 2.5 Candidate Gallery

Available assets:

- Candidate list, registration wizard, service registration, progress display,
  workflow transitions, documents, tasks, payment gates, financial split, account
  creation, notifications, and successful-candidate filtering already exist.

Gaps and risks:

- SCCG links rely on `/admin` or `/partner` routes that are outside the SCCG route
  boundary.
- Partner registration requires a partner resolved from the signed-in email.
- SCCG needs two explicit registration modes: `SCCG Direct` and `On behalf of Partner`.
- `finalizeRegistrationAction` accepts `partnerId` from the client without proving that
  a partner caller owns it.
- Some financial-split and candidate-management mutations need authoritative candidate
  reload plus ownership checks.
- Shared candidate components contain hard-coded partner paths and must accept a route
  base or navigation adapter.

---

## 3. Target information architecture

### 3.1 SCCG routes

```text
/sccg/finance
/sccg/finance/invoices
/sccg/finance/payments
/sccg/finance/receivables
/sccg/finance/payouts
/sccg/finance/expenses
/sccg/finance/reports
/sccg/expert-payments
/sccg/refunds
/sccg/partner-performance

/sccg/hr
/sccg/hr/employees
/sccg/hr/employees/new
/sccg/hr/employees/[id]

/sccg/school
/sccg/school/courses
/sccg/school/courses/[id]
/sccg/school/batches
/sccg/school/batches/[id]
/sccg/school/enrollments
/sccg/school/enrollments/[id]
/sccg/school/students
/sccg/school/teachers
/sccg/school/results
/sccg/school/certificates
/sccg/school/certificates/[id]
/sccg/school/reports
/sccg/school/model-tests
/sccg/school/model-tests/builder

/sccg/candidates
/sccg/candidates/new
/sccg/candidates/[id]
/sccg/candidates/successful
/sccg/offers
```

### 3.2 Reuse pattern

Use this dependency direction:

```text
SCCG page -> SCCG server action -> shared domain service/repository -> data source
         -> shared presentational component
```

Do not use:

```text
SCCG page -> re-export Partner/Admin route page -> partner/org/session scoping
```

Shared UI components must receive explicit capabilities and paths, for example:

- `routeBase`: `/sccg/candidates` or `/partner/candidates`
- `canCreate`, `canAdvance`, `canEditFinance`, `canIssueCertificate`
- action functions appropriate to the current console

The server, not the client capability flags, remains the security authority.

---

## 4. Authorization model

| Capability | SCCG Admin | SCCG Staff | Finance role | HR role | School Manager |
| --- | --- | --- | --- | --- | --- |
| View global candidates/progress | Yes | Yes | Read only if required | No | No |
| Register SCCG-direct candidate | Yes | Yes | No | No | No |
| Register for selected partner | Yes | Yes | No | No | No |
| Advance candidate workflow | Yes | Yes | No | No | No |
| View Finance | Yes | No | Yes | No | No |
| Record/verify payment | Yes | No | Yes | No | No |
| Approve payout/refund | Yes | No | Policy-based | No | No |
| View employee directory | Yes | Yes | No | Yes | No |
| Create/edit employee operations | Yes | Yes | No | Yes | No |
| View/edit salary | Yes | No | No | Yes | No |
| Manage courses/batches/enrollments | Yes | Yes | No | No | Yes |
| Record/publish results | Yes | Policy-based | No | No | Yes |
| Issue/revoke certificates | Yes | No by default | No | No | Yes |

Required enforcement layers:

1. Menu visibility.
2. Page guard (`requireSccgAccess` or `requireSccgAdmin`).
3. Server-action permission (`requirePermission`).
4. Record-level scope validation.
5. State-transition validation.
6. Audit event for every privileged mutation and denied privileged attempt.

No action may trust client-supplied owner IDs, amounts, role names, certificate status,
or current workflow state.

---

## 5. Finance workstream

### 5.1 Canonical finance read model

Create a server-only finance aggregation service that produces one typed snapshot:

- gross sales
- SCCG direct revenue
- SCCG share of partner sales
- partner share/liability
- collected amount
- outstanding receivables
- overdue receivables
- approved/unpaid expert liabilities
- partner payouts due/paid
- operating expenses
- refunds requested/issued
- net cash position
- period comparison and currency

Add explicit, additive attribution fields to the finance source rather than inferring
ownership from a missing `partnerId`:

- `revenueOwner`: `sccg-direct | partner-sale`
- `sourceType`: candidate service, school enrollment, invoice, adjustment, expense,
  refund, expert payment, or partner payout
- `sourceId`, `partnerId`, `candidateId`, `customerId`, `currency`

Backfill existing records deterministically. Produce a dry-run reconciliation report
before writing. Totals before and after migration must reconcile by source and period.

### 5.2 Functional surfaces

1. **Overview:** KPI cards, date/partner/source filters, reconciliation warnings, links
   to all ledgers.
2. **Invoices:** global list, detail, PDF/download, status, source record, partner/client,
   and controlled creation.
3. **Payments:** record, verify, reject, allocate to invoice/installment, payment evidence,
   and immutable transaction history.
4. **Receivables:** due/overdue schedules, aging buckets, reminders, and payment status.
5. **Payouts:** partner and expert liabilities, approval, paid transition, reference, and
   duplicate-payment prevention.
6. **Expenses:** create/category/period/source, evidence attachment, and reporting.
7. **Refunds:** server reload by request ID, validate unresolved request and refundable
   balance, issue once, record immutable ledger event, notify, audit.
8. **Reports:** date, partner, source, and status filters; CSV export first, printable
   summary second.

### 5.3 Finance acceptance criteria

- No SCCG Finance route redirects to `/partner-pending`.
- Dashboard totals reconcile to ledger rows for the selected period.
- Direct SCCG and partner-attributed revenue are separately explainable.
- Payment, payout, refund, and expense mutations are idempotent or reject duplicates.
- Staff cannot see Finance menu items or access Finance URLs directly.
- Every mutation records actor, target, prior state, new state, amount, and reference.

---

## 6. Human Resources workstream

### 6.1 Domain boundary

Use the existing Firestore employee collections. Do not use Project Partner users or
`orgId` as the HR source of truth. Add a repository/domain facade so pages and actions do
not import low-level Firestore services directly.

### 6.2 Functional surfaces

1. **HR Dashboard:** active headcount, department distribution, onboarding progress,
   probation deadlines, document completeness, leave/absence placeholder only if a real
   leave model exists.
2. **Employee directory:** search, department/status filters, stable pagination, export.
3. **Create employee:** identity, contact, employment, department, manager, start date,
   contract type, probation, salary access separated from general fields.
4. **Employee detail:** profile, employment, onboarding checklist, documents, status
   history, audit history.
5. **Documents:** metadata and secure storage reference; validate type/size; never expose
   unrestricted storage URLs.
6. **Lifecycle:** active, probation, on-leave, suspended, terminated with explicit allowed
   transitions and effective dates.
7. **Onboarding:** generate default checklist once; completion is idempotent and audited.

### 6.3 HR acceptance criteria

- HR Dashboard uses employee data, never PPMS organization users.
- SCCG Staff can perform permitted operational tasks but cannot read salary fields.
- Salary and sensitive document fields are omitted server-side, not merely hidden.
- Employee IDs are unique and create/update operations are audited.
- Invalid lifecycle transitions and direct URL access are rejected.

---

## 7. Language School workstream

### 7.1 Operational lifecycle

Implement the complete lifecycle in this order:

```text
Course -> Batch -> Enrollment -> Attendance/Content -> Result -> Certificate
```

Each stage must validate the previous stage. Management pages use global SCCG scope;
student/customer pages remain self-scoped.

### 7.2 Functional surfaces

1. **School Dashboard:** active courses/batches, enrollments, attendance rate, pending
   results, certificate-eligible students, teacher workload, payment summary.
2. **Courses:** create/edit/publish/archive, language/level, duration, fee, curriculum.
3. **Batches:** course, capacity, dates, schedule, teacher, meeting/class location,
   lifecycle, capacity enforcement.
4. **Enrollments:** student search/create, course/batch assignment, fee/discount/net fee,
   payment status, transfer/withdraw/complete.
5. **Students:** global school roster with enrollment and progress summary.
6. **Teachers:** profile, specialization, batch assignment, status, earnings visibility
   controlled separately.
7. **Attendance and content:** roster-based attendance, deterministic upsert, batch/course
   content management.
8. **Results:** draft, review, publish; grading-scale validation; published results become
   certificate eligibility inputs.
9. **Model tests:** expose the existing test system only after role guards, test-builder
   ownership, result linkage, and E2E coverage are verified.
10. **Reports:** enrollment, attendance, result, certificate, teacher, and finance views.

### 7.3 Certificate workflow

Certificate issuance must be an orchestration action, not a direct Firestore create call:

1. Receive `enrollmentId` and certificate type only.
2. Reload enrollment, batch, course, student, and published result server-side.
3. Verify course completion, required attendance threshold, passing result where required,
   and enrollment status.
4. Search for an existing active certificate for the same enrollment and type.
5. Reject duplicates or require an explicit replacement workflow.
6. Generate certificate number and verification code transactionally or with a collision
   check.
7. Persist immutable snapshot fields used on the certificate.
8. Render printable/PDF certificate using the existing certificate view and QR code.
9. Notify the student and audit issuance.
10. Revocation reloads the certificate, validates active state, requires a reason, records
    actor/date, and updates public verification immediately.

### 7.4 School acceptance criteria

- SCCG Admin can complete the full lifecycle from course creation to public certificate
  verification.
- A student can see only their own enrollment, content, results, and certificates.
- Duplicate active certificates cannot be issued for one enrollment/type.
- Revoked certificates clearly show revoked status on `/verify/[code]`.
- Batch capacity, result publication, and certificate eligibility are server-enforced.

---

## 8. Candidate Gallery workstream

### 8.1 SCCG candidate routes

Create SCCG-owned list, registration, detail, and successful-gallery routes. Extract
shared partner UI into neutral components with configurable route base and capabilities.
Do not make SCCG pages re-export partner route pages.

### 8.2 Registration modes

The registration wizard starts with an ownership step:

- **SCCG Direct:** server assigns the canonical direct owner value and SCCG margin policy.
- **On behalf of Partner:** user selects an active partner; the server reloads that partner
  and derives code, margin, currency, and payment configuration.

For partner-console registration, the server ignores the submitted `partnerId` and
derives ownership from the authenticated partner. For SCCG registration, the server
accepts a selected partner ID only after `candidate.create.for-partner` permission and
active-partner validation.

### 8.3 Candidate features

1. Global list with partner, category, status, payment, owner, and date filters.
2. Registration and add-service flows using the existing wizard experience.
3. Candidate detail with personal data, services, documents, tasks, payment, and audit
   history.
4. Workflow progress and permitted next actions from the workflow engine.
5. Payment completion gates preserved.
6. Successful Candidate Gallery remains a saved terminal-status view with links to SCCG
   candidate details.
7. Offer creation links into SCCG-owned registration and candidate routes.
8. Re-run financial split reloads the candidate and services, checks permission/scope,
   and records before/after values.

### 8.4 Candidate acceptance criteria

- SCCG Admin and Staff can register direct candidates and candidates for a selected active
  partner according to permissions.
- Partner users cannot forge another partner ID.
- SCCG users can open list, registration, detail, service progress, documents, and
  successful-gallery links without leaving `/sccg/*`.
- Cross-partner data is visible globally only to SCCG-authorized roles.
- Workflow, payment, task, notification, and audit side effects remain intact.

---

## 9. Delivery sequence and release gates

### Phase 0 - Safety and architecture foundation

Deliverables:

- Confirm route inventory and data-source contracts.
- Add neutral shared components where partner/admin pages currently own presentation.
- Add SCCG route guards and missing permissions.
- Fix refund authoritative reload and candidate partner-ID validation immediately.
- Add audit helper conventions and route/menu contract tests.
- Add feature flags: `SCCG_FINANCE_V2`, `SCCG_HR`, `SCCG_SCHOOL`,
  `SCCG_CANDIDATES_V2`.

Gate: security tests pass; no menu points to a route outside its allowed console.

### Phase 1 - Candidate Gallery parity

Deliverables:

- SCCG candidate list/detail/new routes.
- Shared route-aware candidate components.
- SCCG Direct and validated Partner registration modes.
- Progress, service, document, task, and successful-gallery navigation.

Gate: full candidate E2E suite passes for SCCG Admin, SCCG Staff, Partner A, Partner B,
including forged ownership rejection.

### Phase 2 - Human Resources

Deliverables:

- HR dashboard, directory, create/detail/edit, onboarding, documents, lifecycle.
- Server-side field redaction for Staff.
- Audit and notification hooks.

Gate: HR CRUD, salary isolation, lifecycle, and direct URL tests pass.

### Phase 3 - Language School core

Deliverables:

- Dashboard, courses, batches, enrollments, students, teachers, attendance, content,
  results, reports.
- Student self-service regression coverage.

Gate: course-to-result E2E flow and role-isolation tests pass.

### Phase 4 - Certificates and model tests

Deliverables:

- Eligibility service, issuance/replacement/revocation, printable/PDF view, notifications,
  public verification.
- Model-test management activated only after ownership and result linkage are verified.

Gate: issue, duplicate rejection, revoke, and public verification E2E tests pass.

### Phase 5 - Finance completion

Deliverables:

- Finance attribution migration and reconciliation report.
- Canonical finance snapshot service.
- Invoices, payments, receivables, payouts, expenses, refunds, reports.
- Export and audit coverage.

Gate: finance reconciliation approved by SCCG; mutation idempotency, authorization, and
ledger tests pass.

### Phase 6 - Controlled production activation

Deliverables:

- Activate feature flags for a named SCCG Admin pilot.
- Run authenticated production smoke and read-only reconciliation.
- Enable each menu group only after its production smoke passes.
- Capture SCCG sign-off and remove obsolete `/admin/*` SCCG links.

Gate: all production checks in section 11 pass; rollback remains available.

---

## 10. Test strategy

### 10.1 Test accounts and seeded data

Create isolated, non-personal QA identities:

- SCCG Admin
- SCCG Staff
- Finance user
- HR user
- School Manager
- Teacher
- Student/customer
- Partner A and Partner B

Seed deterministic records for two partners, direct SCCG candidates, finance ledgers,
employees, courses, batches, enrollments, attendance, passing/failing results, and one
certificate-eligible student. Tag all seeded records with a run ID and provide teardown.

### 10.2 Automated layers

**Unit tests**

- access policy and menu route contracts
- role-to-permission matrix
- finance attribution and totals
- candidate ownership resolution
- workflow transition and payment gates
- certificate eligibility and duplicate rules
- HR salary redaction and lifecycle transitions

**Integration/action tests**

- authoritative record reload for refunds, payouts, candidates, and certificates
- audit event contents
- idempotency and duplicate rejection
- repository filters and data-source failure behavior

**Playwright E2E**

1. SCCG Admin menu and every target route.
2. SCCG Staff hidden groups and direct URL denial.
3. Candidate direct registration through workflow progress.
4. Candidate registration for Partner A; Partner B cannot mutate it.
5. HR create, onboarding, document, edit, lifecycle, salary isolation.
6. School course -> batch -> enrollment -> attendance -> result -> certificate.
7. Certificate duplicate rejection, print view, public verify, revoke, verify revoked.
8. Finance invoice -> payment -> receivable update -> payout/refund and report totals.
9. Empty, loading, data-source error, validation error, and retry states for each module.
10. Desktop, tablet, and mobile critical-path checks.

No feature is complete because a page returns HTTP 200. E2E must assert visible data,
successful state changes, persisted reload state, authorization denial, and audit entries.

### 10.3 Regression

- Partner candidate registration and isolation.
- Existing Admin finance surfaces.
- Student/customer school self-service.
- School Manager and teacher role behavior.
- Authentication, dashboard routing, suspension, and deleted-user denial.
- Menu audit script reports no active missing route.
- `npm run build` succeeds. If local Vitest remains blocked by the Node native binding,
  execute unit tests in CI or a supported Node LTS environment before production.

---

## 11. Deployment, production validation, and rollback

### Pre-deployment

1. Back up affected Firestore collections and export Finance/SharePoint source records.
2. Run finance migration in dry-run mode and obtain reconciliation approval.
3. Run build, unit/integration, menu-route audit, and full Playwright suite.
4. Verify Firebase client and Admin configuration at build/runtime.
5. Record current production image digest and feature-flag state.

### Deployment

1. Deploy with `deploy_to_vps.sh` to Compose project `partner-portal-main`.
2. Confirm deployment exit code, image digest, running PIDs, and container restart policy.
3. Verify `/api/health`, `/api/livez`, `/login`, and public certificate verification.
4. Keep new module flags disabled until smoke checks complete.

### Authenticated production smoke

- Sign in fresh as SCCG Admin and SCCG Staff; JWT roles require sign-out/sign-in after
  role changes.
- Verify every active menu link stays inside `/sccg/*` and loads the expected module.
- Execute one tagged, reversible record per workflow.
- Confirm persistence after reload, audit event creation, and role denial.
- Reconcile Finance cards to source rows for a controlled date range.
- Issue and revoke a tagged test certificate and verify both public states.

### Rollback

- Disable the affected feature flag/menu group first.
- Restore the previous portal image digest.
- Do not delete newly written business records automatically; reverse them with explicit
  compensating entries where finance/audit immutability applies.
- Restore data only if a reviewed migration rollback is required.
- Preserve audit logs and incident evidence.

---

## 12. Observability and operations

Add structured events and metrics for:

- action success/failure/denial by module and action name
- data-source latency and failure rate
- finance reconciliation mismatch count/value
- candidate registration and transition failures
- school enrollment/capacity conflicts
- certificate issuance/duplicate/revocation events
- HR lifecycle and document failures

Never log passwords, tokens, salary values, identity documents, payment evidence, or full
candidate/student personal data. Alerts should identify record IDs and correlation IDs,
not sensitive payloads.

---

## 13. Definition of done

A module is active only when all statements are true:

- It has an SCCG-owned route and correct menu entry.
- SCCG Admin can complete the intended end-to-end workflow.
- SCCG Staff behavior matches the approved permission matrix.
- Direct URL and record-level authorization are enforced server-side.
- Data is correct after reload and reconciles to its source.
- Mutations validate current state, are idempotent where needed, and are audited.
- Empty, error, and loading states are usable.
- Unit/integration and authenticated Playwright tests pass.
- Partner, student, teacher, and legacy Admin regressions pass.
- Production smoke, observability, rollback, and SCCG acceptance are documented.

---

## 14. Planning decisions requiring SCCG confirmation

These decisions should be confirmed before implementation, but do not block technical
foundation work:

1. Whether SCCG Staff may create/edit employees or only view/operate onboarding.
2. Whether SCCG Staff may publish school results; certificate issue/revoke should remain
   Admin/School Manager by default.
3. Minimum attendance and passing-result rules for completion certificates.
4. Whether certificate PDF files must be persisted or printable/generated on demand.
5. Finance source-of-truth definitions for direct revenue, SCCG share, partner liability,
   expenses, and cash received.
6. Approval thresholds and dual-control rules for refunds and payouts.
7. Whether SCCG candidate registration for a partner applies the partner's configured
   margin automatically or permits an Admin override with mandatory reason/audit.
