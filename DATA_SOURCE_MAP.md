# SCCG Partner Portal: Feature-to-Data-Source Mapping

This document maps each major tab or feature in the SCCG Partner Portal to its primary data source(s) for future reference and troubleshooting.

| Tab / Feature                | Data Source(s)                                                                                 |
|------------------------------|----------------------------------------------------------------------------------------------|
| Dashboard (Admin/Customer)   | SharePoint: Activities, Orders, Financials, Products, Clients, Experts, Invoices, Promotions  |
| Notifications                | SharePoint: AppNotifications, Firestore: notifications-bus, Power Automate                   |
| Clients                      | SharePoint: Clients, Orders, Invoices, Financials                                            |
| Orders                       | SharePoint: Orders, SalesOrderItems, Products, Clients, Invoices                             |
| Products (Marketplace/Shop)  | SharePoint: Products, Promotions, Firestore: sccgCards                                       |
| Financials                   | SharePoint: Financials, Invoices, Installments, Payouts, CoinWallets, GiftCards              |
| Referrals                    | SharePoint: Referrals, Promotions, Clients                                                   |
| Commissions                  | SharePoint: Financials, Orders, Invoices, Promotions                                         |
| Wallets                      | SharePoint: CoinWallets, GiftCards, Payouts, Firestore: payments                             |
| Profile (Customer/Expert)    | SharePoint: UserProfiles, UserRoles, CareerProfiles, Firestore: users                        |
| Admin Data Sources Viewer    | SharePoint: All lists above, Firestore: all collections above                                |
| Admin Tasks (Smart Tasks)    | SharePoint: KanbanTasks, ServiceTasks, computed from business logic                          |
| Certificates                 | SharePoint: SchoolCertificates, Firestore: school* collections                               |
| Sessions (Expert/Customer)   | SharePoint: Sessions, CustomerPackages, Customers, Experts, ServiceTasks                     |
| Packages (Customer)          | SharePoint: ServicePackages, CustomerPackages, Products, Promotions, Orders                  |
| Payments (Customer/Expert)   | SharePoint: ExpertPayments, Financials, Invoices, Installments, Firestore: payments          |
| Customers (Admin)            | SharePoint: Customers, CustomerPackages, Sessions                                            |
| Audit Log (Admin)            | Firestore: auditLogs, SharePoint: Activities                                                 |
| Login/Auth                   | Firebase Auth, Firestore: users, SharePoint: UserProfiles                                    |
| Exchange Rates               | exchangerate.host API, SharePoint: Currency                                                  |
| Promotions                   | SharePoint: Promotions, Products, Clients                                                    |
| Kanban Tasks                 | SharePoint: KanbanTasks, ServiceTasks                                                        |
| School (Customer)            | SharePoint: SchoolCertificates, CareerProfiles, Firestore: school* collections               |

**Legend:**
- **SharePoint:** Refers to Microsoft SharePoint Online lists accessed via Graph API.
- **Firestore:** Refers to Google Firestore collections.
- **Power Automate:** Refers to flows that may write to SharePoint or trigger notifications.
- **API:** External service (e.g., exchangerate.host).

_Last updated: 2026-05-01_

## SharePoint List Inventory

All lists provisioned by `npm run sp:setup-all` (and companion scripts):

**Core CRM / Commerce:** Partners, Clients, Orders, Activities, Products
**Financials:** Financials, Installments, Transactions, Expenses, Invoices
**Sales workflow:** SalesOffers, SalesOfferItems, SalesOrders, SalesOrderItems, ServiceTasks, Promotions
**Referrals / Payouts:** Referrals, Payouts, CommissionRules, CommissionLedger
**Promo codes:** PromoCodes, PromoCodeUsages
**Wallet / Cards:** CoinWallets, CoinTransactions, GiftCards, GiftCardTransactions
**Identity:** UserProfiles, UserRoles
**Notifications / Email:** AppNotifications, EmailTracking, OfferAcceptanceLog
**AI / Career:** CareerProfiles
**Customer / Expert / Sessions:** Customers, Experts, ServicePackages, CustomerPackages, Sessions, ExpertPayments
**School:** SchoolCertificates
**Tasks:** KanbanTasks
