# Vercel Authentication Setup Guide

This guide explains how to protect battlestadium.gg (production deployment) so only Vercel team members can access it during development.

## Overview

Vercel Authentication restricts access to your production site at battlestadium.gg, requiring users to be logged into Vercel and have appropriate permissions to view the site.

## Setup Steps

### 1. Enable Vercel Authentication

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select the **battle-stadium** project
3. Navigate to **Settings** → **Deployment Protection**
4. Toggle ON **Vercel Authentication**
5. Select protection scope:
   - **Standard Protection**: Protects all preview URLs and production deployment URLs (✅ USE THIS)
   - **All Deployments**: Protects every deployment
   - **Only Preview Deployments**: Protects preview deployments only

### 2. Configure Access

By default, the following users can access protected deployments:

- Team members with at least **Viewer** role
- Project members with at least **Project Viewer** role
- Members of access groups with project permissions

### 3. Managing External Access (Optional)

If you need to grant access to external users:

1. They visit the protected deployment URL
2. They click "Request Access"
3. You receive an email/notification
4. Approve/deny requests in **Settings** → **Deployment Protection** → **Requests**

### 4. Additional Security Options

You can combine Vercel Authentication with:

- **Password Protection**: Add an additional password layer
- **Trusted IPs**: Restrict access to specific IP addresses
- **Shareable Links**: Create temporary access links

## Important Notes

- Authentication is managed per-project, not per-deployment
- Disabling Vercel Authentication makes ALL deployments public immediately
- Re-enabling maintains access for previously authenticated users
- Authentication tokens are URL-specific and non-transferable

## Verifying Protection

After enabling:

1. Open an incognito/private browser window
2. Visit <https://battlestadium.gg>
3. You should see the Vercel login page
4. Only team members can log in and access the site

## For CI/CD and Automation

If you need automated tools to access protected deployments:

1. Generate a Protection Bypass token in the dashboard
2. Add the `x-vercel-protection-bypass` header to requests
3. Store the token securely in your CI environment

## Troubleshooting

- **"Access Denied" for team members**: Ensure they have at least Viewer role
- **Can't see login page**: Clear browser cache and cookies
- **External users need access**: Use the access request feature or create shareable links

## Next Steps

Once your site is ready for public release:

1. Return to **Settings** → **Deployment Protection**
2. Toggle OFF **Vercel Authentication**
3. battlestadium.gg will become publicly accessible

## Current Status

- **Production URL**: <https://battlestadium.gg>
- **Protection Status**: Needs to be enabled in Vercel Dashboard
- **Access**: Will be restricted to team members only

---

Remember: This protection is for the deployed production site (battlestadium.gg) only. Local development remains unaffected.
