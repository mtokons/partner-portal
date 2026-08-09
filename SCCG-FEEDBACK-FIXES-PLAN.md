# SCCG Portal — Feedback Fixes & Feature Development Plan

> Source: Client feedback tables (images 1–3) + error screenshots (Figure 1, Figure 2).
> Terminology: **Console** = Menu / feature area · **Admin** = SCCG-Admin & Staff console.
> Status legend: 🐞 Bug fix · ✨ New feature · 🔧 Config/change

This plan maps every feedback item to the exact code that must change, then sequences the
work.

> **Implementation status — DEPLOYED 2026-08-07 (live on portal.mysccg.de):**
> - ✅ **#5 Services** — Professional Job Training (€190) + Opportunity Card 3 products (€1460/€250/€428).
> - ✅ **#4 DOB optional** — removed from `REQUIRED` in the shared registration wizard.
> - ✅ **#2 / Figure 1** — `TaskFlow` column provisioned on the live list (migration run); board flows Candidate/Staff/SCCG (Partner removed). **Figure 1 error fixed.**
> - ✅ **#2d B** — task creation now emails the candidate (candidate flow) / notifies staff in-app (staff flow).
> - ✅ **#6 E** — "SCCG Sale (no partner split)" toggle in the financial split step (partner share → €0).
> - ✅ **#10 H** — account-level "Add Payment" button + modal with payment-method options under Payment & Account Status.
> - ✅ **#8/#11/#12 K** — portal login button already present; CC `info@mysccg.de` on registration + status emails; owning partner notified on status change.
> - ✅ **#7** — documents no longer vanish after refresh (folder now matched by stable `- {candidateId}` suffix in [candidate-documents.ts](src/lib/candidate-documents.ts)).
> - ✅ **#3** — admin-only **Special Approval** toggle unlocks service start without payment (audited, reversible); `ServiceUnlocked` column added to Candidates.
> - ✅ **#9** — **Add Success Story** (Name/Profession/Service/Photo) in the Successful Candidate Gallery; new `SuccessStories` list + CRUD.
> - ✅ **#1** — SCCG/Admin dashboard revenue + due now include live candidate payments (deposits/outstanding).
> - ✅ **#13** — CV / Cover Letter / CV Tailor already present in the SCCG **Operation** menu group (verified accessible).

---

## 0. Extracted Feedback (verbatim summary)

| # | Console | Who | Issue | Expected Solution |
|---|---------|-----|-------|-------------------|
| 1 | Dashboard | Admin | Total revenue & due not updated / not connected to payment system | Update & connect to payment data |
| 2 | Task board | Admin/Staff | (a) Cannot add task → error "Field 'TaskFlow' is not recognized" (Figure 1). (b) Task should be split into 4 flows: Candidate / Partner / Staff / SCCG. (c) Select the respective person from a list. (d) Adding a task should auto-email candidate & partner (staff → notification) | (1) Fix the error. (2) Remove the "Partner task" flow |
| 3 | Candidate gallery | Admin | Without payment, service is locked (staff/partner cannot start). Admin needs override | Add **"Special Approval"** button (admin only) that unlocks the service for partner & staff |
| 4 | Registered candidate → Personal info | Admin/Staff | Date of Birth is mandatory → blocks limited-info registration | Make **Date of Birth NON-mandatory** |
| 5 | Registered candidate → Service | Admin/Staff | Service list needs updating | (1) Add **"Professional Job Training — €190"** under *Training & Language*. (2) Opportunity Card = 3 products: **All-in €1460**, **Application + Visa preparation €250**, **Premium (Application + Visa + Job training) €428** |
| 6 | Registered candidate → Financial split | Admin/Staff | SCCG direct sales still split with partner | (1) Add **"SCCG Sales"** option under financial split that removes the partner split entirely. (2) If staff works for a partner, allow choosing a partner from a dropdown before splitting |
| 7 | Registered candidate → Document | Admin/Staff | Documents vanish after page refresh | Uploaded documents must **persist** after refresh |
| 8 | Email for registered candidate | Candidate | Auto-generated email has no portal link | Add **portal link** to the candidate email |
| 9 | Successful Candidate Gallery | Admin/Staff | Missing "Add Success Story" | Add **Success Story** entry: Name, Profession, Service, Photo |
| 10 | Candidate gallery → View details | Admin/Staff | No way to record ongoing/regular payments | Add **"Add Payment"** under *Payment & Account Status* with payment-method options (Figure 2) |
| 11 | Candidate email | Candidate | Contact address `info@mysccg.de` | Admin + Faria must be **CC'd** on candidate emails |
| 12 | Candidate status update | Partner | Partner not notified on status change | Partner gets an **email notification** on candidate status change |
| 13 | Operation | Admin/Staff | No basic operations view | Provide basic CV / Cover letter / CV-tailor operations view (client-service timeline + assign-expert to be specced separately) |

