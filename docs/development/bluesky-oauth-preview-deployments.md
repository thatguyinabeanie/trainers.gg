# Bluesky OAuth on Preview Deployments

This document details how to enable Bluesky/AT Protocol OAuth on Vercel preview deployments, the technical constraints involved, and a complete implementation plan.

## Problem Statement

Bluesky OAuth does not work on Vercel preview deployments because:

1. **Vercel SSO Protection** blocks external access to preview URLs
2. **AT Protocol OAuth spec** requires the client metadata endpoint (`/api/oauth/client-metadata`) to return HTTP 200 directly—no redirects, no auth challenges
3. When Bluesky's auth server tries to fetch the preview URL's metadata, Vercel intercepts it with a 308 redirect to SSO login, causing Bluesky to reject the OAuth request with `invalid_client_metadata`

```
┌───────────────────────────────────────────────────────────────────────────┐
│                      Preview Deployment OAuth Flow                         │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  User                    Preview App              Bluesky Auth Server     │
│   │                          │                           │                │
│   │──── Click Login ────────>│                           │                │
│   │                          │────── Start OAuth ───────>│                │
│   │                          │                           │                │
│   │                          │   ❌ Fetch Metadata       │                │
│   │                          │<──── (Blocked by Vercel ──│                │
│   │                          │       SSO Protection)     │                │
│   │                          │                           │                │
│   │<──── 503 Error ─────────│                           │                │
│   │      "Not available      │                           │                │
│   │       on previews"       │                           │                │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Current Workaround

Bluesky OAuth is explicitly disabled on preview deployments in `/apps/web/src/app/api/oauth/login/route.ts`:

```typescript
function isVercelPreview(): boolean {
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV === "preview";
  }
  if (process.env.VERCEL_URL && process.env.NODE_ENV !== "production") {
    return true;
  }
  return false;
}

export async function GET(request: Request) {
  if (isVercelPreview()) {
    return NextResponse.json(
      {
        error: "Bluesky login is not available on preview deployments.",
        details: "Please use the production site at https://trainers.gg",
      },
      { status: 503 }
    );
  }
  // ... rest of OAuth flow
}
```

---

## AT Protocol OAuth Constraints

The AT Protocol OAuth specification is strict about `client_id` requirements:

| Requirement                        | Details                                                                                 |
| ---------------------------------- | --------------------------------------------------------------------------------------- |
| `client_id` format                 | Must be a fully-qualified HTTPS URL from which client metadata can be fetched           |
| URL must return HTTP 200           | No redirects (301, 302, 308) allowed—must return 200 directly                           |
| `client_id` in metadata must match | The `client_id` field in the returned JSON must exactly match the URL used to fetch it  |
| `redirect_uris` must match         | Redirect URIs in the authorization request must match those declared in client metadata |
| Domain matching                    | The `client_id` URL domain and `redirect_uri` domain must match for web clients         |

### Localhost Exception

For local development, AT Protocol allows `http://localhost` clients:

- Scheme must be `http` (not `https`)
- Hostname must be exactly `localhost` (not `127.0.0.1`)
- Becomes a `native` application type (not `web`)
- Only supports public clients (no confidential client support)

This exception does not help with cloud-hosted preview deployments.

### No Dynamic Client Registration

AT Protocol does NOT support RFC 7591 Dynamic Client Registration. Instead, it uses a "Client ID Metadata Document" approach where the `client_id` IS the URL to the metadata document.

---

## Vercel Protection Bypass Options Investigated

### Option 1: Path-Based SSO Exclusion

**Status:** Not supported by Vercel

Vercel's SSO protection applies at the deployment level, not per-route. The `optionsAllowlist` feature only excludes paths for CORS preflight (`OPTIONS`) requests, not `GET` requests.

### Option 2: Automation Bypass Secret

**Status:** Not viable for OAuth

The `x-vercel-protection-bypass` header/query parameter requires knowing a secret. Bluesky's auth server cannot know this secret when fetching metadata.

Embedding the secret in the OAuth `client_id` URL would expose it publicly—a security risk.

### Option 3: Shareable Links

**Status:** Not viable for OAuth

Vercel's shareable links work by setting cookies after a redirect. Bluesky's server makes programmatic fetches and won't store/use cookies.

