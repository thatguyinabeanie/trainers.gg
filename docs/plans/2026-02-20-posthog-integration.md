# PostHog Full Suite Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate PostHog analytics, session replay, surveys, and exception capture into the Next.js web app, gated behind a cookie consent banner.

**Architecture:** PostHog React SDK (`posthog-js`) in the existing provider chain, initialized only after cookie consent. User identification via Supabase auth context. Session replay disabled during admin impersonation. Manual pageview tracking for App Router.

**Tech Stack:** posthog-js, React 19, Next.js 16 App Router, Supabase Auth, Tailwind CSS 4

---

### Task 1: Install posthog-js dependency

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install the package**

Run: `cd /Users/beanie/source/trainers.gg && pnpm add posthog-js --filter @trainers/web`

**Step 2: Verify installation**

Run: `grep posthog apps/web/package.json`
Expected: `"posthog-js": "^X.X.X"` appears in dependencies

**Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add posthog-js dependency"
```

---

### Task 2: Add environment variables to turbo.json and .env.example

**Files:**
- Modify: `turbo.json` (add to `globalEnv` array)
- Modify: `.env.example` (document new vars)

**Step 1: Add env vars to turbo.json globalEnv**

In `turbo.json`, add these two entries to the `globalEnv` array (after the existing `NEXT_PUBLIC_` entries, around line 8):

```json
"NEXT_PUBLIC_POSTHOG_KEY",
"NEXT_PUBLIC_POSTHOG_HOST",
```

**Step 2: Add env vars to .env.example**

Append this section to the end of `.env.example`:

```bash
# =============================================================================
# PostHog Analytics
# =============================================================================
# Get from PostHog project settings: https://app.posthog.com/settings/project
# NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxx
# NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

**Step 3: Commit**

```bash
git add turbo.json .env.example
git commit -m "chore: add PostHog env vars to turbo.json and .env.example"
```

---

### Task 3: Create PostHog client singleton

**Files:**
- Create: `apps/web/src/lib/posthog/client.ts`

**Step 1: Create the PostHog client module**

Create `apps/web/src/lib/posthog/client.ts`:

```typescript
import posthog from "posthog-js";

export function initPostHog() {
  if (typeof window === "undefined") return;
  if (posthog.__loaded) return;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key || !host) return;

  posthog.init(key, {
    api_host: host,
    persistence: "localStorage+cookie",
    // Start opted out — only track after cookie consent
    opt_out_capturing_by_default: true,
    // App Router: capture pageviews manually via PostHogPageview component
    capture_pageview: false,
    capture_pageleave: true,
    // Exception autocapture (replaces Sentry)
    autocapture: true,
    // Session replay — controlled by consent opt-in
    disable_session_recording: false,
  });
}

/**
 * Capture a caught exception in PostHog.
 * For unhandled exceptions, PostHog autocapture handles them automatically.
 */
export function captureException(error: unknown) {
  if (typeof window === "undefined") return;
  if (!posthog.__loaded) return;

  if (error instanceof Error) {
    posthog.capture("$exception", {
      $exception_message: error.message,
      $exception_type: error.name,
      $exception_stack_trace_raw: error.stack,
    });
  } else {
    posthog.capture("$exception", {
      $exception_message: String(error),
    });
  }
}

export { posthog };
```

**Step 2: Verify the file compiles**

Run: `cd /Users/beanie/source/trainers.gg && pnpm --filter @trainers/web typecheck`
Expected: No new type errors

**Step 3: Commit**

```bash
git add apps/web/src/lib/posthog/client.ts
git commit -m "feat: add PostHog client singleton with exception capture"
```

---

### Task 4: Create PostHog pageview tracking component

**Files:**
- Create: `apps/web/src/lib/posthog/posthog-pageview.tsx`

**Step 1: Create the pageview component**

Create `apps/web/src/lib/posthog/posthog-pageview.tsx`:

```typescript
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

/**
 * Tracks pageviews on client-side navigation.
 * Next.js App Router doesn't trigger full page loads on navigation,
 * so we capture $pageview events manually when the URL changes.
 *
 * Must be rendered inside <PostHogProvider> and wrapped in <Suspense>.
 */
export function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const posthog = usePostHog();

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname;
      const search = searchParams.toString();
      if (search) {
        url = url + "?" + search;
      }
      posthog.capture("$pageview", { $current_url: url });
    }
  }, [pathname, searchParams, posthog]);

  return null;
}
```

**Step 2: Verify the file compiles**

Run: `cd /Users/beanie/source/trainers.gg && pnpm --filter @trainers/web typecheck`
Expected: No new type errors

**Step 3: Commit**

```bash
git add apps/web/src/lib/posthog/posthog-pageview.tsx
git commit -m "feat: add PostHog pageview tracking for App Router"
```

---

### Task 5: Create cookie consent banner component

**Files:**
- Create: `apps/web/src/components/cookie-consent.tsx`

**Step 1: Create the cookie consent component**

Create `apps/web/src/components/cookie-consent.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CONSENT_KEY = "cookie-consent";

export type ConsentStatus = "granted" | "denied" | "undecided";

export function getConsentStatus(): ConsentStatus {
  if (typeof window === "undefined") return "undecided";
  const value = localStorage.getItem(CONSENT_KEY);
  if (value === "granted" || value === "denied") return value;
  return "undecided";
}

export function setConsentStatus(status: "granted" | "denied") {
  localStorage.setItem(CONSENT_KEY, status);
  window.dispatchEvent(new CustomEvent("consent-change", { detail: status }));
}

export function CookieConsent() {
  const [status, setStatus] = useState<ConsentStatus>("undecided");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStatus(getConsentStatus());
    setMounted(true);
  }, []);

  if (!mounted || status !== "undecided") return null;

  return (
    <div
      className={cn(
        "bg-card border-border fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-3 rounded-lg border p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between",
        "mx-auto max-w-lg"
      )}
    >
      <p className="text-muted-foreground text-sm">
        We use cookies to improve your experience and understand how the site is
        used.
      </p>
      <div className="flex shrink-0 gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setConsentStatus("denied");
            setStatus("denied");
          }}
        >
          Decline
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setConsentStatus("granted");
            setStatus("granted");
          }}
        >
          Accept
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Verify the file compiles**

Run: `cd /Users/beanie/source/trainers.gg && pnpm --filter @trainers/web typecheck`
Expected: No new type errors

**Step 3: Commit**

```bash
git add apps/web/src/components/cookie-consent.tsx
git commit -m "feat: add cookie consent banner component"
```

---

### Task 6: Create PostHog provider with consent gating and user identification

**Files:**
- Create: `apps/web/src/lib/posthog/posthog-provider.tsx`

This is the core integration component. It:
1. Initializes PostHog on mount
2. Listens for consent changes and opts in/out accordingly
3. Identifies the user when auth state changes
4. Disables session replay during admin impersonation

**Step 1: Create the provider component**

Create `apps/web/src/lib/posthog/posthog-provider.tsx`:

```typescript
"use client";

import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { Suspense, useEffect, type ReactNode } from "react";
import { useAuthContext } from "@/components/auth/auth-provider";
import { getConsentStatus } from "@/components/cookie-consent";
import { initPostHog, posthog } from "@/lib/posthog/client";
import { PostHogPageview } from "@/lib/posthog/posthog-pageview";

function PostHogAuthSync({ isImpersonating }: { isImpersonating: boolean }) {
  const { user, isAuthenticated } = useAuthContext();
  const ph = usePostHog();

  // Identify/reset user based on auth state
  useEffect(() => {
    if (!ph) return;

    if (isAuthenticated && user) {
      ph.identify(user.id, {
        email: user.email,
        username: user.user_metadata?.username as string | undefined,
        name: user.user_metadata?.full_name as string | undefined,
        bluesky_handle: user.user_metadata?.bluesky_handle as
          | string
          | undefined,
      });
    } else {
      ph.reset();
    }
  }, [ph, user, isAuthenticated]);

  // Disable session replay during impersonation
  useEffect(() => {
    if (!ph) return;

    if (isImpersonating) {
      ph.stopSessionRecording();
      ph.register({ $impersonated: true });
    } else {
      ph.unregister("$impersonated");
      // Session recording restarts automatically on next page load
    }
  }, [ph, isImpersonating]);

  return null;
}