---

## 1. Root-cause notes verified in code

- **Figure 1 error** (`Field 'TaskFlow' is not recognized`): The SCCG task board writes a
  `TaskFlow` column ([src/lib/sharepoint.ts](src/lib/sharepoint.ts#L4388)) that **does not exist**
  in the SharePoint `CandidateTasks` list. The column is defined in code (`CANDTASK_COL.taskFlow = "TaskFlow"`)
  but was never provisioned on the list, so every create/update fails.
- **Task flows** currently only `sccg | partner` — see [src/types/index.ts](src/types/index.ts#L1734)
  and the `FLOWS` array in [SccgTaskBoardClient.tsx](src/app/(portal)/sccg/tasks/SccgTaskBoardClient.tsx#L11).
- **Service pricing** is defined in [src/lib/data/service-pricing.ts](src/lib/data/service-pricing.ts)
  (Training & Language + Opportunity Card blocks) — this is where items #5 changes land.
- **Financial split** logic lives in [src/lib/engine/financial-split.ts](src/lib/engine/financial-split.ts)
  and UI in [Step4FinancialSplit.tsx](src/app/partner/candidates/new/steps/Step4FinancialSplit.tsx).

---

## 2. Work Items — detailed implementation

### 🐞 A. Task board create-task error + 4-flow model (Item #2, Figure 1) — **P0 ✅ (code done, migration pending)**
1. **Provision `TaskFlow` column** on the `CandidateTasks` SharePoint list — an existing
   migration already does this: `npm run sp:add-task-flow`
   ([scripts/add-workflow-category-column.mjs](scripts/add-workflow-category-column.mjs)).
   It was **never run in production**, which is why every task create fails. The column
   def was changed from a `choice` (sccg/partner only) to a **text** column so it accepts
   all four flow values. **Run this against prod to fix Figure 1.**
2. **Extend the type**: `CandidateTaskFlow = "candidate" | "partner" | "staff" | "sccg"` in
   [src/types/index.ts](src/types/index.ts#L1734).
3. **Update `FLOWS`** in [SccgTaskBoardClient.tsx](src/app/(portal)/sccg/tasks/SccgTaskBoardClient.tsx#L11):
   per feedback #2(b) show **Candidate / Staff / SCCG**, and **remove the Partner flow**
   from the SCCG board (feedback: "remove all tasks for partner task").
4. **Assignee picker**: replace free-text assignee with a **dropdown of the respective people**
   for the selected flow — candidate (from candidate list), staff (from employees list), SCCG (internal users).
5. **Harden `saveSccgTaskAction`** ([actions.ts](src/app/(portal)/sccg/tasks/actions.ts#L31)) to
   validate the new flow set and stop rejecting valid tasks.
6. **Regression**: verify partner task board ([src/app/partner/tasks](src/app/partner/tasks/actions.ts))
   still works after the column change.

### ✨ B. Auto-email / notification on task creation (Item #2d) — **P1**
- On successful `saveSccgTaskAction` (create only), trigger:
  - Candidate flow → email candidate.
  - Partner-related → email partner.
  - Staff flow → in-app notification (preferred) instead of email.
- Reuse existing mail/notification helpers (search `sendMail` / notification lib in `src/lib`).

### 🔧 C. Service catalog updates (Item #5) — **P0**
Edit [src/lib/data/service-pricing.ts](src/lib/data/service-pricing.ts):
1. Add **Training & Language** add-on: `"Professional Job Training"` — `basePrice: 190`.
2. Replace/add **Opportunity Card** products to exactly three:
   - `Opportunity Card — All Inclusive` → **1460** (adjust existing `sp-oppcard-001` from 3500).
   - `Opportunity Card — Application + Visa Preparation` → **250**.
   - `Opportunity Card — Premium (Application + Visa Support + Job Training)` → **428**.
   - Reconcile existing `sp-oppcard-002/003/004` (retire or fold into the 3 products).
> ⚠️ Confirm with client whether existing OC price (€3500 all-inclusive) is fully replaced by €1460.

### ✨ D. Date of Birth optional (Item #4) — **P0**
- Make DOB non-required in the registration UI
  ([Step2PersonalInfo.tsx](src/app/partner/candidates/new/steps/Step2PersonalInfo.tsx)) and any
  admin/staff candidate form; ensure `createCandidate` ([sharepoint.ts](src/lib/sharepoint.ts#L3998))
  and validation schema treat `dateOfBirth` as optional.

### ✨ E. Financial split: "SCCG Sales" + partner picker (Item #6) — **P1**
- Add a **"SCCG Sales"** toggle in [Step4FinancialSplit.tsx](src/app/partner/candidates/new/steps/Step4FinancialSplit.tsx)
  that, when on, sets partner share = 0 and routes 100% to SCCG in
  [financial-split.ts](src/lib/engine/financial-split.ts#L79).
- When staff acts **on behalf of a partner**, show a **partner dropdown** to attribute the split.

### 🐞 F. Document persistence after refresh (Item #7) — **P1**
- Investigate [Step7Documents.tsx](src/app/partner/candidates/new/steps/Step7Documents.tsx) +
  candidate document actions: uploads likely stored only in client state and not committed to
  SharePoint/Drive on submit. Ensure documents are persisted server-side and re-hydrated on load.

### ✨ G. Admin "Special Approval" unlock (Item #3) — **P1**
- Add an admin-only **"Special Approval"** action on the candidate gallery/detail that sets an
  `serviceUnlocked` flag on the candidate, letting partner/staff start service without payment.
- Gate the button behind an admin permission; surface the unlocked state in the workflow view.

### ✨ H. "Add Payment" under Payment & Account Status (Item #10, Figure 2) — **P1**
- In candidate detail ([ServiceWorkflowView.tsx](src/app/partner/candidates/[id]/ServiceWorkflowView.tsx#L284))
  add an **"Add Payment"** button + modal (amount, method, date, reference) that records a
  transaction and updates deposit/paid totals — reuses `updateCandidateFinanceAction`
  ([actions.ts](src/app/partner/candidates/actions.ts#L833)).

### 🐞 I. Dashboard revenue/due connected to payments (Item #1) — **P1**
- Wire admin dashboard revenue + due cards to the same transaction/payment source used by
  Finance (candidate `depositAmount` / transactions), so totals reflect actual payments.

### ✨ J. Success Story in Successful Gallery (Item #9) — **P2**
- Add "Add Success Story" (Name, Profession, Service, Photo) to
  [successful candidates](src/app/(portal)/sccg/candidates/successful/SuccessfulCandidatesClient.tsx);
  new SharePoint list `SuccessStories` + CRUD action + gallery card.

### ✨ K. Email improvements (Items #8, #11, #12) — **P2**
- #8: Add portal link to candidate auto-emails.
- #11: CC `info@mysccg.de` recipients (admin + Faria) on candidate email workflow.
- #12: Send partner an email notification on candidate status change.
- Centralize in the mail helper used across candidate workflow emails.

### ✨ L. Operations view (Item #13) — **P2 (partial)**
- Basic view linking CV / Cover letter / CV-tailor per candidate (leverage existing
  [cv-suite](src/app/(portal)/admin/cv-suite)). Client-service timeline & assign-expert are
  **out of scope** here (client will spec separately).

---

## 3. Suggested sequencing

| Phase | Items | Rationale |
|-------|-------|-----------|
| **P0 — Blockers** | A (task error + flows), C (services), D (DOB optional) | Unblocks daily use; low risk, high impact |
| **P1 — Core** | B, E, F, G, H, I | Payment/financial correctness + document integrity |
| **P2 — Enhancements** | J, K, L | Marketing/comms + operations visibility |

---

## 4. Open questions for the client (need answers before build)
1. **#5** — Does the new Opportunity Card **All-in €1460** fully replace the current €3500
   all-inclusive package, and should existing OC add-ons (€190/€250/€120) be removed?
2. **#2** — Should the SCCG board keep only **Candidate / Staff / SCCG** (partner removed), and
   should the separate partner board remain untouched?
3. **#3** — After "Special Approval", should the unlock be logged/audited and reversible?
4. **#6** — For "SCCG Sales", is partner share strictly €0, or a different internal split?
5. **#13** — Confirm the minimum Operations view for this round (view-only vs. actions).

---

*Next step: on approval of scope + answers to §4, implement in P0 → P1 → P2 order with a
migration script for the `TaskFlow` column first (fixes Figure 1 immediately).*
