---
name: writing-e2e-tests
description: Use when writing or modifying Playwright E2E tests, fixtures, auth setup, or tournament-runner scenarios in apps/web/e2e/
---

# Writing E2E Tests

Playwright test suite for the web app. Tests run against a live Vercel preview + Supabase branch in CI, or against a local dev server locally.

## Directory Map

```
apps/web/
  playwright.config.ts           # Playwright config: projects, webServer, reporters
  e2e/
    playwright/.auth/
      player.json                # Saved auth storage state (gitignored)
    fixtures/
      auth.ts                    # TEST_USERS constant + loginViaUI() helper
      sample-teams.ts            # Paste strings for team submission
      tournament-simulator.ts    # Supabase-driven bulk simulator (full-tournament spec)
    tests/
      auth.setup.ts              # Auth setup project — saves player storage state
      auth/                      # Sign-in / sign-out specs
      admin/                     # Admin panel specs
      navigation/                # Nav / routing specs
      onboarding/                # Onboarding flow specs
      tournament/                # Tournament specs (full-tournament, elo-ratings)
      coaching.spec.ts           # Coaching feature spec
      discord-user-settings.spec.ts
    tournament-runner/           # Multi-actor CLI tournament runner (not a Playwright project)
      run.ts                     # Entry point: pnpm test:tournament
      orchestrator.ts            # TournamentOrchestrator class
      host.ts                    # Host-context page actions
      player.ts                  # Player-context page actions
      resolve-actions.ts         # Maps pairings + scenario → RoundAction[]
      types.ts                   # Scenario, TournamentConfig, Pairing, RoundAction, etc.
      index.ts                   # Re-exports
      scenarios/
        swiss-8.ts               # 8-player Swiss, no drops
        swiss-8-drops.ts         # 8-player Swiss with drops/upsets
```

## Auth Setup Pattern

`auth.setup.ts` is a dedicated Playwright **setup project** that runs before all test projects. It performs a real UI login as `player@trainers.local` and writes the session cookies to `e2e/playwright/.auth/player.json`. All tests in the `chromium` project then load that storage state — no login per test needed.

```ts
// playwright.config.ts — two projects
projects: [
  { name: "setup", testMatch: /auth\.setup\.ts/ },
  {
    name: "chromium",
    use: { storageState: storageStatePath },
    dependencies: ["setup"],
  },
];
```

### Seeded Test Users

All test users live in `packages/supabase/supabase/seeds/03_users.sql`. Password is `Password123!` for all.

| Key         | Email                      | Username      | Role                             |
| ----------- | -------------------------- | ------------- | -------------------------------- |
| `admin`     | `admin@trainers.local`     | admin_trainer | Site admin, VGC League org owner |
| `player`    | `player@trainers.local`    | ash_ketchum   | Player, Pallet Town org owner    |
| `champion`  | `champion@trainers.local`  | cynthia       | Player                           |
| `gymLeader` | `gymleader@trainers.local` | brock         | Player                           |

Import from `e2e/fixtures/auth.ts`:

```ts
import { TEST_USERS, loginViaUI } from "../../fixtures/auth";
await loginViaUI(page, TEST_USERS.admin);
```

For tests that need a different user (not the default player storage state), call `loginViaUI()` after setting an empty storage state:

```ts
test.use({ storageState: { cookies: [], origins: [] } });
```

### Preview Seeding

In CI, `auth.setup.ts` calls `POST /api/e2e/seed` with `x-e2e-seed-secret` to create test users on the Supabase branch. A `404` response means the preview is connected to production — the setup aborts immediately to prevent pollution.

## Fixture and Selector Conventions

- Use semantic selectors: `getByRole`, `getByLabel`, `getByText` — avoid `locator('.class-name')` except when the DOM offers no semantic anchor
- Scope to `page.getByRole("main")` when a selector would otherwise match the nav (e.g., `"Sign In"` button exists in both nav and form)
- Import `expect` from `@playwright/test` — never from `vitest` or `jest`
- Use `waitFor({ state: "visible" })` for elements that appear asynchronously after navigation

## Tournament Runner (Multi-Actor CLI)

The tournament runner is a **standalone CLI tool**, not a Playwright test project. It drives a full tournament end-to-end using isolated browser contexts.

```bash
pnpm test:tournament                                  # Default: swiss-8 scenario
pnpm test:tournament -- --scenario swiss-8-drops      # Drops/upsets variant
pnpm test:tournament -- --headed                      # Watch it run
pnpm test:tournament -- --headed --slow-mo 500        # Slow for debugging
```

### Architecture

- **Host context** — one browser context; performs TO actions (create tournament, start/complete rounds, read standings)
- **Player contexts** — one isolated browser context per player; each has its own cookies and auth state
- **Orchestrator** (`TournamentOrchestrator`) — phase-driven: Login → CreateTournament → Register → SubmitTeams → CheckIn → Activate → Rounds
- **Parallel player actions** — each phase calls `Promise.allSettled` across all player contexts
- **Standings assertions** — after each round, `readStandings()` result is compared against `scenario.assertions[].order`

### Adding a New Scenario

1. Create `e2e/tournament-runner/scenarios/your-scenario.ts` implementing `Scenario`
2. Define `config`, `host`, `players`, `strengthOrder`, `overrides`, and `assertions`
3. Register in `run.ts` under `SCENARIOS`
4. Export from `index.ts`

Key `Scenario` fields:

| Field           | Type                   | Purpose                                                      |
| --------------- | ---------------------- | ------------------------------------------------------------ |
| `strengthOrder` | `string[]`             | Strongest → weakest; determines who wins each pairing        |
| `overrides`     | `RoundOverride[]`      | Force a specific outcome for a player in a specific round    |
| `assertions`    | `StandingsAssertion[]` | Verify standings order after a round (`afterRound`, `order`) |

## CI Behavior

E2E tests run **only on PRs** (skipped on push to main). The `e2e-tests` job depends on:

1. `e2e-prepare` — installs/caches Playwright browsers
2. `deploy-preview` — waits for Vercel preview URL and seeds the Supabase branch DB

If `deploy-preview` outputs `branch-db-ready != 'true'`, the entire E2E job is skipped (no production pollution).

CI settings in `playwright.config.ts`:

- `retries: 1` in CI (0 locally)
- `workers: 1` in CI (2 locally)
- `forbidOnly: true` in CI (prevents `test.only` from landing)
- Reporters: GitHub annotations + HTML + JUnit XML (uploaded as artifacts)

## When to Write an E2E Test vs a Jest Unit Test

| Scenario                                             | Use               |
| ---------------------------------------------------- | ----------------- |
| Full user flow (login → action → visible outcome)    | E2E               |
| Multi-actor interaction (host + players)             | Tournament runner |
| UI state after server action (toast, redirect, form) | E2E               |
| Domain logic (pairings, validation, permissions)     | Jest unit         |
| Query/mutation correctness                           | Jest unit         |
| Component rendering rules                            | Jest unit         |

See `writing-tests` skill for Jest unit test conventions, factories, and mocking.
