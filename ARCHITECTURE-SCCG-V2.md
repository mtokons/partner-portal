# SCCG Portal — Complete Feature Architecture & Implementation Plan
### Version 2.0 — April 2026

---

## A. Executive Summary

The SCCG Partner Portal currently operates with a **single-role user model** (one `role` field per session), a functional sales module (offers → orders → service tasks), expert/customer portals, and a basic referral/payout structure. This document designs **seven major new capabilities**:

1. **Multi-role access model** — A user can simultaneously be Customer + Expert + Partner
2. **Partner model** — Individual vs. Institutional partners with onboarding workflows
3. **Promo code & referral engine** — Auto-generated codes, QR links, attribution, anti-abuse
4. **Commission & profit-sharing accounting** — Ledger-based, real-time, auditable
5. **SCCG Coin wallet** — Internal prepaid stored-value balance
6. **SCCG Gift Card** — Virtual card with balance display and transaction history
7. **Sales integration** — End-to-end flow connecting all systems from offer to settlement

**Platform recommendation**: Use **SharePoint Lists** for all entities (as already established), with **Power Automate** for all workflow triggers. Do NOT introduce Dataverse unless the portal exceeds 20,000 records per list or requires complex relational joins — SharePoint + Graph API is already proven in your stack.

---

## B. Current Portal Gap Analysis

### What works today
| Area | Status |
|------|--------|
| Firebase Auth + NextAuth session | ✅ Working |
| Partner/Admin portal layout | ✅ Working |
| Customer portal layout | ✅ Working |
| Expert portal layout | ✅ Working |
| Sales Shop with products | ✅ Working |
| Sales Offers (CRUD, email, PDF, accept link) | ✅ Working |
| Sales Orders (converted from offers) | ✅ Working |
| Service Tasks on orders | ✅ Working |
| Expert approval flow | ✅ Working |
| Referral type on SalesOffer | ✅ Partial — `saleType` and `referralId` exist |
| Payout records | ✅ Partial — type exists, no automated posting |
| Promotions | ✅ Partial — type exists, no redemption engine |

### Critical gaps

| # | Gap | Impact | Severity |
|---|-----|--------|----------|
| 1 | **Single-role session model** — `SessionUser.role` is a single `UserRole` string. A user who is both Expert AND Partner gets only one role per session. | Experts cannot access Sales Shop. Customers who become partners lose customer features. | 🔴 Critical |
| 2 | **No `UserRoles` junction table** — Roles are embedded in separate tables (Partners, Customers, Experts) with no unified user-to-roles mapping. | Cannot query "all roles for user X". Auth logic is a waterfall of if/else. | 🔴 Critical |
| 3 | **No partner type distinction** — `Partner` interface has no `partnerType` field. Individual and institutional partners are identical. | Cannot apply different commission rates or onboarding flows per partner type. | 🟡 High |
| 4 | **No promo/referral code entity** — Existing `Referral` is a manual record attached to a single offer. No code generation, validation, or reuse. | No self-service referral sharing, no promo campaigns, no attribution tracking. | 🟡 High |
| 5 | **No commission rule engine** — `referralPercent` is manually set per offer. No automated rules based on code type, partner type, or product category. | Commission is ad-hoc, error-prone, unauditable. | 🟡 High |
| 6 | **No wallet/coin system** — No balance entity, no transaction ledger. | Cannot offer SCCG Coin, gift cards, or prepaid balances. | ⬜ New feature |
| 7 | **No gift card entity** — No virtual card records. | Cannot issue gift cards. | ⬜ New feature |
| 8 | **Payout has no ledger model** — `Payout` is a flat record. No append-only transaction history, no reversal mechanism. | Cannot audit commission lifecycle, cannot handle refunds cleanly. | 🟡 High |
| 9 | **Auth waterfall returns first match** — `auth.ts` returns the first role found (partner > customer > expert). User with multiple role-records gets only the first one. | Multi-role impossible. | 🔴 Critical |
| 10 | **Sidebar is binary** — `role === "admin" ? adminLinks : partnerLinks`. No merge of role-specific links. | Expert+Partner sees only partner links, not expert links. | 🔴 Critical |

---

