# Domain Deployment Guide — Oracle VPS

This guide explains how to point `portal.mysccg.de` (Strato-managed domain)
at our **self-hosted Oracle Cloud VPS** (Docker + Caddy reverse proxy).

> The portal is **no longer hosted on Vercel**. It runs on our own VPS at
> `158.180.45.36`, fronted by Caddy with automatic Let's Encrypt SSL.

---

## 1. VPS Facts

| Item            | Value                       |
| --------------- | --------------------------- |
| Provider        | Oracle Cloud Infrastructure |
| Public IPv4     | `158.180.45.36`             |
| OS              | Ubuntu 24.04                |
| SSH user        | `ubuntu`                    |
| App path        | `~/partner-portal`          |
| Reverse proxy   | Caddy 2 (Docker)            |
| App container   | `portal` (Next.js standalone, port 3000) |
| Domain          | `portal.mysccg.de`          |

---

## 2. Strato DNS — Switch From Vercel to Oracle VPS

The current `portal` subdomain still has a **CNAME to Vercel**. Replace it
with an **A record** to the Oracle VPS public IP.

### A. Open DNS settings
1. Log in to your **Strato Customer Center**.
2. Navigate to **Domainverwaltung** → click `mysccg.de`.
3. Under the subdomain list, select the **`portal`** subdomain.
4. Click **DNS-Einstellungen**.

### B. Remove the Vercel CNAME
1. Find the existing **CNAME-Record** pointing to a `*.vercel-dns*.com`
   target (currently `9be0d50182e1b901.vercel-dns-017.com.`).
2. **Delete it** (or set CNAME field back to default/empty).

### C. Add the A record
1. In the **A-Record** field for `portal`, enter:
   ```
   158.180.45.36
   ```
2. Leave **AAAA-Record** empty unless you also want IPv6.
3. Save the changes.

### D. Wait for propagation
```bash
dig +short portal.mysccg.de A
# Expected: 158.180.45.36
```

> **Tip:** Caddy will automatically request a Let's Encrypt certificate the
> first time DNS resolves to the VPS and ports 80/443 are reachable.

---

## 3. Oracle Cloud — Networking

Ensure these ingress rules exist on the VPS subnet's Security List
(and that `ufw`/`iptables` on the VM are open):

| Protocol | Port | Source     |
| -------- | ---- | ---------- |
| TCP      | 22   | your IP    |
| TCP      | 80   | 0.0.0.0/0  |
| TCP      | 443  | 0.0.0.0/0  |

Without ports 80/443 open globally, Caddy cannot complete the ACME HTTP-01
challenge and SSL will fail.

---

## 4. Environment Variables

Server-side env vars live in `.env.production` on the VPS, mounted into the
`portal` container by `docker-compose.yml`. Required minimum:

```env
NEXTAUTH_URL="https://portal.mysccg.de"
NEXT_PUBLIC_APP_URL="https://portal.mysccg.de"
NEXTAUTH_SECRET="…"
# Plus Firebase Admin, Microsoft Graph / SharePoint, Azure AD, etc.
```

This file is synced from the local repo by `deploy_to_vps.sh` — never commit it.

---

## 5. Build & Deploy (local → VPS)

The recommended workflow is **build locally, ship the standalone bundle**:

```bash
# 1. Build the Next.js standalone artifact
npm ci
npm run build

# 2. Sync artifacts + Docker config + env, then restart containers on VPS
./deploy_to_vps.sh
```

`deploy_to_vps.sh` does:
1. `rsync` `.next/standalone/` → VPS `~/partner-portal/`
2. `rsync` `.next/static/` and `public/` → VPS
3. `rsync` `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.env.production`
4. SSH in and run `sudo docker compose up -d --build`

After it finishes:
```bash
ssh -i ./ssh-key-2026-05-02.key ubuntu@158.180.45.36 \
  "cd ~/partner-portal && sudo docker compose ps && sudo docker compose logs --tail=80 portal"
```

---

## 6. Verify

```bash
dig +short portal.mysccg.de A          # → 158.180.45.36
curl -sI http://portal.mysccg.de  | head -3
curl -sI https://portal.mysccg.de | head -5
# Expect HTTP/2 200 (or 307 to /login). The `server:` header must NOT be `Vercel`.
```

If `server: Vercel` still appears, DNS has not yet cut over — wait or flush
your local resolver.

---

## 7. Rollback

To temporarily revert to Vercel (e.g., during an outage):
1. In Strato DNS, remove the A record for `portal`.
2. Re-add CNAME `9be0d50182e1b901.vercel-dns-017.com.` (with trailing dot).
3. The Vercel project at `vercel.com/sccg/partner-portal` already has the
   domain bound and will serve traffic again once DNS propagates.
