---
name: auditing-mobile-responsiveness
description: Use when auditing dashboard or public pages for phone-viewport bugs — overflow, tap targets, broken table layouts, drag-and-drop UX. Walks every URL at 393×852, runs overflow + tap-target probes, and produces a per-page punch list.
---

# Auditing Mobile Responsiveness

The `feat/dashboard-mobile-responsiveness` pass found two table-overflow regressions in pages that weren't on the original audit list (`/dashboard/alts/[username]/teams` and `/dashboard/alts/[username]/teams/[teamId]`). They were missed because the test user lacked the team-builder feature flag, so my static audit didn't visit them. This skill exists so the next audit doesn't repeat the mistake.

The authoring-time companion is the `mobile-responsiveness` rule (auto-loads on `apps/web/src/**/*.tsx`).

## When to invoke

- Reviewing a PR that touches dashboard / public-facing routes for mobile parity
- Working through a "make X mobile responsive" ticket
- Smoke-testing a release candidate before tagging it
- Triaging "this page is broken on my phone" reports

Skip for: API routes, edge functions, any change that doesn't render UI.

If you're editing or creating skill docs under `.claude/skills/*` (including this one), invoke `writing-skills` first for the conventions.

## The audit, end to end

### 1 — Enumerate URLs by walking the route tree, not by reading imports

The audit must hit every URL a real user can reach, not just the ones a test login can see.

```bash
# Every route file
find apps/web/src/app -name "page.tsx" -not -path "*/node_modules/*"

# Then for each route with a dynamic segment, ask: what's a valid concrete URL?
# Use seed data from packages/supabase/supabase/seeds/ to find slugs/usernames/ids.
```

Don't drop a route from scope because your test user can't see it. Either:

- Use a more privileged user (`admin@trainers.local` has site-admin + community-owner; covers most flags)
- Mock the access check at the audit boundary (toggle the feature flag in the seed migration)
- Or carve it out explicitly with `scope: requires <flag>` so it gets re-audited later

### 2 — Get a dev server and a Playwright session

```bash
# In one terminal
pnpm dev

# Then via Playwright MCP
browser_resize { width: 393, height: 852 }     # iPhone 14 Pro
browser_navigate { url: "http://localhost:3000/sign-in" }
# Sign in as admin — see CLAUDE.md "Test Users" for credentials
```

Default to **393×852** as the primary mobile viewport. Add **360×800** when you find a borderline overflow (cramped Android), and **768×1024** when checking the breakpoint flip.

### 3 — Two probes, run on every page

After navigating, take a screenshot and run two evals.

```js
// Page-level overflow
() => ({
  scrollW: document.documentElement.scrollWidth,
  innerW: window.innerWidth,
  overflow: document.documentElement.scrollWidth > window.innerWidth,
  // Largest overflowing children (>100px wide)
  offenders: [...document.querySelectorAll("*")]
    .filter(el => el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 100)
    .map(el => ({
      tag: el.tagName.toLowerCase(),
      class: (el.className || "").toString().slice(0, 80),
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
    }))
    .slice(0, 10),
})

// Sub-40px tap targets — cache the rect once per element to avoid repeated layout reads
() => [...document.querySelectorAll("button,a,[role=button]")]
  .map(el => ({ el, r: el.getBoundingClientRect() }))
  .filter(({ r }) => r.width && r.height && (r.width < 40 || r.height < 40))
  .map(({ el, r }) => ({
    tag: el.tagName.toLowerCase(),
    text: (el.textContent || el.getAttribute("aria-label") || "").slice(0, 30).trim(),
    w: Math.round(r.width),
    h: Math.round(r.height),
  }))
```

### 4 — Eyes-on the screenshot — visual tells

Static probes catch most issues but not all. Look for these visual patterns:

- **"Floating content"** — content sits in a narrow band with unused space on either side. The page has a fixed-width container, a desktop-only multi-column layout that didn't collapse, OR you're seeing a page wider than the viewport with horizontal scroll. Check `scrollWidth` vs `innerWidth` first; if they're equal, look for `min-w-*` / fixed `w-[Npx]` on a parent.
- **Cramped 4-column stat strips** — 4 cells of ~21px each on a 375px viewport, labels truncating. Check the `grid-cols-*` value (must collapse to 2 or 1 on phones).
- **Filter pill rows clipped right** — the row is 391px wide in a 393px viewport, with the rightmost pill half-cut. Needs `overflow-x-auto`.
- **Drag-and-drop UX with stacked columns** — copy that says "Drag X between columns" while the columns are stacked vertically. Needs a tap-to-X mobile path.
- **Dialog content running edge-to-edge** — dialog hits viewport-edge with no padding, or scroll is needed to see the close button. Needs `max-w-[calc(100vw-2rem)]` clamp.