## C. Recommended Business Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    SCCG Platform                         │
├──────────┬───────────┬──────────┬─────────┬──────────────┤
│ Identity │  Commerce │ Finance  │ Wallet  │ Engagement   │
│ Layer    │  Layer    │ Layer    │ Layer   │ Layer        │
├──────────┼───────────┼──────────┼─────────┼──────────────┤
│ Firebase │ Products  │Commision │SCCG Coin│ Promo Codes  │
│ Auth     │ Sales     │ Rules   │ Wallet  │ Referral     │
│ User     │  Offers   │ Payable │ Gift    │  Links       │
│ Profiles │ Sales     │  Ledger │  Cards  │ QR Codes     │
│ Multi-   │  Orders   │ Payouts │ Balance │ Campaigns    │
│  Role    │ Service   │ Settle- │ Txn     │              │
│ Access   │  Tasks    │  ments  │ History │              │
├──────────┴───────────┴──────────┴─────────┴──────────────┤
│        SharePoint Lists (Graph API) + Power Automate     │
└──────────────────────────────────────────────────────────┘
```

---

## D. Role and Permission Matrix

### D.1 — Multi-Role Model

A user can hold **one or more** of these roles simultaneously:

| Role | Code | Description |
|------|------|-------------|
| Customer | `customer` | Buys packages, attends sessions, views invoices |
| Expert | `expert` | Delivers sessions, tracks earnings |
| Individual Partner | `partner-individual` | Sells via referral, earns commission |
| Institutional Partner | `partner-institutional` | B2B reseller, higher commission tier |
| Admin | `admin` | Full platform access, approvals, configuration |

### D.2 — Permission Matrix

| Feature | Customer | Expert | Partner (Ind.) | Partner (Inst.) | Admin |
|---------|----------|--------|----------------|-----------------|-------|
| View own dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Buy packages/sessions | ✅ | ❌ | ❌ | ❌ | ✅ |
| Deliver sessions | ❌ | ✅ | ❌ | ❌ | ❌ |
| Track expert earnings | ❌ | ✅ | ❌ | ❌ | ✅ |
| Access Sales Shop | ❌ | ❌* | ✅ | ✅ | ✅ |
| Create Sales Offer | ❌ | ❌* | ✅ | ✅ | ✅ |
| Create Sales Order | ❌ | ❌* | ✅ | ✅ | ✅ |
| View own referral code | ✅ | ✅ | ✅ | ✅ | ✅ |
| View partner code | ❌ | ❌ | ✅ | ✅ | ✅ |
| Apply promo code | ✅ | ✅ | ✅ | ✅ | ✅ |
| View commission/earnings | ❌ | ✅ | ✅ | ✅ | ✅ |
| SCCG Coin wallet | ✅ | ✅ | ✅ | ✅ | ✅ |
| Gift card management | ✅ | ✅ | ✅ | ✅ | ✅ |
| Approve experts | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve partners | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve payouts | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage products | ❌ | ❌ | ❌ | ❌ | ✅ |
| View all financials | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage promo campaigns | ❌ | ❌ | ❌ | ❌ | ✅ |

*Expert can access Sales Shop only if they also hold a Partner role.

### D.3 — Role Combination Rules

| Combination | Allowed | Sidebar Shows |
|-------------|---------|---------------|
| Customer only | ✅ | Customer nav |
| Expert only | ✅ | Expert nav |
| Partner (Ind.) only | ✅ | Partner nav |
| Partner (Inst.) only | ✅ | Partner nav |
| Admin only | ✅ | Admin nav (superset of all) |
| Customer + Expert | ✅ | Customer nav + Expert nav merged |
| Customer + Partner | ✅ | Customer nav + Partner nav merged |
| Expert + Partner | ✅ | Expert nav + Partner nav merged |
| Customer + Expert + Partner | ✅ | All three merged |
| Admin + anything | ✅ | Admin nav (already has everything) |

---

## E. Full Data Model

### E.1 — New Tables / SharePoint Lists

Below are ALL the entities needed. 🆕 = new list. 🔄 = existing list needs changes.

#### Identity Layer

**🆕 `SCCG UserAccounts`** — Single source of truth for every user

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Auto | SharePoint item ID |
| `FirebaseUid` | Text (100) | Firebase Auth UID (primary key for lookup) |
| `Email` | Text (255) | Unique, login email |
| `DisplayName` | Text (255) | Full name |
| `Phone` | Text (50) | Phone number |
| `Company` | Text (255) | Company/org name |
| `AvatarUrl` | Text (500) | Profile picture URL |
| `PrimaryRole` | Choice | `customer`, `expert`, `partner`, `admin` — for default routing |
| `Status` | Choice | `active`, `pending`, `suspended` |
| `PersonalReferralCode` | Text (20) | Auto-generated, e.g. `SCCG-U-A3K9X2` |
| `SCCGCoinBalance` | Number | Current wallet balance (denormalized for fast reads) |
| `CreatedAt` | DateTime | |
| `UpdatedAt` | DateTime | |

**🆕 `SCCG UserRoles`** — Junction table: user ↔ role (many-to-many)

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Auto | |
| `UserAccountId` | Text (100) | FK → `SCCG UserAccounts.FirebaseUid` |
| `Role` | Choice | `customer`, `expert`, `partner-individual`, `partner-institutional`, `admin` |
| `Status` | Choice | `active`, `pending`, `suspended`, `revoked` |
| `GrantedAt` | DateTime | When this role was assigned |
| `GrantedBy` | Text (100) | Admin who approved (or "self" for registration) |
| `RevokedAt` | DateTime | Nullable — when role was removed |
| `Notes` | Multi-line | |

**🔄 `SCCG Partners`** (existing, add columns)

| New Column | Type | Description |
|------------|------|-------------|
| `FirebaseUid` | Text (100) | FK → UserAccounts |
| `PartnerType` | Choice | `individual`, `institutional` |
| `PartnerCode` | Text (20) | Auto-generated, e.g. `SCCG-PI-7B2M4` or `SCCG-PP-ACME01` |
| `CommissionTier` | Choice | `standard`, `premium`, `enterprise` |
| `TaxId` | Text (50) | For institutional partners |
| `LegalEntityName` | Text (255) | For institutional partners |
| `OnboardingStatus` | Choice | `application`, `review`, `approved`, `rejected` |
| `ApprovedBy` | Text (100) | Admin ID |
| `ApprovedAt` | DateTime | |

**🔄 `SCCG Experts`** (existing, add columns)

| New Column | Type | Description |
|------------|------|-------------|
| `PartnerProfileId` | Text (100) | FK → SCCG Partners.Id (if expert is also a partner) |

**🔄 `SCCG Customers`** (existing, add columns)

| New Column | Type | Description |
|------------|------|-------------|
| `FirebaseUid` | Text (100) | FK → UserAccounts |
| `PartnerProfileId` | Text (100) | FK → SCCG Partners.Id (if customer is also a partner) |

#### Commerce Layer

**🔄 `SCCG Sales Offers`** (existing, add columns)

| New Column | Type | Description |
|------------|------|-------------|
| `PromoCodeId` | Text (100) | FK → SCCG PromoCodes.Id |
| `PromoCodeValue` | Text (20) | The code string that was entered |
| `PromoDiscountAmount` | Number | Discount from promo code |
| `AttributedPartnerId` | Text (100) | Partner who gets commission |
| `AttributedPartnerType` | Choice | `individual`, `institutional` |
| `CommissionRuleId` | Text (100) | FK → CommissionRules.Id |
| `CommissionPercent` | Number | Snapshot of rule at time of offer |
| `CommissionAmount` | Number | Calculated commission |
| `SCCGCoinUsed` | Number | SCCG Coin applied at checkout |
| `GiftCardId` | Text (100) | FK → GiftCards.Id |
| `GiftCardAmountUsed` | Number | Amount deducted from gift card |

**🔄 `SCCG Sales Orders`** (existing, add columns)

Same new columns as Sales Offers above (copied from offer to order on conversion), plus:

| New Column | Type | Description |
|------------|------|-------------|
| `CommissionStatus` | Choice | `pending`, `posted`, `settled`, `reversed` |
| `SettledAt` | DateTime | When commission was finalized |

#### Promo & Referral Layer

**🆕 `SCCG PromoCodes`** — All promo and referral codes

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Auto | |
| `Code` | Text (20) | **Unique.** The actual code string |
| `CodeType` | Choice | `promo-general`, `referral-personal`, `referral-partner-individual`, `referral-partner-institutional` |
| `OwnerId` | Text (100) | FK → UserAccounts.FirebaseUid (who owns it) |
| `OwnerName` | Text (255) | Denormalized |
| `PartnerProfileId` | Text (100) | FK → Partners.Id (for partner codes) |
| `DiscountType` | Choice | `fixed`, `percent`, `none` |
| `DiscountValue` | Number | 0 if code is referral-only (no discount, just attribution) |
| `CommissionRuleId` | Text (100) | FK → CommissionRules.Id (determines profit share) |
| `MaxUses` | Number | 0 = unlimited |
| `CurrentUses` | Number | Counter |
| `MaxUsesPerUser` | Number | 1 = one per customer |
| `MinOrderAmount` | Number | Minimum order total to apply |
| `ApplicableProducts` | Multi-line | JSON array of product IDs (empty = all) |
| `ApplicableCategories` | Multi-line | JSON array of categories (empty = all) |
| `ValidFrom` | DateTime | |
| `ValidUntil` | DateTime | Nullable = never expires |
| `Status` | Choice | `active`, `paused`, `expired`, `revoked` |
| `ShareableLink` | Text (500) | Auto-generated: `https://portal.sccg.com/shop?ref=CODE` |
| `QRCodeUrl` | Text (500) | URL to generated QR image |
| `CreatedAt` | DateTime | |
| `CreatedBy` | Text (100) | |