### Option 4: `all_except_custom_domains` SSO Setting

**Status:** Viable solution

Vercel's SSO protection supports a `deploymentType` of `all_except_custom_domains`, which means:

- `*.vercel.app` preview URLs remain SSO-protected
- Custom domains (like `preview.trainers.gg`) bypass SSO protection

---

## Recommended Solution: Stable Preview Subdomain

Create a dedicated `preview.trainers.gg` subdomain that:

1. Points to a specific preview deployment (usually latest main branch)
2. Bypasses SSO protection (via `all_except_custom_domains` setting)
3. Allows Bluesky OAuth to function normally

### Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ preview.trainers.gg OAuth Flow                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User visits preview.trainers.gg (unprotected)                   │
│  2. Clicks "Sign in with Bluesky"                                   │
│  3. Bluesky fetches preview.trainers.gg/api/oauth/client-metadata   │
│  4. Metadata returns HTTP 200 (no SSO block)                        │
│  5. OAuth flow completes normally                                    │
│  6. Callback goes to preview.trainers.gg/api/oauth/callback         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Protection Matrix After Implementation

| URL Pattern             | SSO Protected?     | Bluesky OAuth? |
| ----------------------- | ------------------ | -------------- |
| `trainers.gg`           | No (production)    | Yes            |
| `preview.trainers.gg`   | No (custom domain) | Yes            |
| `*.vercel.app` previews | Yes                | No             |

---

## Implementation Plan

### Phase 1: Vercel Infrastructure Configuration

#### 1.1 Add DNS Record for `preview.trainers.gg`

**Method:** Vercel Dashboard or API

**Steps:**

1. Navigate to Vercel → trainers.gg project → Domains
2. Add domain: `preview.trainers.gg`
3. Vercel will auto-configure DNS (since trainers.gg uses Vercel DNS)

**Verification:**

```bash
dig preview.trainers.gg CNAME
# Should show: cname.vercel-dns.com
```

#### 1.2 Update SSO Protection Settings

**Method:** Vercel Dashboard (Project Settings → Security) or API

**Change:**

- From: `ssoProtection: { deploymentType: "preview" }`
- To: `ssoProtection: { deploymentType: "all_except_custom_domains" }`

**Via API:**

```bash
curl -X PATCH "https://api.vercel.com/v9/projects/trainers-gg?teamId=team_EbBJSZEnQZdDIFKeU07QszY1" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ssoProtection": {"deploymentType": "all_except_custom_domains"}}'
```

**Important:** This setting cannot be configured via `vercel.json`. It must be set via the Dashboard or API.

#### 1.3 Assign Initial Alias

**Command:**

```bash
# Get latest main branch deployment URL
vercel ls --scope=beanie-gg trainers-gg

# Assign preview.trainers.gg to that deployment
vercel alias set <deployment-url> preview.trainers.gg
```

---

### Phase 2: Code Changes

#### 2.1 Update OAuth Login Route

**File:** `apps/web/src/app/api/oauth/login/route.ts`

**Current code (blocks all previews):**

```typescript
if (isVercelPreview()) {
  return NextResponse.json(
    {
      error: "Bluesky login is not available on preview deployments.",
      details: "Please use the production site at https://trainers.gg",
    },
    { status: 503 }
  );
}
```

**New code (allows custom domains like preview.trainers.gg):**

```typescript
import { headers } from "next/headers";

function shouldBlockBlueskyOAuth(): boolean {
  const headersList = headers();
  const host = headersList.get("host") || "";

  // If on a custom domain (e.g., preview.trainers.gg, trainers.gg), allow OAuth
  if (!host.includes(".vercel.app")) {
    return false;
  }

  // Block .vercel.app preview URLs (they're SSO protected and OAuth won't work)
  return isVercelPreview();
}

export async function GET(request: Request) {
  if (shouldBlockBlueskyOAuth()) {
    return NextResponse.json(
      {
        error: "Bluesky login is not available on *.vercel.app preview URLs.",
        details:
          "Use preview.trainers.gg or the production site at https://trainers.gg",
      },
      { status: 503 }
    );
  }
  // ... rest of OAuth flow
}
```

#### 2.2 Add noindex Header for Preview Domain

**File:** `apps/web/next.config.ts`

Add to the `headers()` function:

