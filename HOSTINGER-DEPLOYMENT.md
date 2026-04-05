# Hostinger Deployment Guide — Partner Portal

> Complete step-by-step guide to deploy this Next.js 16 application on a Hostinger subdomain.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Hostinger Plan Evaluation](#2-hostinger-plan-evaluation)
3. [Pre-Deployment Checklist](#3-pre-deployment-checklist)
4. [Local Development Setup](#4-local-development-setup)
5. [Subdomain Configuration](#5-subdomain-configuration)
6. [Deployment Option A: Hostinger VPS](#6-deployment-option-a-hostinger-vps)
7. [Deployment Option B: Static Export + API Routes](#7-deployment-option-b-static-export--api-routes)
8. [Deployment Option C: Vercel/Cloudflare (Recommended)](#8-deployment-option-c-vercelcloudflare-recommended)
9. [Environment Variables](#9-environment-variables)
10. [Connect Backend to SharePoint](#10-connect-backend-to-sharepoint)
11. [Connect Backend to Firebase](#11-connect-backend-to-firebase)
12. [DNS Configuration](#12-dns-configuration)
13. [SSL/HTTPS Setup](#13-sslhttps-setup)
14. [Monitoring & Maintenance](#14-monitoring--maintenance)
15. [Power Automate Email Flow Setup](#15-power-automate-email-flow-setup)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                    Client Browser                     │
└──────────────┬───────────────────────────────────────┘
               │ HTTPS
┌──────────────▼───────────────────────────────────────┐
│          Hostinger Subdomain (or VPS)                 │
│          portal.yourdomain.com                        │
│   ┌─────────────────────────────────────────────┐    │
│   │         Next.js 16 Application              │    │
│   │   ┌──────────┐  ┌──────────────────┐        │    │
│   │   │  Pages   │  │   API Routes     │        │    │
│   │   │  (SSR)   │  │  /api/clients    │        │    │
│   │   └──────────┘  │  /api/currency   │        │    │
│   │                  │  /api/invoice-pdf│        │    │
│   │                  └────────┬─────────┘        │    │
│   └───────────────────────────┼──────────────────┘    │
└───────────────────────────────┼──────────────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                     │
  ┌────────▼───────┐  ┌────────▼──────┐  ┌──────────▼─────┐
  │  SharePoint    │  │   Firebase    │  │ Power Automate │
  │  Lists (Graph  │  │   Auth +      │  │ (Email Flows)  │
  │  API)          │  │   Firestore   │  │                │
  │  PRIMARY DB    │  │   FALLBACK    │  │                │
  └────────────────┘  └───────────────┘  └────────────────┘
```

---

## 2. Hostinger Plan Evaluation

### Database Availability

| Hostinger Plan     | MySQL DB | Node.js Support | SSH  | Recommendation                          |
|--------------------|----------|-----------------|------|-----------------------------------------|
| **Single/Premium** | Yes      | No              | No   | ❌ Cannot run Next.js server            |
| **Business**       | Yes      | No              | Yes  | ⚠️ Limited — static export only         |
| **Cloud/VPS**      | Yes      | Yes             | Yes  | ✅ Full Node.js — can run Next.js       |

### Verdict

- **Shared Hosting** (Single/Premium/Business): Cannot run a Node.js server. You'd need to:
  - Deploy on Vercel/Cloudflare and point DNS from Hostinger, OR
  - Use `next export` (static) with API routes moved to serverless functions elsewhere

- **VPS Hosting**: Full control. Install Node.js, run `next start`.

- **Recommended**: Deploy on **Vercel** (free tier) or **Cloudflare Pages** and use Hostinger only for DNS management. This is the most reliable and cost-effective approach.

---

## 3. Pre-Deployment Checklist

```bash
# 1. Ensure you have all dependencies installed
npm install

# 2. Check for lint/type errors
npm run lint
npx tsc --noEmit

# 3. Test the build locally
npm run build

# 4. Test production mode locally
npm start
# Visit http://localhost:3000

# 5. Ensure .env.local is properly configured (see Section 9)
```

---

## 4. Local Development Setup

### Step 1: Clone and install

```bash
git clone <your-repo-url> partner-portal
cd partner-portal
npm install
```

### Step 2: Create `.env.local`

```env
# ============================================
# Authentication
# ============================================
AUTH_SECRET=your-random-secret-here-min-32-chars
NEXTAUTH_URL=http://localhost:3000

# ============================================
# SharePoint / Microsoft Graph
# ============================================
AZURE_AD_CLIENT_ID=your-azure-app-client-id
AZURE_AD_TENANT_ID=your-azure-tenant-id
AZURE_AD_CLIENT_SECRET=your-azure-app-secret
SHAREPOINT_SITE_URL=https://yourorg.sharepoint.com/sites/YourSite

# ============================================
# Mock Data (set to "true" for local dev without SharePoint)
# ============================================
USE_MOCK_DATA=true

# ============================================
# Firebase (optional fallback)
# ============================================
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# ============================================
# Power Automate Webhooks
# ============================================
PA_WEBHOOK_ORDER_PLACED=
PA_WEBHOOK_PAYMENT_CONFIRMED=
PA_WEBHOOK_INSTALLMENT_DUE=
PA_WEBHOOK_PAYMENT_OVERDUE=
PA_WEBHOOK_SEND_CLIENT_EMAIL=
PA_WEBHOOK_SESSION_REMINDER=
PA_WEBHOOK_INVOICE_CREATED=

# ============================================
# Currency API
# ============================================
EXCHANGE_RATE_API_KEY=your-exchangerate-api-key
```

### Step 3: Run locally

```bash
# Development mode (hot reload)
npm run dev

# Production mode
npm run build && npm start
```

### Step 4: Test CRUD operations

1. Navigate to http://localhost:3000/login
2. Login with mock credentials:
   - **Admin**: `admin@portal.com` / `admin123`
   - **Partner**: `alice@partner.com` / `password123`
   - **Customer**: `maria@customer.com` / `customer123`
   - **Expert**: `andreas@expert.com` / `expert123`
3. Test all CRUD operations (create client, place order, etc.)

---

## 5. Subdomain Configuration

### In Hostinger hPanel:

1. Go to **Domains** > **Subdomains**
2. Create subdomain: `portal.yourdomain.com`
3. Note the IP address or CNAME target

### If pointing to external service (Vercel):

1. Go to **DNS Zone Editor** in hPanel
2. Add a **CNAME** record:
   - **Name**: `portal`
   - **Target**: `cname.vercel-dns.com` (or your Vercel project domain)
   - **TTL**: 3600
3. In Vercel Dashboard: **Settings** > **Domains** > Add `portal.yourdomain.com`

---

## 6. Deployment Option A: Hostinger VPS

Best for: Full control, custom server

### Step 1: SSH into VPS

```bash
ssh root@your-vps-ip
```

### Step 2: Install Node.js (v20+)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v  # Should be v20+
```

### Step 3: Install PM2 (process manager)

```bash
npm install -g pm2
```

### Step 4: Clone & build

```bash
cd /var/www
git clone <your-repo-url> partner-portal
cd partner-portal
npm install --production
npm run build
```

### Step 5: Set environment variables

```bash
cp .env.local.example .env.local
nano .env.local
# Fill in all values (see Section 9)
```

### Step 6: Start with PM2

```bash
pm2 start npm --name "partner-portal" -- start
pm2 startup  # Auto-start on reboot
pm2 save
```

### Step 7: Configure Nginx reverse proxy

```nginx
# /etc/nginx/sites-available/portal.yourdomain.com
server {
    listen 80;
    server_name portal.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/portal.yourdomain.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

### Step 8: SSL with Certbot

```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d portal.yourdomain.com
```

---

## 7. Deployment Option B: Static Export + API Routes

**Not recommended for this app** — it uses server-side rendering (SSR), server actions, and server-only packages like `bcryptjs` and `@azure/msal-node`. A static export would break most functionality.

If you must use shared hosting:
- Move all API logic to serverless functions on Vercel/Netlify
- Use `next export` for the frontend only
- This requires significant refactoring

---

## 8. Deployment Option C: Vercel/Cloudflare (Recommended)

### Vercel (Easiest)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) > Import project
3. Select your GitHub repo
4. Add all environment variables from `.env.local`
5. Click Deploy
6. Add custom domain: `portal.yourdomain.com`
7. In Hostinger DNS: add CNAME record pointing to Vercel

### Cloudflare Pages

1. Push code to GitHub
2. Go to Cloudflare Dashboard > Pages > Create project
3. Connect GitHub repo
4. Build settings:
   - Framework: Next.js
   - Build command: `npm run build`
   - Output: `.next`
5. Add environment variables
6. Deploy
7. Add custom domain in Cloudflare

---

## 9. Environment Variables

### Required for Production

| Variable                          | Description                              | Required |
|-----------------------------------|------------------------------------------|----------|
| `AUTH_SECRET`                     | NextAuth secret (min 32 chars)           | ✅       |
| `NEXTAUTH_URL`                    | Full URL: `https://portal.yourdomain.com`| ✅       |
| `AZURE_AD_CLIENT_ID`             | Azure AD app client ID                   | ✅       |
| `AZURE_AD_TENANT_ID`             | Azure AD tenant ID                       | ✅       |
| `AZURE_AD_CLIENT_SECRET`         | Azure AD app secret                      | ✅       |
| `SHAREPOINT_SITE_URL`            | SharePoint site URL                      | ✅       |
| `USE_MOCK_DATA`                   | `true` for demo, `false` for production  | ✅       |
| `NEXT_PUBLIC_FIREBASE_API_KEY`    | Firebase API key                         | Optional |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID                      | Optional |
| `PA_WEBHOOK_SEND_CLIENT_EMAIL`    | Power Automate webhook URL               | Optional |

---

## 10. Connect Backend to SharePoint

### Step 1: Register Azure AD App

1. Go to [Azure Portal](https://portal.azure.com) > **Azure Active Directory** > **App registrations**
2. Click **New registration**
   - Name: `Partner Portal`
   - Supported account types: **Single tenant**
   - Redirect URI: leave blank (we use client credentials)
3. Note the **Application (client) ID** and **Directory (tenant) ID**

### Step 2: Create Client Secret

1. In your app > **Certificates & secrets** > **New client secret**
2. Description: `partner-portal-prod`, Expiry: 24 months
3. Copy the **Value** immediately — you cannot see it again

### Step 3: Grant API Permissions

1. In your app > **API permissions** > **Add a permission**
2. Select **Microsoft Graph** > **Application permissions**
3. Add:
   - `Sites.ReadWrite.All`
   - `Sites.Manage.All` (optional, for creating lists)
4. Click **Grant admin consent for [your org]**

### Step 4: Create SharePoint Lists

Create these lists in your SharePoint site:

| List Name        | Key Columns                                              |
|------------------|----------------------------------------------------------|
| Partners         | Name, Email, PasswordHash, Role, Status, Company, Phone  |
| Products         | Name, Description, Price, Stock, Category, ImageUrl      |
| Orders           | PartnerId, ClientId, ClientName, Items, Status, Total    |
| Clients          | PartnerId, Name, Email, Phone, Company, Address          |
| Activities       | PartnerId, Type, Description, RelatedId, CreatedAt       |
| Financials       | PartnerId, Period, Revenue, Outstanding, Paid             |
| Installments     | OrderId, ClientId, PartnerId, Amount, DueDate, Status    |
| Transactions     | ClientId, PartnerId, Type, Amount, Reference, Date       |
| Expenses         | PartnerId, Category, Amount, Description, Date           |
| Invoices         | PartnerId, ClientId, Amount, Status, DueDate             |
| Customers        | Name, Email, PasswordHash, PartnerId, Status             |
| Experts          | Name, Email, PasswordHash, Specialization, Status, Rate  |
| ServicePackages  | Name, TotalSessions, SessionDuration, ValidityDays, Price|
| CustomerPackages | CustomerId, ServicePackageId, ExpertId, Status           |
| Sessions         | CustomerPackageId, CustomerId, ExpertId, Status          |
| ExpertPayments   | ExpertId, SessionId, Amount, Status                      |
| Notifications    | UserId, UserType, Type, Title, Message, Read             |

### Step 5: Set Environment Variables

Set these in your `.env.local`:

```env
AZURE_AD_CLIENT_ID=<from step 1>
AZURE_AD_TENANT_ID=<from step 1>
AZURE_AD_CLIENT_SECRET=<from step 2>
SHAREPOINT_SITE_URL=https://yourorg.sharepoint.com/sites/YourSite
USE_MOCK_DATA=false
```

### Step 6: Test Connection

```bash
# In development
USE_MOCK_DATA=false npm run dev
# Try logging in — if it works, SharePoint is connected
```

---

## 11. Connect Backend to Firebase

### When to use Firebase

- Hostinger shared hosting has no Node.js support and you need a lightweight auth fallback
- You need real-time features (live notifications, chat)
- You need simple data storage for non-critical data

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project** > Name: `partner-portal`
3. Disable Google Analytics (optional)

### Step 2: Enable Authentication

1. In Firebase Console > **Authentication** > **Get started**
2. Enable **Email/Password** provider

### Step 3: Enable Firestore

1. **Firestore Database** > **Create database**
2. Select **Start in test mode** (change rules before production!)
3. Choose nearest region

### Step 4: Get Config

1. Go to **Project Settings** > **General** > **Your apps** > **Web app**
2. Click **Register app**
3. Copy the config object values to your `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=partner-portal.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=partner-portal
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=partner-portal.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 5: Firestore Security Rules (production)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only authenticated users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    // Notifications — user can read their own
    match /notifications/{notifId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null;
    }
  }
}
```

---

## 12. DNS Configuration

### A Record (VPS)

```
Type: A
Name: portal
Value: <VPS IP address>
TTL: 3600
```

### CNAME Record (Vercel)

```
Type: CNAME
Name: portal
Value: cname.vercel-dns.com
TTL: 3600
```

### Verify DNS Propagation

```bash
dig portal.yourdomain.com +short
# or visit https://dnschecker.org
```

---

## 13. SSL/HTTPS Setup

### On VPS (Certbot)

```bash
certbot --nginx -d portal.yourdomain.com
certbot renew --dry-run  # Test auto-renewal
```

### On Vercel / Cloudflare

SSL is automatic — no additional setup needed.

### On Hostinger Shared Hosting

SSL is included with the plan. Enable it via hPanel > **SSL** > **Install**.

---

## 14. Monitoring & Maintenance

### Health Check Endpoint

Create `/api/health` for uptime monitoring:

```typescript
// Already available as: GET /api/health
export function GET() {
  return Response.json({ status: "ok", timestamp: new Date().toISOString() });
}
```

### Recommended Monitoring

- **UptimeRobot** (free): Monitor `https://portal.yourdomain.com/api/health`
- **Vercel Analytics**: Built-in if deployed on Vercel
- **Sentry**: Error tracking (optional)

### Update Workflow

```bash
# On VPS
cd /var/www/partner-portal
git pull origin main
npm install
npm run build
pm2 restart partner-portal
```

---

## 15. Power Automate Email Flow Setup

### Step 1: Create the Flow

1. Go to [Power Automate](https://make.powerautomate.com/)
2. Click **Create** > **Automated cloud flow**
3. Name: `Send Client Email from Portal`
4. Trigger: **When an HTTP request is received**

### Step 2: Configure HTTP Trigger

1. Click on the trigger step
2. Set **Method**: POST
3. Paste this JSON schema:

```json
{
  "type": "object",
  "properties": {
    "event": { "type": "string" },
    "timestamp": { "type": "string" },
    "toEmail": { "type": "string" },
    "toName": { "type": "string" },
    "subject": { "type": "string" },
    "body": { "type": "string" },
    "senderName": { "type": "string" },
    "attachmentUrl": { "type": "string" }
  }
}
```

4. After saving, copy the **HTTP POST URL** — this is your webhook URL

### Step 3: Add Send Email Action

1. Add action: **Office 365 Outlook — Send an email (V2)**
2. Configure:
   - **To**: `toEmail` (from dynamic content)
   - **Subject**: `subject` (from dynamic content)
   - **Body**: `body` (from dynamic content) — switch to HTML mode
3. Optional: Add condition to check if `attachmentUrl` is not empty, then attach file

### Step 4: Save and Test

1. Save the flow
2. Copy the HTTP POST URL
3. Set it as `PA_WEBHOOK_SEND_CLIENT_EMAIL` in your `.env.local`
4. Test from your app by triggering an invoice email

### Step 5: Create Additional Flows

Repeat for each event type:
- **Session Reminder**: Trigger = `session-reminder`, sends reminder email
- **Invoice Created**: Trigger = `invoice-created`, sends invoice with PDF link
- **Payment Overdue**: Trigger = `payment-overdue`, sends overdue notice
- **Order Placed**: Trigger = `order-placed`, sends order confirmation

---

## Quick Reference: Common Commands

```bash
# Local development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm start                      # Start production server
npm run lint                   # Run ESLint

# VPS deployment
pm2 start npm --name portal -- start
pm2 logs portal                # View logs
pm2 restart portal             # Restart
pm2 monit                      # Monitor

# Vercel deployment
npx vercel                     # Deploy preview
npx vercel --prod              # Deploy production
```

---

## Troubleshooting

| Issue                                  | Solution                                                    |
|----------------------------------------|-------------------------------------------------------------|
| `AUTH_SECRET` not set                  | Generate with: `openssl rand -base64 32`                   |
| SharePoint 403 Forbidden              | Check API permissions & admin consent in Azure AD           |
| Firebase `auth/invalid-api-key`        | Verify `NEXT_PUBLIC_FIREBASE_API_KEY` in env                |
| Port 3000 already in use              | `lsof -i :3000` then `kill -9 <PID>`                       |
| Build fails on VPS (memory)           | Add swap: `fallocate -l 2G /swapfile && swapon /swapfile`  |
| Power Automate flow not triggering    | Check webhook URL is correct & flow is turned ON            |