interface PostHogProviderProps {
  children: ReactNode;
  isImpersonating?: boolean;
}

export function PostHogProvider({
  children,
  isImpersonating = false,
}: PostHogProviderProps) {
  useEffect(() => {
    initPostHog();

    // Apply initial consent state
    const consent = getConsentStatus();
    if (consent === "granted") {
      posthog.opt_in_capturing();
    }

    // Listen for consent changes from the cookie banner
    function handleConsentChange(e: Event) {
      const status = (e as CustomEvent<string>).detail;
      if (status === "granted") {
        posthog.opt_in_capturing();
      } else {
        posthog.opt_out_capturing();
      }
    }

    window.addEventListener("consent-change", handleConsentChange);
    return () => {
      window.removeEventListener("consent-change", handleConsentChange);
    };
  }, []);

  return (
    <PHProvider client={posthog}>
      <PostHogAuthSync isImpersonating={isImpersonating} />
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PHProvider>
  );
}
```

**Step 2: Verify the file compiles**

Run: `cd /Users/beanie/source/trainers.gg && pnpm --filter @trainers/web typecheck`
Expected: No new type errors

**Step 3: Commit**

```bash
git add apps/web/src/lib/posthog/posthog-provider.tsx
git commit -m "feat: add PostHog provider with consent gating and user identification"
```

---

### Task 7: Integrate PostHog into the provider chain and layout

**Files:**
- Modify: `apps/web/src/components/providers.tsx` — add PostHogProvider + CookieConsent
- Modify: `apps/web/src/app/layout.tsx` — pass impersonation state to Providers

**Step 1: Update providers.tsx**

Add imports and nest `PostHogProvider` + `CookieConsent` in the provider chain. PostHogProvider goes after AuthProvider (needs auth context) and before ThemeProvider.

In `apps/web/src/components/providers.tsx`:

1. Add imports at top:
```typescript
import { PostHogProvider } from "@/lib/posthog/posthog-provider";
import { CookieConsent } from "@/components/cookie-consent";
```

2. Add `isImpersonating` prop to `Providers`:
```typescript
interface ProvidersProps {
  children: ReactNode;
  isImpersonating?: boolean;
}

export function Providers({ children, isImpersonating = false }: ProvidersProps) {
```

3. Update the JSX to nest PostHogProvider after AuthProvider:
```typescript
return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PostHogProvider isImpersonating={isImpersonating}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <CookieConsent />
        </ThemeProvider>
      </PostHogProvider>
    </AuthProvider>
  </QueryClientProvider>
);
```

**Step 2: Update layout.tsx to pass impersonation state**

In `apps/web/src/app/layout.tsx`:

1. Add import:
```typescript
import { isImpersonating as checkImpersonating } from "@/lib/impersonation/server";
```

2. Make the layout async and check impersonation:
```typescript
export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const impersonating = await checkImpersonating();
```

3. Pass to Providers:
```typescript
<Providers isImpersonating={impersonating}>
```

Note: The layout is already a Server Component (no "use client"), so calling the async server function is fine.

**Step 3: Verify the app compiles**

Run: `cd /Users/beanie/source/trainers.gg && pnpm --filter @trainers/web typecheck`
Expected: No new type errors

**Step 4: Commit**

```bash
git add apps/web/src/components/providers.tsx apps/web/src/app/layout.tsx
git commit -m "feat: integrate PostHog provider and cookie consent into app"
```

---

### Task 8: Write tests

**Files:**
- Create: `apps/web/src/__tests__/components/cookie-consent.test.tsx`
- Create: `apps/web/src/__tests__/lib/posthog/client.test.ts`

**Step 1: Write cookie consent tests**

Create `apps/web/src/__tests__/components/cookie-consent.test.tsx`:

```typescript
import { getConsentStatus, setConsentStatus } from "@/components/cookie-consent";