```typescript
async headers() {
  const headers = [];

  // Prevent search engines from indexing preview subdomain
  if (process.env.VERCEL_URL?.includes('preview.trainers.gg') ||
      process.env.NEXT_PUBLIC_SITE_URL?.includes('preview.trainers.gg')) {
    headers.push({
      source: '/:path*',
      headers: [
        { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      ],
    });
  }

  return headers;
}
```

**Alternative:** Check host at runtime in middleware if environment variable detection doesn't work.

#### 2.3 Update robots.txt (Optional)

**File:** `apps/web/public/robots.txt`

```plaintext
# Production
User-agent: *
Allow: /

# Block API and OAuth routes from indexing
Disallow: /api/
Disallow: /oauth/
```

Note: `robots.txt` is per-domain. For preview subdomain blocking, the `X-Robots-Tag` header approach (2.2) is more reliable.

---

### Phase 3: CI/CD Automation (Optional)

#### Option A: Auto-Update on Main Branch Push

**File:** `.github/workflows/update-preview-alias.yml`

```yaml
name: Update Preview Alias

on:
  push:
    branches: [main]

jobs:
  update-alias:
    runs-on: ubuntu-latest
    steps:
      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Wait for Vercel deployment
        uses: patrickedqvist/wait-for-vercel-preview@v1.3.2
        id: deployment
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          environment: Preview
          max_timeout: 600

      - name: Update preview.trainers.gg alias
        run: |
          vercel alias set ${{ steps.deployment.outputs.url }} preview.trainers.gg \
            --token=${{ secrets.VERCEL_TOKEN }} \
            --scope=beanie-gg
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}

      - name: Notify success
        run: echo "preview.trainers.gg now points to ${{ steps.deployment.outputs.url }}"
```

**Required secret:** Add `VERCEL_TOKEN` to GitHub repository secrets.

#### Option B: Manual Alias Update

For testing a specific PR:

```bash
# Get the deployment URL from your PR's Vercel preview comment
vercel alias set <pr-deployment-url> preview.trainers.gg --token=$VERCEL_TOKEN
```

---

### Phase 4: Verification

#### 4.1 Test OAuth Flow

1. Navigate to `https://preview.trainers.gg`
2. Click "Sign in with Bluesky"
3. Complete OAuth flow with a Bluesky account
4. Verify callback returns to `preview.trainers.gg` and session is created

#### 4.2 Verify SSO Protection Still Works

1. Get a `*.vercel.app` preview URL from a PR
2. Open in incognito/private browsing
3. Should prompt for Vercel SSO login
4. Confirm `preview.trainers.gg` does NOT prompt for SSO

#### 4.3 Verify noindex Header

```bash
curl -I https://preview.trainers.gg | grep -i robot
# Should show: X-Robots-Tag: noindex, nofollow
```

#### 4.4 Verify OAuth Metadata Accessible

```bash
curl https://preview.trainers.gg/api/oauth/client-metadata
# Should return JSON with client_id, redirect_uris, etc.
```

---

## Security Considerations

### What's Exposed?

| Aspect                          | Risk Level | Mitigation                                             |
| ------------------------------- | ---------- | ------------------------------------------------------ |
| In-development features visible | Low-Medium | Use feature flags for incomplete features              |
| Potential bugs/exploits         | Low        | Preview uses Supabase preview branch (isolated DB)     |
| OAuth testing on public URL     | Low        | This is the intended purpose                           |
| Database writes                 | Medium     | Supabase preview branches are isolated from production |

### Recommendations

1. **Feature flags:** Wrap incomplete features in `process.env.VERCEL_ENV === 'production'` checks
2. **Supabase preview branches:** Already configured—preview deployments use isolated database branches
3. **Robots.txt / noindex:** Prevent search engine indexing of preview subdomain
4. **Rate limiting:** Consider Vercel Firewall rules for the preview domain if abuse occurs
5. **Synthetic data:** Ensure preview databases use test data only, never production data

### What Stays Protected

- All `*.vercel.app` URLs still require Vercel SSO
- Production `trainers.gg` is unaffected (already public)
- Only `preview.trainers.gg` becomes publicly accessible (intentionally)

---

## Multi-Developer Workflow

### Single `preview.trainers.gg` Approach