**Code Format Examples**:

| Code Type | Format | Example |
|-----------|--------|---------|
| General promo | `PROMO-XXXXXX` | `PROMO-SAVE20` |
| Personal referral | `SCCG-U-XXXXXX` | `SCCG-U-A3K9X2` |
| Individual partner | `SCCG-PI-XXXXXX` | `SCCG-PI-7B2M4N` |
| Institutional partner | `SCCG-PP-XXXXXX` | `SCCG-PP-ACME01` |

Where `XXXXXX` = 6-char alphanumeric (uppercase, no ambiguous chars I/O/0/1).

**🆕 `SCCG PromoCodeUsages`** — Every time a code is applied

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Auto | |
| `PromoCodeId` | Text (100) | FK → PromoCodes.Id |
| `Code` | Text (20) | Denormalized |
| `UsedByUserId` | Text (100) | FK → UserAccounts |
| `UsedByEmail` | Text (255) | |
| `SalesOfferId` | Text (100) | FK → SalesOffers |
| `SalesOrderId` | Text (100) | FK → SalesOrders (set on conversion) |
| `DiscountApplied` | Number | BDT |
| `CommissionGenerated` | Number | BDT |
| `UsedAt` | DateTime | |

#### Finance Layer

**🆕 `SCCG CommissionRules`** — Rule engine for profit sharing

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Auto | |
| `Name` | Text (255) | e.g. "Standard Individual Partner 15%" |
| `CodeType` | Choice | `referral-personal`, `referral-partner-individual`, `referral-partner-institutional`, `promo-general` |
| `PartnerTier` | Choice | `standard`, `premium`, `enterprise`, `any` |
| `ProductCategory` | Text (100) | `any` or specific category |
| `CommissionPercent` | Number | % of order total |
| `MinOrderAmount` | Number | |
| `MaxCommission` | Number | Cap per order |
| `IsActive` | Yes/No | |
| `Priority` | Number | Higher priority wins in case of overlap |
| `EffectiveFrom` | DateTime | |
| `EffectiveUntil` | DateTime | |
| `CreatedAt` | DateTime | |

**Default Commission Rules:**

| # | Code Type | Partner Tier | Commission % | Cap |
|---|-----------|-------------|-------------|-----|
| 1 | `referral-personal` | any | 5% | BDT 5,000 |
| 2 | `referral-partner-individual` | standard | 15% | BDT 25,000 |
| 3 | `referral-partner-individual` | premium | 20% | BDT 50,000 |
| 4 | `referral-partner-institutional` | standard | 25% | BDT 100,000 |
| 5 | `referral-partner-institutional` | enterprise | 30% | BDT 200,000 |
| 6 | `promo-general` | any | 0% | 0 — promos give customer discount, not referrer commission |

**🆕 `SCCG CommissionLedger`** — **Append-only** transaction log (⚠️ RECOMMENDED: LEDGER BASED)

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Auto | |
| `LedgerEntryType` | Choice | `commission-posted`, `commission-adjustment`, `commission-reversed`, `payout-requested`, `payout-approved`, `payout-completed` |
| `RecipientId` | Text (100) | FK → UserAccounts |
| `RecipientName` | Text (255) | |
| `RecipientType` | Choice | `user`, `partner-individual`, `partner-institutional`, `expert` |
| `SalesOrderId` | Text (100) | |
| `OrderNumber` | Text (50) | |
| `PromoCodeId` | Text (100) | |
| `RuleId` | Text (100) | FK → CommissionRules |
| `Amount` | Number | Positive = credit, negative = debit |
| `Currency` | Choice | `BDT`, `EUR` |
| `RunningBalance` | Number | Balance after this entry |
| `Description` | Text (500) | |
| `RelatedEntryId` | Text (100) | For reversals, points to original entry |
| `CreatedAt` | DateTime | Immutable |
| `CreatedBy` | Text (100) | |

> ✅ **Recommendation: YES, use append-only ledger.** Never update/delete rows. Corrections are new rows with negative amounts. This gives you a complete audit trail, makes reconciliation trivial, and prevents data loss.

**🔄 `SCCG Payouts`** — (existing, add columns)

| New Column | Type | Description |
|------------|------|-------------|
| `LedgerEntryId` | Text (100) | FK → CommissionLedger entry that triggered payout |
| `PayoutMethod` | Choice | `bank-transfer`, `sccg-coin`, `manual` |
| `BankDetails` | Multi-line | Encrypted bank info (or reference) |
| `ProcessedBy` | Text (100) | Admin who processed |
| `ProcessedAt` | DateTime | |
| `ReversalReason` | Text (500) | If reversed |

#### Wallet Layer

**🆕 `SCCG CoinWallets`** — One per user

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Auto | |
| `UserId` | Text (100) | FK → UserAccounts.FirebaseUid (unique) |
| `UserName` | Text (255) | |
| `Balance` | Number | Current balance (denormalized) |
| `TotalEarned` | Number | Lifetime earned |
| `TotalSpent` | Number | Lifetime spent |
| `Status` | Choice | `active`, `frozen`, `closed` |
| `CreatedAt` | DateTime | |
| `UpdatedAt` | DateTime | |

**🆕 `SCCG CoinTransactions`** — **Append-only** wallet ledger

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Auto | |
| `WalletId` | Text (100) | FK → CoinWallets |
| `UserId` | Text (100) | FK → UserAccounts |
| `TransactionType` | Choice | `top-up`, `earn-commission`, `earn-referral`, `earn-refund`, `spend-purchase`, `spend-gift`, `adjustment-admin`, `expiry` |
| `Amount` | Number | Positive = credit, negative = debit |
| `RunningBalance` | Number | Balance after this entry |
| `ReferenceType` | Choice | `sales-order`, `payout`, `gift-card`, `admin`, `promo` |
| `ReferenceId` | Text (100) | FK to related entity |
| `Description` | Text (500) | |
| `ExpiresAt` | DateTime | Nullable — if this specific credit expires |
| `CreatedAt` | DateTime | Immutable |
| `CreatedBy` | Text (100) | |

> ✅ **Recommendation: YES, use append-only transaction history.** Wallet balance is computed by summing transactions (with denormalized balance on wallet for fast reads). Never edit or delete transactions. Admin adjustments are new entries.

> ✅ **Recommendation: SCCG Coin is a prepaid stored-value unit (not loyalty points).** This gives it clearer legal status, simpler accounting, and better UX than points. 1 SCCG Coin = 1 BDT.

