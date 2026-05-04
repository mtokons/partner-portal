#!/bin/bash
# Helper script to sync the Azure AD and SharePoint environment variables to Vercel

echo "Syncing Azure AD and SharePoint API credentials to Vercel production..."

npx vercel env add AZURE_AD_TENANT_ID production
npx vercel env add AZURE_AD_CLIENT_ID production
npx vercel env add AZURE_AD_CLIENT_SECRET production
npx vercel env add SHAREPOINT_SITE_URL production

echo "Now triggering a new Vercel production deployment..."
npx vercel --prod --yes