### 5 — Catalogue findings by severity

```text
Critical  — blocks usability (page-level overflow; broken drag-only UX; tap target <30px)
Important — degrades experience but works (cramped grid; tap target 30–39px on infrequent action)
Polish    — nice-to-have (text-size bump on small cards; padding tightening)
```

For each: file path with line number, what's wrong, the concrete fix (matching the patterns in the `mobile-responsiveness` rule).

### 6 — Fix in waves, parallel where independent

The plan format that worked for the 2026-04 dashboard pass:

- **Wave 1** — table → cards swaps, one per page, fully parallelizable. Each gets a `<Page>Cards` mobile component, conditional mount in the wrapper, behavioral tests for the cards path, and a `describe("conditional mount")` block in the existing wrapper test.
- **Wave 2** — drag-and-drop pages that need a mobile alternative. Single agent (state is coupled).
- **Wave 3** — sweeps: dialog/sheet sizing, tap targets, fixed-width selects + filter pills. Three parallel agents, disjoint file allowlists.
- **Wave 4** — polish: grid collapses, header truncation, padding/text-size tweaks. Single agent.
- **Wave 5** — review + verification.

When dispatching subagents for the implementation waves, use `model: "sonnet"` (Sonnet 4.6 1M) and the **mechanical-prompt format** — literal new file content inline, "execute these specific Write/Edit calls", **not** open-ended task descriptions. Open prompts trigger the agent's auto-plan-then-pause workflow and get stuck waiting for SendMessage approval.

### 7 — Pre-merge verification

Before declaring "done":

1. Re-run both probes on every touched page at 393×852. Both must come back empty.
2. Spot-check at 360×800 (cramped Android).
3. Spot-check at 768×1024 (boundary flip — desktop layout should re-emerge).
4. `pnpm lint && pnpm typecheck && pnpm test` — all green.
5. `pnpm test:e2e` — all green (or note explicitly why it was skipped, e.g. dev-server not available).
6. Test that drag UI on desktop still works for any page where mobile got a tap-to-X alternative.
7. Open the PR with before/after screenshots at 393px for each touched page.

## Common gotchas

- **`useIsMobile()` crashes in tests without the matchMedia polyfill.** It's in `apps/web/src/test-setup.ts` — don't remove it.
- **CSS `hidden md:block` mounts both variants.** Doubles data fetches, breaks a11y, doubles keyboard targets. Use `useIsMobile()` conditional mount instead.
- **Skeleton height must derive from row count.** Otherwise the layout snaps when the real component mounts.
- **Drag UI on staff page** can't be made responsive by CSS alone — columns stack vertically and dragging is broken. Mobile must have a separate component (DropdownMenu / Sheet picker).
- **Gated pages (feature flags, paid tiers) get missed** if you audit only as your default test user. Use the admin login or grant the flag in the seed migration.
- **Don't run repo-wide `pnpm format`** during the audit — it'll churn unrelated files. Format only the files in your allowlist.

## Where the patterns live

- `useIsMobile` — `apps/web/src/hooks/use-mobile.tsx`
- `useIsClient` — `apps/web/src/hooks/use-is-client.ts`
- Reference cards/table pair — `apps/web/src/app/(dashboard)/dashboard/components/{alts-cards,alts-table}.tsx` and the mount site in `home-client.tsx`
- Reference shared helpers — `apps/web/src/app/(dashboard)/dashboard/tournaments/tournament-row-helpers.tsx`
- Reference drag/tap split — `apps/web/src/app/(dashboard)/dashboard/community/[communitySlug]/staff/staff-client.tsx`
- matchMedia polyfill — `apps/web/src/test-setup.ts`

## Related skills/rules

- `mobile-responsiveness` (rule, auto-loads on web TSX) — authoring-time patterns
- `creating-components` — UI component conventions
- `design-system` — elevation, typography, layout
- `building-web-app` — routes, Server Actions, data fetching
- `writing-tests` — Fishery factories, mocks, Jest config
