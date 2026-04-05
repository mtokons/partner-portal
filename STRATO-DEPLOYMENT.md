# Strato.de Deployment Guide (Vercel)

This guide provides step-by-step instructions for pointing your `portal.mysccg.de` subdomain (hosted on **Strato.de**) to your Vercel project.

## 1. Vercel Configuration
1.  Go to [Vercel Dashboard](https://vercel.com/sccg/partner-portal/settings/domains).
2.  Add `portal.mysccg.de` to your list of domains.
3.  Vercel will provide you with a **CNAME** target (e.g., `cname.vercel-dns.com` or a specific one starting with `9be0...`).

## 2. Strato.de DNS Settings
Strato handles subdomains differently than other providers. Follow these exact steps:

### A. Create the Subdomain
1.  Log in to your **Strato Customer Center**.
2.  Navigate to **Domainverwaltung**.
3.  Click the domain `mysccg.de`.
4.  Click **Subdomain anlegen** and type `portal`.
5.  Save your changes.

### B. Configure the CNAME
1.  Click on your **Domainverwaltung** again and select the domain `mysccg.de`.
2.  Under the subdomain list, click on the **portal** subdomain you just created.
3.  Click **DNS-Einstellungen**.
4.  Look for the **CNAME-Record** section.
5.  Set the CNAME to the target provided by Vercel (usually `cname.vercel-dns.com.`).
    - **IMPORTANT**: In Strato, ensure there is a trailing dot at the end: `cname.vercel-dns.com.`
6.  Save your changes.

### C. Remove A/AAAA Records (If Present)
1.  In the same **DNS-Einstellungen** for the `portal` subdomain, ensure that the **A-Record** and **AAAA-Record** are NOT set to anything other than the default or the Vercel IP.
2.  If you set a CNAME, Strato usually handles this automatically.

## 3. Verify in Vercel
1.  Once you've updated Strato, return to your [Vercel Domains page](https://vercel.com/sccg/partner-portal/settings/domains).
2.  Wait for the status to change to **"Valid Configuration"** (Green checkmark).
3.  DNS propagation can take between 5 minutes and 24 hours but is usually fast.

## 4. Environment Variables
Ensure these are set in Vercel to match your new domain:
- `NEXTAUTH_URL`: `https://portal.mysccg.de`
- `NEXT_PUBLIC_APP_URL`: `https://portal.mysccg.de`