**🆕 `SCCG GiftCards`** — Virtual gift cards

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Auto | |
| `CardNumber` | Text (20) | Unique, e.g. `SCCG-GC-4829-7163-5024` |
| `CardToken` | Text (64) | Hashed token for secure operations |
| `IssuedToUserId` | Text (100) | FK → UserAccounts |
| `IssuedToName` | Text (255) | |
| `IssuedToEmail` | Text (255) | |
| `IssuedByUserId` | Text (100) | Who purchased/issued it |
| `InitialBalance` | Number | BDT value at issuance |
| `CurrentBalance` | Number | Remaining balance |
| `Currency` | Choice | `BDT` |
| `Status` | Choice | `active`, `frozen`, `expired`, `depleted`, `cancelled` |
| `ActivatedAt` | DateTime | |
| `ExpiresAt` | DateTime | e.g. 12 months from activation |
| `LastUsedAt` | DateTime | |
| `QRCodeUrl` | Text (500) | QR code image link |
| `DesignTemplate` | Choice | `standard`, `premium`, `birthday`, `corporate` |
| `CreatedAt` | DateTime | |

**🆕 `SCCG GiftCardTransactions`** — Append-only

| Column | Type | Description |
|--------|------|-------------|
| `Id` | Auto | |
| `GiftCardId` | Text (100) | FK → GiftCards |
| `TransactionType` | Choice | `activation`, `purchase-usage`, `top-up`, `refund`, `admin-adjustment`, `expiry-debit` |
| `Amount` | Number | Positive = credit, negative = debit |
| `RunningBalance` | Number | |
| `SalesOrderId` | Text (100) | FK (if purchase-usage) |
| `Description` | Text (500) | |
| `CreatedAt` | DateTime | |
| `CreatedBy` | Text (100) | |

---

## F. SharePoint List vs. Dataverse Recommendation

| Entity | Recommendation | Rationale |
|--------|---------------|-----------|
| All current lists | **SharePoint Lists** | Already working, Graph API integrated, < 5000 items threshold |
| SCCG UserAccounts | **SharePoint List** | Low volume (hundreds, not thousands). Use indexed columns on `FirebaseUid` and `Email`. |
| SCCG UserRoles | **SharePoint List** | Small table, max ~3x users |
| SCCG PromoCodes | **SharePoint List** | Max few thousand codes. Index on `Code` column. |
| SCCG PromoCodeUsages | **SharePoint List** | Could grow large. Index on `PromoCodeId`. If > 5000 rows, migrate to Dataverse. |
| SCCG CommissionRules | **SharePoint List** | Very small, ~20 rules max |
| SCCG CommissionLedger | **⚠️ Watch closely** | Append-only, will grow. Start with SharePoint. If > 5000 entries/year, move to **Dataverse** or **Azure Table Storage**. |
| SCCG CoinWallets | **SharePoint List** | One per user. Small. |
| SCCG CoinTransactions | **⚠️ Watch closely** | Same as CommissionLedger. Start SP, migrate if needed. |
| SCCG GiftCards | **SharePoint List** | Low volume |
| SCCG GiftCardTransactions | **SharePoint List** | Moderate volume |

**When to move to Dataverse**: If any single list approaches 5,000 items (SharePoint list view threshold) OR you need cross-list joins beyond what Graph API OData supports efficiently (3+ joins).

---

## G. Promo Code and Referral Logic

### G.1 — Code Generation Rules

| Code Type | Generated When | Format | Expires | Max Uses |
|-----------|---------------|--------|---------|----------|
| Personal referral | User account creation | `SCCG-U-XXXXXX` | Never | Unlimited |
| Partner individual | Partner approval | `SCCG-PI-XXXXXX` | Never | Unlimited |
| Partner institutional | Partner approval | `SCCG-PP-XXXXXX` | Never | Unlimited |
| General promo | Admin creates campaign | `PROMO-XXXXXX` or custom | Configurable | Configurable |

### G.2 — Code Generation Algorithm

```
function generateCode(prefix: string, length: number = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I,O,0,1
  let code = prefix + "-";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  // Check uniqueness against SCCG PromoCodes list
  // If collision, regenerate
  return code;
}
```

### G.3 — QR Code and Shareable Link Generation

- **Shareable link**: `https://portal.sccg.com/shop?ref={CODE}`
- **QR Code**: Generate using `qrcode` npm library → store as data URI or upload to SharePoint document library → save URL in `QRCodeUrl` column
- **QR contains**: The shareable link URL
- **Generation trigger**: Power Automate flow on PromoCode creation, or server-side at code creation time

### G.4 — Code Validation Rules

When a user enters a code during Sales Offer creation:

```
1. Look up code in SCCG PromoCodes
2. IF not found → error "Invalid code"
3. IF status !== "active" → error "Code is not active"
4. IF validUntil < now → error "Code has expired"
5. IF maxUses > 0 AND currentUses >= maxUses → error "Code usage limit reached"
6. IF maxUsesPerUser > 0 → check PromoCodeUsages for this user → error if exceeded
7. IF minOrderAmount > subtotal → error "Minimum order amount not met"
8. IF applicableProducts not empty → check if cart products match
9. IF applicableCategories not empty → check if cart categories match
10. IF code.ownerId === currentUser.id → error "Cannot use your own referral code"
```

### G.5 — Anti-Abuse Controls