| Scenario                                   | Solution                                                                          |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| Two devs need OAuth testing simultaneously | Coordinate—only one can use `preview.trainers.gg` at a time                       |
| PR-specific testing                        | Developer manually runs `vercel alias set <their-deployment> preview.trainers.gg` |
| Need to test OAuth on a specific PR        | Take turns, or one developer uses local tunnel                                    |

### Alternative: Wildcard Subdomain (More Complex)

For simultaneous multi-developer testing:

1. **DNS:** Add wildcard `*.preview.trainers.gg` → Vercel
2. **Per-PR aliases:** `pr-123.preview.trainers.gg`, `pr-456.preview.trainers.gg`
3. **AT Protocol note:** Each subdomain is a unique OAuth client to Bluesky (sessions are isolated per domain)

**Recommendation:** Start with single `preview.trainers.gg` and evaluate multi-developer needs based on actual usage.

### Local Tunnel Alternative

For developers who can't use the shared `preview.trainers.gg`:

```bash
# Option 1: ngrok
ngrok http 3000
# Set NEXT_PUBLIC_SITE_URL to the ngrok URL

# Option 2: Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3000
# Set NEXT_PUBLIC_SITE_URL to the tunnel URL
```

See `docs/development/local-oauth-setup.md` for detailed local OAuth testing instructions.

---

## Configuration Notes

### Settings NOT Configurable via `vercel.json`

The following must be configured via Vercel Dashboard or API:

- `ssoProtection` (SSO/Vercel Authentication)
- `passwordProtection`
- `trustedIps`
- Domain assignments and aliases

### Infrastructure-as-Code Options

If you want these settings version-controlled:

#### GitHub Action Approach

```yaml
# .github/workflows/vercel-config.yml
name: Configure Vercel Project

on:
  workflow_dispatch:
  push:
    paths:
      - ".github/vercel-project-config.json"

jobs:
  configure:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Update Vercel Project Settings
        run: |
          curl -X PATCH "https://api.vercel.com/v9/projects/${{ vars.VERCEL_PROJECT_ID }}?teamId=${{ vars.VERCEL_TEAM_ID }}" \
            -H "Authorization: Bearer ${{ secrets.VERCEL_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d @.github/vercel-project-config.json
```

With config file:

```json
// .github/vercel-project-config.json
{
  "ssoProtection": {
    "deploymentType": "all_except_custom_domains"
  }
}
```

#### Terraform Provider

```hcl
resource "vercel_project" "trainers_gg" {
  name = "trainers-gg"

  vercel_authentication = {
    deployment_type = "all_except_custom_domains"
  }
}
```

---

## Summary Checklist

| Step | Description                                      | Method        | Status |
| ---- | ------------------------------------------------ | ------------- | ------ |
| 1.1  | Add `preview.trainers.gg` domain in Vercel       | Dashboard/API | ⬜     |
| 1.2  | Change SSO to `all_except_custom_domains`        | Dashboard/API | ⬜     |
| 1.3  | Assign initial alias to latest main deployment   | CLI           | ⬜     |
| 2.1  | Update OAuth login route to allow custom domains | Code          | ⬜     |
| 2.2  | Add noindex header for preview domain            | Code          | ⬜     |
| 2.3  | Update robots.txt (optional)                     | Code          | ⬜     |
| 3.1  | Add GitHub Action for auto-alias (optional)      | Code          | ⬜     |
| 4.1  | Test OAuth flow on preview.trainers.gg           | Manual        | ⬜     |
| 4.2  | Verify SSO still works on \*.vercel.app          | Manual        | ⬜     |
| 4.3  | Verify noindex header                            | Manual        | ⬜     |

---

## Related Documentation

- [Local OAuth Setup](./local-oauth-setup.md) - Testing OAuth locally with tunnels
- [Bluesky Integration](../planning/BLUESKY_INTEGRATION.md) - Overall AT Protocol integration
- [Authentication Setup](../AUTHENTICATION_SETUP.md) - General auth architecture

---

## References

- [AT Protocol OAuth Specification](https://atproto.com/specs/oauth)
- [Vercel Deployment Protection](https://vercel.com/docs/security/deployment-protection)
- [Vercel SSO Protection API](https://vercel.com/docs/rest-api/reference/endpoints/projects/update-an-existing-project)
