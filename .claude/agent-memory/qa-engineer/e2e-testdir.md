---
name: e2e-testdir
description: Playwright testDir is ./e2e/tests (relative to apps/web) — new specs must go inside that directory, not apps/web/e2e/ root
metadata:
  type: feedback
---

The `playwright.config.ts` in `apps/web/` sets `testDir: "./e2e/tests"`. Specs placed at `apps/web/e2e/*.spec.ts` are outside the testDir and will NOT be collected by the runner.

**Why:** The task brief said `apps/web/e2e/coaching.spec.ts` but that path is wrong — Playwright silently ignores it. All existing specs live under `e2e/tests/{admin,navigation,tournament}/`.

**How to apply:** Always check `playwright.config.ts` testDir before creating a new E2E spec. New specs go in `apps/web/e2e/tests/<feature>.spec.ts` or `apps/web/e2e/tests/<area>/<feature>.spec.ts`.
