# PostHog Full Suite Integration — Design

**Date:** 2026-02-20
**Status:** Approved
**Scope:** Analytics, Session Replay, Surveys, Exception Capture, Cookie Consent

## Overview

Integrate PostHog into the Next.js 16 web app using the official React SDK (`posthog-js`). All tracking is gated behind a cookie consent banner. No PostHog feature flags — Vercel Flags remains the server-side flag system.

## Scope

| Feature | Included | Notes |
|---|---|---|
| Analytics (pageviews, events) | Yes | Manual pageview capture for App Router |
| User identification | Yes | Tied to Supabase auth context |
| Session replay | Yes | Gated by consent, disabled during impersonation |
| Surveys | Yes | Gated by consent |
| Exception capture | Yes | Autocapture + manual `captureException()` |
| Cookie consent banner | Yes | Accept/Decline, localStorage-backed |
| Feature flags | No | Keep Vercel Flags for now |
| Server-side SDK (posthog-node) | No | Client-only for now |

## Architecture

### Provider Chain

```
QueryClientProvider
  └─ AuthProvider
       └─ PostHogProvider (consent-gated, identifies user)
            └─ CookieConsent (banner)
                 └─ ThemeProvider
                      └─ {children}
```

PostHogProvider sits after AuthProvider to access auth state. It:
1. Reads consent from localStorage (`cookie-consent` key)
2. Initializes PostHog only if consent is granted (`opt_out_capturing_by_default: true`)
3. Calls `posthog.identify()` on auth changes
4. Disables session replay during admin impersonation
5. Calls `posthog.reset()` on sign out

### PostHog Configuration

```typescript
posthog.init(NEXT_PUBLIC_POSTHOG_KEY, {
  api_host: NEXT_PUBLIC_POSTHOG_HOST,
  persistence: "localStorage+cookie",
  opt_out_capturing_by_default: true,
  capture_pageview: false,        // manual for App Router
  capture_pageleave: true,
  capture_exceptions: true,       // exception autocapture
  disable_session_recording: false,
});
```

### Cookie Consent

- **States:** undecided (banner shown), accepted (PostHog active), declined (PostHog inactive)
- **Storage:** `localStorage` key `cookie-consent` → `"granted"` | `"denied"`
- **UI:** Bottom bar, minimal design, Accept + Decline buttons
- **Mechanism:** `posthog.opt_in_capturing()` on accept, `posthog.opt_out_capturing()` on decline

### User Identification

On auth state change:
```typescript
posthog.identify(user.id, {
  email: user.email,
  username: user.user_metadata.username,
  name: user.user_metadata.full_name,
  bluesky_handle: user.user_metadata.bluesky_handle,
});
```

On sign out: `posthog.reset()`

### Impersonation Handling

When admin impersonation is active:
- Stop session recording: `posthog.stopSessionRecording()`
- Tag events with `$impersonated: true` super property
- On impersonation end: restart recording, remove super property

### Pageview Tracking

A `PostHogPageview` client component using `usePathname()` + `useSearchParams()` to fire `$pageview` events on client-side navigation. Wrapped in `<Suspense>` in the provider.

### Exception Capture

- `capture_exceptions: true` in init config for unhandled exceptions
- Export `captureException(error)` helper from `src/lib/posthog/client.ts` for caught errors

## Files

| File | Action | Purpose |
|---|---|---|
| `apps/web/package.json` | Modify | Add `posthog-js` |
| `apps/web/src/lib/posthog/client.ts` | Create | PostHog init, singleton, captureException helper |
| `apps/web/src/lib/posthog/posthog-provider.tsx` | Create | Provider with consent, identity, impersonation |
| `apps/web/src/lib/posthog/posthog-pageview.tsx` | Create | Pageview tracking component |
| `apps/web/src/components/cookie-consent.tsx` | Create | Cookie consent banner |
| `apps/web/src/components/providers.tsx` | Modify | Add PostHogProvider + CookieConsent |
| `turbo.json` | Modify | Add NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST |
| `.env.example` | Modify | Document new env vars |

## Environment Variables

| Variable | Type | Where |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Public | Client-side project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | Public | PostHog instance URL |

Both added to `turbo.json` globalEnv for cache invalidation.

## Decisions

1. **No feature flags** — Vercel Flags handles server-side flags; PostHog flags can be added later
2. **No posthog-node** — Client-only for now; server SDK can be added incrementally
3. **All-or-nothing consent** — No category toggles; PostHog is the only third-party tracker
4. **localStorage for consent** — Simple, no server round-trip, easy to add settings page later
5. **Exception capture replaces Sentry** — Less powerful but integrated with session replay context
