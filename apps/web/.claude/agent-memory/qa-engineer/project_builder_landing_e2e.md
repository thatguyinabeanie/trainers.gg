---
name: project_builder_landing_e2e
description: localStorage seeding strategy and guest-context setup for builder Phase 1 E2E tests
metadata:
  type: project
---

Builder landing E2E tests (`apps/web/e2e/tests/builder-landing.spec.ts`) cover the Phase 1 local-drafts-only guest flow.

**Key patterns:**

- `test.use({ storageState: { cookies: [], origins: [] } })` at file level — no auth.setup.ts session
- `clearLocalDrafts(page)` helper calls `page.evaluate` to remove `trainersgg.builder.localDrafts.v2` after initial `goto()` gives us the origin context, then `page.reload()` so the component reads clean state
- For multi-named-draft tests, seed localStorage directly via `page.evaluate` instead of double navigate-and-create (more reliable in CI)
- DropdownMenu trigger: `getByRole("button", { name: /team options/i })` — the aria-label on `DropdownMenuTrigger` in `team-row.tsx`
- Row scoping for multi-draft delete: `main.locator("div.group", { has: main.getByText("Team Alpha") })` — TeamRow renders `div.group` as the outer container

**Why:** LocalBuilderWorkspace redirects to /builder only when draft is missing after hydration. Deep-link reload test verifies the draft persists across page.reload().