describe("cookie consent", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getConsentStatus", () => {
    it.each([
      ["granted", "granted"],
      ["denied", "denied"],
      [null, "undecided"],
      ["invalid", "undecided"],
    ] as const)(
      "returns %s when localStorage value is %s",
      (stored, expected) => {
        if (stored) localStorage.setItem("cookie-consent", stored);
        expect(getConsentStatus()).toBe(expected);
      }
    );
  });

  describe("setConsentStatus", () => {
    it("stores the status in localStorage and dispatches event", () => {
      const handler = jest.fn();
      window.addEventListener("consent-change", handler);

      setConsentStatus("granted");

      expect(localStorage.getItem("cookie-consent")).toBe("granted");
      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0][0] as CustomEvent).detail).toBe(
        "granted"
      );

      window.removeEventListener("consent-change", handler);
    });
  });
});
```

**Step 2: Write PostHog client tests**

Create `apps/web/src/__tests__/lib/posthog/client.test.ts`:

```typescript
import { captureException } from "@/lib/posthog/client";

// Mock posthog-js
jest.mock("posthog-js", () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    capture: jest.fn(),
    __loaded: true,
  },
}));

import posthog from "posthog-js";

describe("captureException", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("captures Error instances with stack trace", () => {
    const error = new Error("test error");
    error.name = "TypeError";

    captureException(error);

    expect(posthog.capture).toHaveBeenCalledWith("$exception", {
      $exception_message: "test error",
      $exception_type: "TypeError",
      $exception_stack_trace_raw: error.stack,
    });
  });

  it("captures non-Error values as strings", () => {
    captureException("string error");

    expect(posthog.capture).toHaveBeenCalledWith("$exception", {
      $exception_message: "string error",
    });
  });

  it("does nothing when posthog is not loaded", () => {
    (posthog as unknown as { __loaded: boolean }).__loaded = false;

    captureException(new Error("test"));

    expect(posthog.capture).not.toHaveBeenCalled();

    (posthog as unknown as { __loaded: boolean }).__loaded = true;
  });
});
```

**Step 3: Run the tests**

Run: `cd /Users/beanie/source/trainers.gg && pnpm --filter @trainers/web test -- --testPathPattern="cookie-consent|posthog/client" --no-coverage`
Expected: All tests pass

**Step 4: Commit**

```bash
git add apps/web/src/__tests__/components/cookie-consent.test.tsx apps/web/src/__tests__/lib/posthog/client.test.ts
git commit -m "test: add cookie consent and PostHog client tests"
```

---

### Task 9: Verify full build and typecheck

**Files:** None (verification only)

**Step 1: Run typecheck**

Run: `cd /Users/beanie/source/trainers.gg && pnpm --filter @trainers/web typecheck`
Expected: No type errors

**Step 2: Run lint**

Run: `cd /Users/beanie/source/trainers.gg && pnpm --filter @trainers/web lint`
Expected: No lint errors (or only pre-existing ones)

**Step 3: Run all tests**

Run: `cd /Users/beanie/source/trainers.gg && pnpm --filter @trainers/web test --no-coverage`
Expected: All tests pass

**Step 4: Run build**

Run: `cd /Users/beanie/source/trainers.gg && pnpm --filter @trainers/web build`
Expected: Build succeeds

Note: PostHog won't actually initialize in dev/build without the env vars (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`). The `initPostHog()` function returns early if they're missing. It will activate on Vercel once the env vars are set.

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Install posthog-js | package.json |
| 2 | Add env vars | turbo.json, .env.example |
| 3 | PostHog client singleton | src/lib/posthog/client.ts |
| 4 | Pageview tracking component | src/lib/posthog/posthog-pageview.tsx |
| 5 | Cookie consent banner | src/components/cookie-consent.tsx |
| 6 | PostHog provider | src/lib/posthog/posthog-provider.tsx |
| 7 | Integrate into provider chain + layout | providers.tsx, layout.tsx |
| 8 | Tests | cookie-consent.test.tsx, client.test.ts |
| 9 | Verify build | N/A |

## Post-Deployment

After merging and deploying:
1. Set `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` in Vercel environment variables
2. Verify events appear in the PostHog dashboard
3. Enable session replay and surveys in the PostHog project settings
