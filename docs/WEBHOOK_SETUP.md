# 🔗 Clerk Webhook Setup Documentation

## 📋 Overview

This document explains the current webhook setup for Clerk authentication integration with Convex, including the temporary workaround due to Clerk API limitations and future automation plans.

## 🎯 Current Architecture

### **Authentication Flow**

```
User Action → Clerk → Webhook → Convex → Database Update
```

### **Deployment Strategy**

- **Production**: Manual webhook setup pointing to production Convex
- **Development**: Manual webhook setup pointing to development Convex
- **Vercel Previews**: Use development Convex deployment (temporary)

## ⚠️ Current Limitation

**Clerk API Issue**: Clerk does not currently support programmatic webhook creation via their Backend API.

- API endpoint `https://api.clerk.com/v1/webhooks` returns `404 Not Found`
- Webhook management is only available through Clerk Dashboard UI
- This is on [Clerk's roadmap](https://feedback.clerk.com/roadmap) as "Manage Webhooks endpoints via BAPI"

## 🛠️ Temporary Workaround

### **Problem**

Each Vercel preview creates a new Convex deployment via:

```json
{
  "buildCommand": "bunx convex deploy --cmd 'bun run build'"
}
```

This results in:

- ❌ New Convex URL for each preview (e.g., `random-animal-123.convex.cloud`)
- ❌ Static webhook points to wrong deployment
- ❌ Authentication breaks on previews

### **Solution**

Use development Convex deployment for all previews:

**Current `vercel.json`:**

```json
{
  "buildCommand": "bunx convex deploy --cmd 'bun run build'"
}
```

**Temporary `vercel.json`:**

```json
{
  "buildCommand": "bun run build"
}
```

## 📝 Manual Webhook Configuration

### **Clerk Dashboard Setup**

1. Navigate to [Clerk Dashboard → Webhooks](https://dashboard.clerk.com/last-active?path=webhooks)
2. Click **Add Endpoint**
3. Configure:
   - **URL**: `https://steady-echidna-397.convex.site/webhooks/clerk`
   - **Events**:
     - `user.created`
     - `user.updated`
     - `user.deleted`
     - `session.created`
     - `session.ended`
   - **Description**: "Development webhook for Convex + Vercel previews"

### **Environment Variables**

Ensure `CLERK_WEBHOOK_SECRET` is set in Convex:

```bash
bunx convex env set CLERK_WEBHOOK_SECRET "whsec_your_webhook_secret_here"
```

## 🚀 Future Automation (Ready for Clerk API)

### **Automated Webhook Script**

The `scripts/vercel-build-hook.ts` is already prepared for when Clerk implements API support:

**Features Ready:**

- ✅ Environment-agnostic webhook creation
- ✅ Idempotent webhook checking
- ✅ Automatic secret management
- ✅ Robust error handling
- ✅ Direct Convex integration (bypasses Vercel API routes)

**Current Behavior:**

```typescript
// This will work once Clerk adds API support
const response = await fetch("https://api.clerk.com/v1/webhooks", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${CLERK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(webhookData),
});
// Currently returns 404 - webhook creation not supported
```

### **When Clerk API is Available**

1. **Remove temporary workaround** - restore dynamic Convex deployments
2. **Enable webhook automation** - script will automatically create webhooks
3. **Per-preview webhooks** - each preview gets its own webhook endpoint

## 🔄 Migration Plan

### **Phase 1: Current (Temporary)**

- ✅ Manual webhook setup in Clerk Dashboard
- ✅ Static development Convex for all previews
- ✅ Modified `vercel.json` without `convex deploy`
- ✅ Disabled webhook automation in `package.json` build script

### **Phase 2: When Clerk API Available**

- 🔄 Restore `bunx convex deploy --cmd 'bun run build'` in `vercel.json`
- 🔄 Re-enable webhook automation: `"build": "next build && bun scripts/vercel-build-hook.ts"`
- 🔄 Each preview gets dedicated Convex deployment + webhook

### **Phase 3: Full Automation**

- ✅ Zero manual webhook configuration
- ✅ Perfect preview isolation
- ✅ Seamless authentication across all environments

## 📊 Current Deployments

### **Convex Deployments**

- **Development API**: `steady-echidna-397.convex.cloud`
- **Development HTTP Actions**: `steady-echidna-397.convex.site`
- **Production**: TBD (when ready for production)

### **Webhook Endpoints**

- **Development/Previews**: `https://steady-echidna-397.convex.site/webhooks/clerk`
- **Production**: TBD

## 🧪 Testing

### **Test Webhook Setup**

```bash
bun scripts/test-webhook-setup.ts
```

**Expected Output (Current):**

```
❌ Clerk API doesn't support programmatic webhook creation
📋 Required webhook configuration:
   URL: https://steady-echidna-397.convex.site/webhooks/clerk
   Events: user.created, user.updated, user.deleted, session.created, session.ended
```

### **Verify Manual Setup**

1. Check webhook exists in Clerk Dashboard
2. Verify `CLERK_WEBHOOK_SECRET` in Convex
3. Test authentication flow on preview deployment

## 📚 Related Files

- `scripts/vercel-build-hook.ts` - Automated webhook creation (ready for future)
- `scripts/test-webhook-setup.ts` - Test webhook automation logic
- `vercel.json` - Build configuration (temporarily modified)
- `package.json` - Build script includes webhook hook

## 🔍 Monitoring

### **Webhook Delivery**

Monitor webhook delivery in Clerk Dashboard:

1. Navigate to **Webhooks** → Select endpoint
2. Check **Message Attempts** for delivery status
3. Use **Replay** feature if messages fail

### **Convex Logs**

Check Convex dashboard for webhook processing:

```bash
bunx convex logs
```

## ⚡ Quick Reference

### **Key Commands**

```bash
# Test webhook setup logic
bun scripts/test-webhook-setup.ts

# Check Convex environment variables
bunx convex env list

# Set webhook secret
bunx convex env set CLERK_WEBHOOK_SECRET "whsec_..."

# View Convex logs
bunx convex logs
```

### **Important URLs**

- **Clerk Dashboard**: https://dashboard.clerk.com/last-active?path=webhooks
- **Convex Dashboard**: https://dashboard.convex.dev
- **Webhook Endpoint**: https://steady-echidna-397.convex.site/webhooks/clerk

---

**Last Updated**: 2025-01-27  
**Status**: Temporary workaround active, awaiting Clerk API support  
**Next Review**: When Clerk implements webhook management API
