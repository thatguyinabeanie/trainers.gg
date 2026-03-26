# Hero Page — Coaching Step Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Step 07 — Coaching (Coming Soon) to the hero page journey narrative, renumbering Community from Step 07 to Step 08.

**Architecture:** All changes are confined to `journey-steps.tsx` and its test file. A new `CoachingPreview` static JSX component is added. The existing Community `JourneyStep` is renumbered to 8 and gains `reverse` to maintain the alternating left/right layout (even steps are preview-left/text-right). No live data — the preview is hardcoded illustrative JSX.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui (`StatusBadge`), Jest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-03-25-hero-page-journey-narrative-design.md` (Step 07 — Coaching section)

**Branch:** `feat/hero-journey-narrative`

---

## File Map

| Action | Path |
|--------|------|
| **Modify** | `apps/web/src/components/landing/journey-steps.tsx` |
| **Modify** | `apps/web/src/components/landing/__tests__/journey-steps.test.tsx` |

---

## Task 1: Update failing tests

**Files:**
- Modify: `apps/web/src/components/landing/__tests__/journey-steps.test.tsx`

- [ ] **Step 1: Update the test file**

Replace the entire file contents with:

```tsx
// apps/web/src/components/landing/__tests__/journey-steps.test.tsx
import { render, screen } from "@testing-library/react";
import { JourneySteps } from "../journey-steps";

jest.mock("@/components/ui/status-badge", () => ({
  StatusBadge: ({ label, status }: { label?: string; status: string }) => (
    <span data-status={status}>{label ?? status}</span>
  ),
}));

describe("JourneySteps", () => {
  it.each([
    "One account. Every version of yourself.",
    "Your strategies stay secret until you play them.",
    "Build with the meta, not against it.",
    "Run events built for competitive Pokémon.",
    "Your competitive story, one link.",
    "Write. Share. Remember.",
    "Level up with a personal coach.",
    "Find who's competing — and where they hang out.",
  ])("renders step headline: %s", (headline) => {
    render(<JourneySteps />);
    expect(
      screen.getByRole("heading", { name: headline })
    ).toBeInTheDocument();
  });

  it("renders Coming Soon badges for Build Smarter, Articles, and Coaching steps", () => {
    render(<JourneySteps />);
    const badges = screen.getAllByText("Coming Soon");
    expect(badges).toHaveLength(3);
    badges.forEach((badge) => {
      expect(badge).toHaveAttribute("data-status", "draft");
    });
  });

  it("teases the Discord Server Index in step 08", () => {
    render(<JourneySteps />);
    expect(screen.getByText(/Discord Server Index/i)).toBeInTheDocument();
  });

  it("teases regionals data in step 03", () => {
    render(<JourneySteps />);
    expect(screen.getByText(/Regionals data/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — expect them to fail**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="journey-steps" --no-coverage
```

Expected: FAIL — coaching headline not found, badge count is 2 not 3.

---

## Task 2: Implement the coaching step

**Files:**
- Modify: `apps/web/src/components/landing/journey-steps.tsx`

- [ ] **Step 1: Add `CoachingPreview` and insert the coaching `JourneyStep`**

In `journey-steps.tsx`, make two changes:

**Change A — Add `CoachingPreview` function** (place it after `ArticlesPreview`, before `CommunityPreview`):

```tsx
function CoachingPreview() {
  const players = [
    { name: "cynthia", isCoach: true },
    { name: "lance", isCoach: false },
  ] as const;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Coaches</p>
      {players.map(({ name, isCoach }) => (
        <div
          key={name}
          className="bg-background flex items-center gap-2 rounded px-3 py-2 text-xs"
        >
          <div className="bg-muted h-5 w-5 flex-shrink-0 rounded-full" />
          <span className="flex-1 font-medium">{name}</span>
          {isCoach && (
            <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-medium">
              Coach
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
```

**Change B — In `JourneySteps()`, replace the Community step and insert the coaching step before it:**

Find this block (lines 339–352):

```tsx
      <JourneyStep
        number={7}
        label="Community"
        headline="Find who's competing — and where they hang out."
        description={
          <>
            Search players by format, country, or name and browse the
            leaderboard. <span className="text-foreground">Coming soon:</span> a
            searchable index of competitive Pokémon Discord servers — find your
            community in one place.
          </>
        }
        preview={<CommunityPreview />}
      />
```

Replace with:

```tsx
      <JourneyStep
        number={7}
        label="Coaching"
        comingSoon
        headline="Level up with a personal coach."
        description={
          <>
            Coaches are discoverable in the player directory and on their
            profile — identified by a coach badge so you always know who&apos;s
            available to help.{" "}
            <span className="text-foreground">Coming soon:</span> book sessions
            directly, share your teams for session prep without copy-pasting,
            and get personalized guidance from players who know the meta.
          </>
        }
        preview={<CoachingPreview />}
      />
      <JourneyStep
        number={8}
        label="Community"
        headline="Find who's competing — and where they hang out."
        description={
          <>
            Search players by format, country, or name and browse the
            leaderboard.{" "}
            <span className="text-foreground">Coming soon:</span> a searchable
            index of competitive Pokémon Discord servers — find your community
            in one place.
          </>
        }
        preview={<CommunityPreview />}
        reverse
      />
```

Note: Community gains `reverse` because it is now Step 8 (even → preview-left/text-right). Coaching at Step 7 (odd) has no `reverse` (text-left/preview-right).

- [ ] **Step 2: Run tests — expect them to pass**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="journey-steps" --no-coverage
```

Expected: PASS (8 headline tests + 3 coming soon badges + Discord tease + regionals tease = 12 tests)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/landing/journey-steps.tsx \
        apps/web/src/components/landing/__tests__/journey-steps.test.tsx
git commit -m "feat: add coaching step to hero journey narrative (step 07, community moves to 08)"
```

---

## Verification

- [ ] Run `pnpm dev:web` and open `http://localhost:3000`
- [ ] Confirm 8 journey steps render
- [ ] Confirm Step 07 (Coaching) shows amber "Coming Soon" badge and coach badge preview
- [ ] Confirm Step 08 (Community) layout is now preview-left/text-right (flipped from before)
- [ ] Confirm Steps 03, 06, 07 all show Coming Soon badges
- [ ] Run `pnpm lint --filter @trainers/web` — 0 errors
- [ ] Run `pnpm typecheck --filter @trainers/web` — 0 errors