| Control | Rule |
|---------|------|
| Self-referral | Cannot use own code. `code.ownerId !== currentUserId` |
| Circular referral | Cannot use code of someone you referred. Check user creation referral chain. |
| Rate limiting | Max 1 code per offer. Max 3 offers/day per user. |
| Velocity check | If same code used > 10 times in 1 hour → auto-pause code, alert admin |
| IP-based | Log IP on usage. Flag if same IP uses different user accounts with same code |
| Order minimum | Enforce `minOrderAmount` to prevent penny-order abuse |
| Code sharing | Shareable links are fine (that's the point). But track referral chains. |

### G.6 — Attribution Flow

```
1. User enters code "SCCG-PI-7B2M4N" during Sales Offer creation
   → SalesOffer.PromoCodeId = code.id
   → SalesOffer.PromoCodeValue = "SCCG-PI-7B2M4N"  
   → SalesOffer.AttributedPartnerId = code.ownerId
   → SalesOffer.AttributedPartnerType = "individual"
   → CommissionRule matched → SalesOffer.CommissionPercent = 15%
   → SalesOffer.CommissionAmount = totalAmount * 0.15

2. Sales Offer → accepted → converted to Sales Order
   → All promo/commission fields copied to SalesOrder
   → PromoCodeUsage record created
   → CommissionLedger entry: type="commission-posted", amount=+commissionAmount
   → Referral record linked to order

3. Sales Order → completed
   → CommissionLedger: "commission-settled" (if no reversal period)
   → Payout becomes eligible

4. Refund/cancellation
   → CommissionLedger: "commission-reversed", amount = -commissionAmount
   → If already paid out → Payout marked for recovery
```

---

## H. Commission and Finance Logic

### H.1 — Commission Lifecycle

```
Sales Order Created
    │
    ▼
[commission-posted]         CommissionLedger +Amount, status=pending
    │
    ▼  (after order completion + cooling period of 7 days)
[commission-settled]        CommissionLedger confirms, Payout status=eligible
    │
    ▼  (admin approves payout batch)
[payout-approved]           Payout status=approved, CommissionLedger entry
    │
    ▼  (payment processed)
[payout-completed]          Payout status=paid, CommissionLedger entry
```

### H.2 — Cancellation / Refund Impact

| Scenario | Commission Impact |
|----------|-------------------|
| Offer rejected | No commission was posted. Nothing to reverse. |
| Order cancelled before completion | `commission-reversed` entry. Payout removed. |
| Order completed, then refund < 7 days | `commission-reversed` entry. Payout blocked. |
| Order completed, payout already approved | `commission-reversed` entry. Payout status → `recovery`. Recovery deducted from next payout or wallet. |
| Order completed, payout already paid | `commission-reversed` entry. Negative balance on ledger. Admin contacts recipient for recovery. |
| Partial refund | Proportional commission reversal. |

### H.3 — Accounting Entries

Every sales order with a commission generates these entries:

| # | Account | Debit (BDT) | Credit (BDT) | Description |
|---|---------|-------------|--------------|-------------|
| 1 | Revenue | | orderTotal | Sales revenue recognized |
| 2 | Commission Expense | commissionAmount | | Commission owed to partner/referrer |
| 3 | Commission Payable (liability) | | commissionAmount | Liability to pay partner |
| 4 | (On payout) Commission Payable | commissionAmount | | Liability cleared |
| 5 | (On payout) Cash/Bank | | commissionAmount | Cash paid out |

### H.4 — Real-Time Portal Display

**Partner Dashboard** shows:
- Pending commissions (posted but not settled)
- Available balance (settled, eligible for payout)
- Paid out (completed payouts)
- Total lifetime earned

All read from `CommissionLedger` filtered by `RecipientId`, grouped by `LedgerEntryType`.

---

## I. SCCG Coin Wallet Design

### I.1 — Nature of SCCG Coin

> ✅ **SCCG Coin = Internal Prepaid Stored Value**
> - 1 SCCG Coin = 1 BDT (fixed parity, no floating exchange)
> - Not a cryptocurrency or external currency
> - Not transferable between users (prevents money laundering risk)
> - Can be earned via commissions, referrals, or admin top-up
> - Can be spent on SCCG services in the shop
> - Can expire (configurable, recommend 12-month rolling expiry per batch)
> - Refunds credited back to SCCG Coin wallet

### I.2 — Wallet Operations

| Operation | Transaction Type | Amount | Source |
|-----------|-----------------|--------|--------|
| Admin top-up | `top-up` | +N | Admin manual or bank receipt |
| Commission payout to wallet | `earn-commission` | +N | CommissionLedger → CoinWallet |
| Referral bonus | `earn-referral` | +N | Auto on order completion |
| Purchase using coins | `spend-purchase` | -N | Checkout / Sales Order |
| Refund to wallet | `earn-refund` | +N | Order cancellation |
| Gift to another user | `spend-gift` | -N | Gift card issuance |
| Admin adjustment | `adjustment-admin` | ±N | Correction |
| Batch expiry | `expiry` | -N | Scheduled job (Power Automate) |

### I.3 — Balance Calculation

**Primary**: `CoinWallets.Balance` denormalized field (updated on every transaction)

**Verification**: `SELECT SUM(Amount) FROM CoinTransactions WHERE WalletId = X` must equal `CoinWallets.Balance`. Run reconciliation nightly via Power Automate.

### I.4 — Expiry Rules

- Each `earn-*` transaction can have an `ExpiresAt` (12 months from earn date)
- `spend-*` transactions consume oldest credits first (FIFO)
- Nightly Power Automate flow: find all `earn-*` transactions where `ExpiresAt < today` and remaining balance > 0 → create `expiry` transaction

### I.5 — Transfer Restrictions

| Rule | Reason |
|------|--------|
| No user-to-user transfer | Prevents money laundering, simplifies accounting |
| No cash-out | SCCG Coin can only be used for SCCG services |
| No external exchange | Not a real currency |
| Gift card issuance | The only way to "transfer" value — buy a gift card with coins |

---

## J. SCCG Gift Card Design

### J.1 — Card Concept

The SCCG Gift Card is a **virtual card** displayed in the portal UI. It is styled like a premium Visa/Mastercard but clearly branded as "SCCG Services Only". It shows:

- SCCG logo and branding
- Card number: `SCCG-GC-XXXX-XXXX-XXXX` (16 digits, grouped in 4)
- Cardholder name
- Balance in BDT
- Expiry date
- QR code (for in-person/event usage)
- Status indicator (active/frozen)

### J.2 — Card Number Generation

```
Format: SCCG-GC-XXXX-XXXX-XXXX
Where X = digit (0-9)
Example: SCCG-GC-4829-7163-5024

Security token: SHA-256 hash of cardNumber + salt (stored as CardToken)
```

### J.3 — Card Lifecycle

```
[issue]        → Status: active, InitialBalance set
    │
    ▼
[usage]        → CurrentBalance decremented via GiftCardTransaction
    │
    ▼
[depleted]     → CurrentBalance = 0, Status: depleted (auto)
    │
[freeze]       → Status: frozen (admin action, suspected fraud)
    │
[unfreeze]     → Status: active (admin action)
    │
[expire]       → Status: expired (Power Automate checks ExpiresAt)
    │
[reissue]      → New card created, remaining balance transferred, old card cancelled
```

### J.4 — Card Statuses

| Status | Description | Can Use | Can Top Up |
|--------|-------------|---------|------------|
| `active` | Normal operating state | ✅ | ✅ |
| `frozen` | Temporarily locked | ❌ | ❌ |
| `expired` | Past expiry date | ❌ | ❌ |
| `depleted` | Balance = 0 | ❌ | ✅ (reactivates) |
| `cancelled` | Permanently voided | ❌ | ❌ |

### J.5 — Usage at Checkout

During Sales Offer/Order creation:
1. User clicks "Pay with Gift Card"
2. Enters card number or scans QR
3. System validates: card exists, status=active, balance >= amount
4. Creates `GiftCardTransaction` (type=`purchase-usage`, negative amount)
5. Updates `GiftCards.CurrentBalance`
6. SalesOrder records `GiftCardId` and `GiftCardAmountUsed`

### J.6 — UI Modules

| Module | Location | Description |
|--------|----------|-------------|
| My Gift Cards | `/wallet/gift-cards` | List of owned gift cards with balance |
| Gift Card Detail | `/wallet/gift-cards/[id]` | Visual card, transaction history, freeze/unfreeze |
| Buy Gift Card | `/wallet/gift-cards/new` | Purchase with SCCG Coin or payment |
| Gift Card Visual | Component | The card UI itself — gradient background, logo, number, balance |
| Redeem at Checkout | Sales Offer form | Input field for gift card number |

---

## K. End-to-End Process Flows

### K.1 — Sales Offer to Settlement

```
Step 1: User browses Sales Shop
    │
    ▼
Step 2: Adds products to cart
    │
    ▼
Step 3: Selects/creates client
    │
    ▼
Step 4: Enters promo/referral code (optional)
    │   → Code validated against SCCG PromoCodes
    │   → Discount applied to line items
    │   → Commission rule matched
    │   → Attribution set (partner/referrer)
    │
    ▼
Step 5: Creates Sales Offer
    │   → SalesOffer created with all promo/commission fields
    │   → PromoCodeUsage record created
    │
    ▼
Step 6: Sends email to client (with Accept/Reject buttons)
    │   → EmailTracking record created
    │   → Token embedded in accept link
    │
    ▼
Step 7: Client clicks Accept
    │   → OfferAcceptanceLog created
    │   → SalesOffer status → "accepted"
    │   → Auto-convert to Sales Order
    │   → SalesOrder created (all fields copied)
    │   → CommissionLedger: "commission-posted"
    │
    ▼
Step 8: Payment
    │   option A: Client pays externally (bank transfer)
    │   option B: SCCG Coin used (CoinTransaction: "spend-purchase")
    │   option C: Gift Card used (GiftCardTransaction: "purchase-usage")
    │   option D: Mixed payment
    │
    ▼
Step 9: Order fulfillment
    │   → Service Tasks assigned to experts
    │   → Sessions scheduled
    │
    ▼
Step 10: Order completed
    │   → SalesOrder.Status → "completed"
    │   → 7-day cooling period starts
    │
    ▼
Step 11: Commission settlement (after cooling)
    │   → CommissionLedger: "commission-settled"
    │   → Payout.Status → "eligible"
    │
    ▼
Step 12: Payout approval (admin)
    │   → Payout.Status → "approved"
    │   → CommissionLedger: "payout-approved"
    │
    ▼
Step 13: Payout processing
    │   option A: Bank transfer → Payout.Status → "paid"
    │   option B: SCCG Coin credit → CoinTransaction: "earn-commission"
    │   → CommissionLedger: "payout-completed"
    │
    ▼
Step 14: DONE. All ledgers balanced.
```

### K.2 — User Registration to Multi-Role

```
Step 1: User registers via Firebase (picks primary role)
    │   → Firebase Auth account created
    │   → Firestore "users" profile created (status: pending/active)
    │   → SCCG UserAccounts record created
    │   → SCCG UserRoles record: primary role, status=active (or pending for expert/partner)
    │   → Personal referral code auto-generated in SCCG PromoCodes
    │   → SCCG CoinWallet created (balance: 0)
    │
    ▼
Step 2: (If expert) Admin approves
    │   → UserRoles entry: expert → status=active
    │   → Expert record in SCCG Experts
    │
    ▼
Step 3: (If customer wants partner access) User applies for Partner role
    │   → New UserRoles entry: partner-individual, status=pending
    │   → New Partners record with OnboardingStatus=application
    │
    ▼
Step 4: Admin approves partner application
    │   → UserRoles: partner-individual → status=active
    │   → Partners: OnboardingStatus=approved
    │   → Partner code auto-generated in SCCG PromoCodes
    │   → User now sees merged sidebar: Customer + Partner features
```

---

## L. Real-Time Reporting & Dashboard Recommendations

### L.1 — Admin Dashboard Additions

| Widget | Data Source | Description |
|--------|-----------|-------------|
| Commission Overview | CommissionLedger | Total posted / settled / paid this month |
| Promo Code Performance | PromoCodeUsages | Top codes by usage, revenue generated |
| Pending Approvals | UserRoles + Partners | Expert + partner applications pending |
| SCCG Coin Economy | CoinWallets + CoinTransactions | Total coins in circulation, earned/spent this month |
| Gift Card Issuance | GiftCards | Active cards, total outstanding balance |
| Revenue Breakdown | SalesOrders | By sale type (direct, referral, partner-individual, partner-institutional) |

### L.2 — Partner Dashboard Additions

| Widget | Data Source | Description |
|--------|-----------|-------------|
| My Referral Code | PromoCodes | Code, shareable link, QR code, copy button |
| Commission Summary | CommissionLedger | Pending / Available / Paid |
| SCCG Coin Balance | CoinWallets | Balance, recent transactions |
| Gift Cards | GiftCards | My gift cards with balances |
| Referral Stats | PromoCodeUsages | How many times my code was used, conversion rate |

### L.3 — Customer/Expert Dashboard Additions

| Widget | Data Source | Description |
|--------|-----------|-------------|
| My Referral Code | PromoCodes | Personal code + QR |
| SCCG Coin Balance | CoinWallets | Balance |
| Gift Cards | GiftCards | My cards |

---

## M. Implementation Roadmap

### Phase 1 — Multi-Role Foundation (Week 1-2)

| Task | Effort |
|------|--------|
| Create `SCCG UserAccounts` SharePoint list | 1 day |
| Create `SCCG UserRoles` SharePoint list | 1 day |
| Refactor `SessionUser` to support `roles: string[]` | 1 day |
| Refactor `auth.ts` to build multi-role session | 1 day |
| Refactor Sidebar to merge links from all active roles | 1 day |
| Update Partner table with `PartnerType`, `FirebaseUid` | 0.5 day |
| Update Customer/Expert tables with `FirebaseUid`, `PartnerProfileId` | 0.5 day |
| Create "Apply for Partner" flow in customer/expert portals | 1 day |
| Admin partner approval page | 1 day |
| Test multi-role login and navigation | 1 day |

### Phase 2 — Promo Codes & Referrals (Week 3-4)

| Task | Effort |
|------|--------|
| Create `SCCG PromoCodes` SharePoint list | 0.5 day |
| Create `SCCG PromoCodeUsages` SharePoint list | 0.5 day |
| Code generation logic (server action) | 1 day |
| QR code generation (npm qrcode) | 0.5 day |
| Auto-generate personal code on user registration | 0.5 day |
| Auto-generate partner code on partner approval | 0.5 day |
| Promo code entry field in Sales Offer creation form | 1 day |
| Code validation logic | 1 day |
| "My Referral Code" card component (with copy, share, QR) | 1 day |
| Admin promo campaign management page | 1 day |
| Attribution flow (code → offer → order) | 1 day |
| Anti-abuse checks | 0.5 day |

### Phase 3 — Commission Engine (Week 5-6)

| Task | Effort |
|------|--------|
| Create `SCCG CommissionRules` list + seed default rules | 0.5 day |
| Create `SCCG CommissionLedger` list | 0.5 day |
| Commission calculation on order conversion | 1 day |
| Commission settlement after cooling period (Power Automate) | 1 day |
| Payout request and approval flow | 1 day |
| Commission reversal on cancellation/refund | 1 day |
| Partner commission dashboard widgets | 1 day |
| Admin commission overview dashboard | 1 day |
| Admin payout batch approval page | 1 day |
| Reconciliation report | 0.5 day |

### Phase 4 — SCCG Coin Wallet (Week 7-8)

| Task | Effort |
|------|--------|
| Create `SCCG CoinWallets` list | 0.5 day |
| Create `SCCG CoinTransactions` list | 0.5 day |
| Auto-create wallet on user registration | 0.5 day |
| Top-up flow (admin) | 1 day |
| Commission → SCCG Coin payout option | 1 day |
| "Pay with SCCG Coin" at checkout | 1 day |
| Wallet UI page (balance, transaction history) | 1 day |
| Wallet widget on dashboard | 0.5 day |
| Expiry batch job (Power Automate) | 1 day |
| Balance reconciliation check | 0.5 day |

### Phase 5 — Gift Cards (Week 9-10)

| Task | Effort |
|------|--------|
| Create `SCCG GiftCards` list | 0.5 day |
| Create `SCCG GiftCardTransactions` list | 0.5 day |
| Gift card issuance logic + number generation | 1 day |
| Visual card component (React) | 2 days |
| Gift card purchase page | 1 day |
| Gift card detail page (transactions, freeze/unfreeze) | 1 day |
| "Pay with Gift Card" at checkout | 1 day |
| Gift card QR code generation | 0.5 day |
| Expiry/depletion automation (Power Automate) | 0.5 day |

### Phase 6 — Integration & Polish (Week 11-12)

| Task | Effort |
|------|--------|
| Sales Offer form: unified payment method selector | 1 day |
| Mixed payment support (cash + coin + gift card) | 1 day |
| Full end-to-end testing | 2 days |
| Admin reporting dashboards | 2 days |
| Power Automate flows for all automations | 2 days |
| Security audit (code validation, wallet ops, ledger integrity) | 1 day |
| Performance testing (list view thresholds) | 1 day |

**Total estimated: ~60 dev-days (12 weeks at ~5 working days/week)**

---

## N. Risks, Edge Cases, and Controls

| # | Risk | Mitigation |
|---|------|-----------|
| 1 | **SharePoint 5000-item threshold** on CommissionLedger/CoinTransactions | Index key columns. Archive old entries quarterly. Monitor counts. Plan Dataverse migration path. |
| 2 | **Race condition on wallet balance** | Use optimistic concurrency (SharePoint ETags). If conflict, retry. For high-traffic, add queue via Power Automate. |
| 3 | **Double-spend on gift card** | Check balance atomically before deducting. Use `IF-MATCH` ETag on SharePoint PATCH. |
| 4 | **Commission on cancelled order already paid** | Recovery mechanism: negative ledger entry + flag on next payout. Admin notification. |
| 5 | **Promo code abuse (self-referral)** | Code validation prevents `ownerId === currentUser`. Log all attempts. |
| 6 | **User loses access on role revocation** | Soft-delete (status=revoked). User keeps login but loses sidebar features. Data preserved. |
| 7 | **Circular referral chains** | Track first-referrer. Block code usage if referrer was referred by the same user. |
| 8 | **SCCG Coin legal risk** | Frame as "prepaid service credits" not "currency". Include T&C that coins have no cash value. Non-transferable. Non-refundable for cash. |
| 9 | **Gift card fraud (guessable numbers)** | 16-digit random number + separate CardToken for operations. Never expose token in URL. |
| 10 | **Multi-role session JWT size** | Store only role codes in JWT. Roles array won't exceed 5 items. Minimal overhead. |

---

## O. Sample User Stories and Acceptance Criteria

### US-001: Multi-Role Login
**As** an Expert who is also a Partner, **I want** to see both Expert and Partner navigation items after login, **so that** I can manage sessions AND create sales offers from one account.

**Acceptance Criteria:**
- [ ] Login returns all active roles in session
- [ ] Sidebar shows merged navigation groups
- [ ] Expert-specific pages accessible
- [ ] Partner-specific pages (Sales Shop, Offers, Orders) accessible
- [ ] Dashboard shows combined widgets

### US-002: Apply for Partner Role
**As** a Customer, **I want** to apply for Individual Partner access, **so that** I can start earning referral commissions.

**Acceptance Criteria:**
- [ ] "Become a Partner" button visible on Customer dashboard
- [ ] Application form collects partner-specific fields
- [ ] UserRoles entry created with status=pending
- [ ] Admin notification sent
- [ ] After approval, Customer sees partner navigation items
- [ ] Partner referral code auto-generated

### US-003: Share Referral Code
**As** a Partner, **I want** to view and share my referral code with a QR code and link, **so that** I can drive sales without manual coordination.

**Acceptance Criteria:**
- [ ] "My Referral Code" card on dashboard
- [ ] Code displayed prominently
- [ ] "Copy Code" button copies to clipboard
- [ ] "Copy Link" button copies shareable URL
- [ ] QR code image displayed and downloadable
- [ ] Social share buttons (WhatsApp, email)

### US-004: Apply Promo Code to Offer
**As** a Partner creating a Sales Offer, **I want** to enter a promo/referral code, **so that** the client gets a discount and the code owner gets commission.

**Acceptance Criteria:**
- [ ] Promo code input field on Sales Offer creation form
- [ ] "Apply" button validates code in real-time
- [ ] Success: shows discount amount and attribution
- [ ] Error: shows specific error message
- [ ] Cannot use own referral code
- [ ] Commission fields auto-populated on offer

### US-005: Pay with SCCG Coin
**As** a Customer, **I want** to use my SCCG Coin balance to pay for services, **so that** I can redeem my earned credits.

**Acceptance Criteria:**
- [ ] "Pay with SCCG Coin" option at checkout
- [ ] Shows current balance
- [ ] User enters amount (up to balance and order total)
- [ ] Remaining amount shown for other payment
- [ ] CoinTransaction created on order confirmation
- [ ] Wallet balance updated immediately
- [ ] Order records SCCG Coin amount used

### US-006: Issue Gift Card
**As** an Admin, **I want** to issue an SCCG Gift Card to a user, **so that** they receive a virtual card with a preset balance.

**Acceptance Criteria:**
- [ ] Admin gift card issuance form
- [ ] Card number auto-generated (SCCG-GC-XXXX-XXXX-XXXX)
- [ ] Recipient receives notification
- [ ] Card appears in recipient's "My Gift Cards"
- [ ] Visual card displays balance, number, expiry
- [ ] QR code generated

---

## P. Suggested Power Platform Implementation Approach

Since the portal is built with **Next.js + SharePoint Graph API**, the Power Platform integration is best used for:

| Component | Use Power Platform For | Use Next.js For |
|-----------|----------------------|-----------------|
| Data storage | SharePoint Lists | N/A |
| Workflow automation | **Power Automate** cloud flows | N/A |
| Scheduled jobs | **Power Automate** scheduled flows | N/A |
| UI / Portal | N/A | **Next.js** (already built) |
| API layer | N/A | **Next.js API routes + Graph API** |
| Notifications | **Power Automate** email flows | In-app notifications |
| Admin approvals | Next.js UI + server actions | Power Automate for email alerts |
| Reporting | Next.js dashboards | Power BI if needed for exec reports |

**Do NOT use Power Pages** — you already have a superior Next.js frontend. Power Pages would be a parallel portal that creates maintenance burden.

**Do NOT use Power Apps** for this portal — it would conflict with your existing React-based UI.

---

## Q. Suggested Power Automate Flows

| # | Flow | Trigger | Actions |
|---|------|---------|---------|
| 1 | **Expert Approval Notification** | UserRoles item created (role=expert, status=pending) | Send approval email to admin. On approve → update status, create Expert record, generate codes. |
| 2 | **Partner Approval Notification** | UserRoles item created (role=partner-*, status=pending) | Send approval email to admin. On approve → update status, generate partner code + QR. |
| 3 | **Commission Settlement** | Scheduled: daily at 2 AM | Find SalesOrders completed > 7 days ago with CommissionStatus=pending → create settlement ledger entries. |
| 4 | **SCCG Coin Expiry** | Scheduled: daily at 3 AM | Find CoinTransactions where type=earn-* and ExpiresAt < today → create expiry debit transactions, update wallet balance. |
| 5 | **Gift Card Expiry** | Scheduled: daily at 3 AM | Find GiftCards where ExpiresAt < today and status=active → set status=expired, create expiry debit transaction. |
| 6 | **Payout Batch Processing** | Scheduled: weekly (or admin trigger) | Find Payouts with status=approved → process payments → update status to paid, create ledger entries. |
| 7 | **Promo Code Velocity Alert** | PromoCodeUsages item created | Count uses of same code in last 1 hour. If > threshold → pause code, email admin. |
| 8 | **Wallet Balance Reconciliation** | Scheduled: nightly | For each wallet, sum transactions vs. stored balance. If mismatch → alert admin. |
| 9 | **Welcome Flow** | UserAccounts item created | Send welcome email, generate personal referral code, create wallet. |
| 10 | **Order Completion → Commission Post** | SalesOrders item modified (status = completed) | Calculate commission, create CommissionLedger entry, notify partner/referrer. |

---

## R. Suggested Portal UI Modules / Pages / Components

### R.1 — New Pages

| Page | Route | Access | Description |
|------|-------|--------|-------------|
| My Roles | `/profile/roles` | All | View current roles, apply for new role |
| Apply for Partner | `/partner/apply` | Customer/Expert | Partner application form |
| Partner Onboarding | `/partner/onboarding` | Pending partners | Status tracker |
| My Referral Code | `/referrals` | All | Code display, share tools, QR, stats |
| Admin: Promo Campaigns | `/admin/promos` | Admin | Create/manage promo codes |
| Admin: Commission Rules | `/admin/commission-rules` | Admin | CRUD for commission rules |
| Admin: Commission Ledger | `/admin/commissions` | Admin | Full ledger view, filters, export |
| Admin: Payout Approval | `/admin/payouts` | Admin | Batch approve/reject payouts |
| SCCG Wallet | `/wallet` | All | Balance, transaction history, top-up |
| My Gift Cards | `/wallet/gift-cards` | All | List of gift cards |
| Gift Card Detail | `/wallet/gift-cards/[id]` | All | Visual card, transactions |
| Buy Gift Card | `/wallet/gift-cards/new` | All | Purchase form |
| Admin: Gift Cards | `/admin/gift-cards` | Admin | Issue, freeze, manage all cards |
| Admin: Wallet Overview | `/admin/wallets` | Admin | All wallets, suspicious activity |

### R.2 — New Components

| Component | Description |
|-----------|-------------|
| `RoleBadges` | Shows colored badges for each active role on profile/header |
| `PromoCodeCard` | Displays code, copy button, share link, QR code |
| `PromoCodeInput` | Input field with "Apply" button for Sales Offer form |
| `CommissionSummaryCard` | Shows pending/available/paid commission totals |
| `WalletBalanceCard` | Shows SCCG Coin balance with animation |
| `GiftCardVisual` | The visual credit card component (gradient, number, name, balance, expiry) |
| `GiftCardMini` | Compact card for list views |
| `TransactionList` | Reusable component for wallet/gift card/commission transaction history |
| `PaymentMethodSelector` | Radio/toggle selector: Cash, SCCG Coin, Gift Card, Mixed |
| `CommissionLedgerTable` | Filterable, sortable table of ledger entries |
| `MergedSidebar` | New sidebar logic that unions links from all active roles |
| `RoleApplyButton` | "Become a Partner" CTA button |
| `QRCodeDisplay` | Shows QR code image with download button |

### R.3 — Updated Components

| Component | Changes |
|-----------|---------|
| `Sidebar.tsx` | Replace binary `admin/partner` check with multi-role link merging |
| `Header.tsx` | Show `RoleBadges` next to user name |
| `Sales Offer Form` | Add `PromoCodeInput`, `PaymentMethodSelector`, commission preview |
| `Sales Order Detail` | Show commission status, attributed partner, promo code used |
| `Dashboard (all)` | Add `WalletBalanceCard`, `PromoCodeCard`, `CommissionSummaryCard` |
| `Admin Dashboard` | Add commission overview, wallet economy, pending approvals count |

---

## Summary of Key Architectural Decisions

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| Multi-role storage | Junction table (`UserRoles`) | Single-role field cannot support combinations |
| Session model | `roles: string[]` array in JWT | Sidebar and permissions need all roles |
| Partner types | `PartnerType` on Partner record | Avoids separate tables for same entity |
| Commission engine | **Ledger-based, append-only** | Auditable, reversible, reconcilable |
| Wallet model | **Ledger-based, append-only** | Same benefits; balance denormalized for reads |
| SCCG Coin nature | **Prepaid stored value** (1:1 BDT) | Simplest, lowest legal risk |
| Gift card | **Virtual-only, internal** | No external payment integration needed |
| Code format | Prefix-based with collision check | Human-readable, type-identifiable, unique |
| QR generation | `qrcode` npm package, server-side | Fast, no external API needed |
| Storage | **SharePoint Lists** (all entities) | Already integrated, stay consistent. Monitor for 5k threshold. |
| Automation | **Power Automate** | Scheduled jobs, notifications, batch processing |
| UI | **Next.js** (existing) | Already built and working; do not introduce Power Pages |

---

*Document generated for SCCG Partner Portal v2.0 architecture planning. All table schemas, field types, and status flows are implementation-ready for SharePoint List creation and Next.js TypeScript interfaces.*
