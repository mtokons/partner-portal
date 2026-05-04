# SCCG Partner Portal: Architecture V3 (Oracle Deployment)

## 1. Overview
This document outlines the production architecture for the SCCG Partner Portal, optimized for migration from Vercel to **Oracle Cloud Always Free** infrastructure. This shift ensures stable, long-running connections to SharePoint and provides the foundation for native mobile apps.

## 2. Infrastructure Layer
- **Hosting:** Oracle Cloud VPS (`VM.Standard.E2.1.Micro`) in Frankfurt.
- **OS:** Ubuntu 22.04 LTS.
- **Memory Optimization:** 2GB Swap file configured to support Next.js builds on 1GB physical RAM.
- **Runtime:** Docker & Docker Compose (Containerized isolation).
- **Network:** Port 3000 (Internal) -> Port 80/443 (External via Reverse Proxy).

## 3. Application Layer
- **Framework:** Next.js 14+ (App Router).
- **Deployment Mode:** Standalone Output (Minimal Node.js server bundle).
- **State Management:** React Server Components (RSC) + Server Actions.
- **Auth:** Auth.js (NextAuth) integrated with Firebase Admin SDK.

## 4. Data Layer
- **Source of Truth:** Microsoft SharePoint (Graph API).
- **Identity Provider:** Firebase Authentication.
- **File Storage:** Firebase Storage (for static assets and PDFs).
- **Integration Registry:** `src/lib/sharepoint.ts` (Maps portal features to SP List IDs).

## 5. Mobile Integration Strategy
- **Framework:** Capacitor.
- **Mechanism:** Native binary wrapper around the Next.js production URL.
- **Deployment:** iOS (App Store) and Android (Play Store) using the same codebase.

## 6. Key Benefits of V3
1. **Stability:** No 10-second execution limit (eliminates SharePoint sync failures).
2. **Persistence:** Always-on background tasks and live notifications.
3. **Cost:** $0.00 infrastructure cost via Oracle Always Free.
4. **Control:** Full ownership of the server environment and caching layers.

---
*Created on: 2026-05-02*
