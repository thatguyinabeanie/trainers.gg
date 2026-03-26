# Hero Page — Journey Narrative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current feature card grid + coming-soon cards on the hero page with a 7-step journey narrative that highlights trainers.gg's unique differentiators for competitive players.

**Architecture:** A single new `JourneySteps` component renders all 7 steps using a shared `JourneyStep` layout wrapper (alternating left/right). All step preview panels are static, hardcoded JSX — no live data. The secondary CTA in `HeroCTA` is updated from "Browse Tournaments" → "Explore Players". The old `FeatureCards`, `ComingSoonCards`, and `AnalyticsCardLink` components are deleted since they are fully replaced.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui (`StatusBadge`), Jest + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-03-25-hero-page-journey-narrative-design.md`

---

## File Map

| Action | Path |
|--------|------|
| **Modify** | `apps/web/src/components/landing/hero-cta.tsx` |
| **Modify** | `apps/web/src/components/landing/__tests__/hero-cta.test.tsx` |
| **Create** | `apps/web/src/components/landing/journey-steps.tsx` |
| **Create** | `apps/web/src/components/landing/__tests__/journey-steps.test.tsx` |
| **Modify** | `apps/web/src/app/page.tsx` |
| **Delete** | `apps/web/src/components/landing/feature-cards.tsx` |
| **Delete** | `apps/web/src/components/landing/coming-soon-cards.tsx` |
| **Delete** | `apps/web/src/components/landing/analytics-card-link.tsx` |
| **Delete** | `apps/web/src/components/landing/__tests__/feature-cards.test.tsx` |
| **Delete** | `apps/web/src/components/landing/__tests__/coming-soon-cards.test.tsx` |
| **Delete** | `apps/web/src/components/landing/__tests__/analytics-card-link.test.tsx` |

---

## Task 1: Update `HeroCTA` secondary button

The spec requires the secondary CTA to link to `/players` ("Explore Players"), not `/tournaments` ("Browse Tournaments").

**Files:**
- Modify: `apps/web/src/components/landing/hero-cta.tsx`
- Modify: `apps/web/src/components/landing/__tests__/hero-cta.test.tsx`

- [ ] **Step 1: Update the failing test first**

In `hero-cta.test.tsx`, replace the secondary button test:

```tsx
// Replace this test:
it("always renders Browse Tournaments link to /tournaments", () => {
  ...
  const browseLink = screen.getByRole("link", { name: "Browse Tournaments" });
  expect(browseLink).toHaveAttribute("href", "/tournaments");
});

// With:
it("always renders Explore Players link to /players", () => {
  mockUseAuthContext.mockReturnValue({
    isAuthenticated: false,
    loading: false,
    user: null,
    signOut: jest.fn(),
    refetchUser: jest.fn(),
  });

  render(<HeroCTA />);

  const exploreLink = screen.getByRole("link", { name: "Explore Players" });
  expect(exploreLink).toHaveAttribute("href", "/players");
});
```

- [ ] **Step 2: Run test — expect it to fail**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="hero-cta" --no-coverage
```

Expected: FAIL — `Unable to find an accessible element with the role "link" and name "Explore Players"`

- [ ] **Step 3: Update `hero-cta.tsx`**

In `CTAButtons`, change the secondary link:

```tsx
// Before:
<Link
  href="/tournaments"
  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
>
  Browse Tournaments
</Link>

// After:
<Link
  href="/players"
  className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
>
  Explore Players
</Link>
```

- [ ] **Step 4: Run tests — expect them to pass**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="hero-cta" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/landing/hero-cta.tsx \
        apps/web/src/components/landing/__tests__/hero-cta.test.tsx
git commit -m "feat: update hero secondary CTA to Explore Players"
```

---

## Task 2: Write failing tests for `JourneySteps`

**Files:**
- Create: `apps/web/src/components/landing/__tests__/journey-steps.test.tsx`

- [ ] **Step 1: Create the test file**

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
    "Find who's competing — and where they hang out.",
  ])("renders step headline: %s", (headline) => {
    render(<JourneySteps />);
    expect(
      screen.getByRole("heading", { name: headline })
    ).toBeInTheDocument();
  });

  it("renders Coming Soon badges for Build Smarter and Articles steps", () => {
    render(<JourneySteps />);
    const badges = screen.getAllByText("Coming Soon");
    expect(badges).toHaveLength(2);
    badges.forEach((badge) => {
      expect(badge).toHaveAttribute("data-status", "draft");
    });
  });

  it("teases the Discord Server Index in step 07", () => {
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

Expected: FAIL — `Cannot find module '../journey-steps'`

---

## Task 3: Implement `JourneySteps`

**Files:**
- Create: `apps/web/src/components/landing/journey-steps.tsx`

- [ ] **Step 1: Create the component file**

```tsx
// apps/web/src/components/landing/journey-steps.tsx
import { type ReactNode } from "react";
import { StatusBadge } from "@/components/ui/status-badge";

// ---------------------------------------------------------------------------
// Layout wrapper
// ---------------------------------------------------------------------------

interface JourneyStepProps {
  number: number;
  label: string;
  comingSoon?: boolean;
  headline: string;
  description: ReactNode;
  preview: ReactNode;
  reverse?: boolean;
}

function JourneyStep({
  number,
  label,
  comingSoon = false,
  headline,
  description,
  preview,
  reverse = false,
}: JourneyStepProps) {
  const stepLabel = String(number).padStart(2, "0");

  const textContent = (
    <div>
      <p className="text-primary mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest">
        {stepLabel} — {label}
        {comingSoon && <StatusBadge status="draft" label="Coming Soon" />}
      </p>
      <h3 className="mb-3 text-xl font-semibold">{headline}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );

  const previewPanel = (
    <div className="bg-muted/40 rounded-lg p-5 text-sm">{preview}</div>
  );

  return (
    <section className="border-b py-16">
      <div className="mx-auto grid max-w-screen-xl grid-cols-1 items-center gap-12 px-4 md:grid-cols-2">
        {reverse ? (
          <>
            {previewPanel}
            {textContent}
          </>
        ) : (
          <>
            {textContent}
            {previewPanel}
          </>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Step preview panels (static illustrative JSX — no live data)
// ---------------------------------------------------------------------------

function AltsPreview() {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">Your alts</p>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="bg-primary/60 h-5 w-5 rounded-full" />
          <span className="font-medium">VGC_Main</span>
          <span className="text-muted-foreground text-xs">🌐 Public</span>
        </div>
        <div className="border-muted ml-3 space-y-1 border-l-2 pl-3">
          <div className="bg-background flex justify-between rounded px-2 py-1">
            <span>Trick Room Sun</span>
            <span className="text-xs text-green-500">🌐</span>
          </div>
          <div className="bg-background flex justify-between rounded px-2 py-1">
            <span>Rain Balance</span>
            <span className="text-muted-foreground text-xs">🔒</span>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="bg-muted h-5 w-5 rounded-full" />
          <span className="font-medium">ScoutAlt</span>
          <span className="text-muted-foreground text-xs">🔒 Private</span>
        </div>
        <div className="border-muted ml-3 border-l-2 pl-3">
          <div className="bg-background flex justify-between rounded px-2 py-1">
            <span>Hyper Offense WIP</span>
            <span className="text-muted-foreground text-xs">🔒</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamsPreview() {
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">VGC_Main&apos;s teams</p>
      <div className="bg-background flex items-center justify-between rounded px-3 py-2">
        <div>
          <p className="font-medium">Rain Balance</p>
          <p className="text-muted-foreground text-xs">
            Regulation H · Not yet played
          </p>
        </div>
        <span className="bg-muted rounded px-2 py-0.5 text-xs">🔒 Private</span>
      </div>
      <div className="bg-background flex items-center justify-between rounded px-3 py-2">
        <div>
          <p className="font-medium">Trick Room Sun</p>
          <p className="text-muted-foreground text-xs">Spring Cup 2026 · 6-2</p>
        </div>
        <span className="rounded bg-green-950 px-2 py-0.5 text-xs text-green-400">
          🌐 Public
        </span>
      </div>
    </div>
  );
}

function MetaPreview() {
  const mons = [
    { name: "Miraidon", pct: 41 },
    { name: "Tornadus", pct: 34 },
    { name: "Incineroar", pct: 29 },
  ] as const;

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Meta snapshot · Regulation H
      </p>
      {mons.map(({ name, pct }) => (
        <div key={name} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{name}</span>
            <span className="text-primary">{pct}%</span>
          </div>
          <div className="bg-muted h-1 rounded">
            <div
              className="bg-primary h-1 rounded"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ))}
      <div className="border-amber-500/20 bg-amber-500/10 mt-2 rounded border px-3 py-2 text-xs text-amber-500">
        🔜 Regionals data integration coming soon
      </div>
    </div>
  );
}

function PairingsPreview() {
  const pairs = [
    { a: "ash_ketchum", b: "misty_cerulean" },
    { a: "gary_oak", b: "brock_pewter" },
  ] as const;

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">Round 3 pairings</p>
      {pairs.map(({ a, b }) => (
        <div
          key={a}
          className="bg-background flex items-center justify-between rounded px-3 py-2 text-xs"
        >
          <span className="text-primary font-medium">{a}</span>
          <span className="text-muted-foreground">vs</span>
          <span>{b}</span>
        </div>
      ))}
    </div>
  );
}

function ProfilePreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="bg-primary/60 h-8 w-8 rounded-full" />
        <div>
          <p className="font-medium">ash_ketchum</p>
          <p className="text-muted-foreground text-xs">@ash.trainers.gg</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { value: "24", label: "Tournaments" },
          { value: "71%", label: "Win rate" },
          { value: "3", label: "Articles" },
        ].map(({ value, label }) => (
          <div key={label} className="bg-background rounded p-2">
            <p className="text-primary font-semibold">{value}</p>
            <p className="text-muted-foreground text-xs">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArticlesPreview() {
  const articles = [
    {
      title: "How I built my Spring Cup team",
      author: "ash_ketchum",
      reads: "847 reads",
    },
    {
      title: "VGC 2026 Regulation H tier list",
      author: "cynthia",
      reads: "2.1k reads",
    },
  ] as const;

  return (
    <div className="space-y-2">
      {articles.map(({ title, author, reads }) => (
        <div key={title} className="bg-background rounded px-3 py-2">
          <p className="font-medium">{title}</p>
          <p className="text-muted-foreground text-xs">
            by {author} · {reads}
          </p>
        </div>
      ))}
    </div>
  );
}

function CommunityPreview() {
  const players = [
    { name: "cynthia", detail: "Sinnoh · 89% WR", rank: "#1" },
    { name: "lance", detail: "Johto · 81% WR", rank: "#2" },
  ] as const;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {players.map(({ name, detail, rank }) => (
          <div
            key={name}
            className="bg-background flex items-center gap-2 rounded px-3 py-2 text-xs"
          >
            <div className="bg-muted h-5 w-5 flex-shrink-0 rounded-full" />
            <span className="flex-1">
              <span className="font-medium">{name}</span>{" "}
              <span className="text-muted-foreground">{detail}</span>
            </span>
            <span className="text-primary">{rank}</span>
          </div>
        ))}
      </div>
      <div className="border-amber-500/20 bg-amber-500/10 rounded border px-3 py-2 text-xs">
        <p className="font-semibold text-amber-500">🔜 Discord Server Index</p>
        <p className="text-muted-foreground mt-0.5">
          Find competitive Pokémon communities — all in one place
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function JourneySteps() {
  return (
    <div>
      <JourneyStep
        number={1}
        label="Identity"
        headline="One account. Every version of yourself."
        description="Create multiple alts and compete under any name — public or private, your choice. Each alt has its own teams, stats, and tournament history, so your strategies stay organized no matter how many identities you run. No juggling accounts."
        preview={<AltsPreview />}
      />
      <JourneyStep
        number={2}
        label="Teams"
        headline="Your strategies stay secret until you play them."
        description="Teams are private by default. They only go public once you've played them in a tournament — no meta leaks, no early reveals, no accidental scouting."
        preview={<TeamsPreview />}
        reverse
      />
      <JourneyStep
        number={3}
        label="Build Smarter"
        comingSoon
        headline="Build with the meta, not against it."
        description={
          <>
            The team builder surfaces what&apos;s actually working — usage
            rates, win rates, and popular cores drawn from publicly played
            tournament teams on trainers.gg.{" "}
            <span className="text-foreground">Coming soon:</span> full analytics
            including data from official regionals.
          </>
        }
        preview={<MetaPreview />}
      />
      <JourneyStep
        number={4}
        label="Compete"
        headline="Run events built for competitive Pokémon."
        description="Organize tournaments with Swiss pairings, automatic standings, and bracket play. Players get results tracked to their profile automatically — no manual record keeping."
        preview={<PairingsPreview />}
        reverse
      />
      <JourneyStep
        number={5}
        label="Profile"
        headline="Your competitive story, one link."
        description="Every tournament, team, and result lives on your public profile. Share it with organizers, teammates, or opponents — one link that shows exactly how you play."
        preview={<ProfilePreview />}
      />
      <JourneyStep
        number={6}
        label="Articles"
        comingSoon
        headline="Write. Share. Remember."
        description="Anyone can publish guides, team reports, and tournament recaps. Use articles as private notes for your own team, or share insights with the whole community."
        preview={<ArticlesPreview />}
        reverse
      />
      <JourneyStep
        number={7}
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
      />
    </div>
  );
}
```

- [ ] **Step 2: Run tests — expect them to pass**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="journey-steps" --no-coverage
```

Expected: PASS (7 headline tests + 2 coming soon badges + Discord callout + regionals callout)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/landing/journey-steps.tsx \
        apps/web/src/components/landing/__tests__/journey-steps.test.tsx
git commit -m "feat: add JourneySteps component with 7-step hero narrative"
```

---

## Task 4: Update `page.tsx`

**Files:**
- Modify: `apps/web/src/app/page.tsx`

- [ ] **Step 1: Replace the file**

```tsx
// apps/web/src/app/page.tsx
import { type Metadata } from "next";
import { Suspense } from "react";
import { HeroCTA } from "@/components/landing/hero-cta";
import { JourneySteps } from "@/components/landing/journey-steps";
import { UpcomingTournamentsPreview } from "@/components/landing/upcoming-tournaments-preview";
import { UpcomingTournamentsSkeleton } from "@/components/landing/upcoming-tournaments-skeleton";

export const revalidate = false;

export const metadata: Metadata = {
  title: "trainers.gg — Your home for competitive Pokemon",
  description:
    "Build your competitive identity, manage multiple alts, keep your teams secret, and connect with players who take the game as seriously as you do.",
  openGraph: {
    title: "trainers.gg — Your home for competitive Pokemon",
    description:
      "Build your competitive identity, manage multiple alts, and connect with the Pokemon VGC community.",
    siteName: "trainers.gg",
  },
};

export default function HomePage() {
  return (
    <div>
      {/* Hero Banner */}
      <section className="bg-primary/5 py-20 sm:py-28">
        <div className="mx-auto max-w-screen-xl px-4 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Your home for competitive Pokémon
          </h1>
          <p className="text-muted-foreground mx-auto mb-8 max-w-xl text-lg">
            Build your competitive identity, keep your strategies secret, and
            connect with players who take the game as seriously as you do.
          </p>
          <HeroCTA />
        </div>
      </section>

      {/* Journey Steps */}
      <JourneySteps />

      {/* Live Upcoming Tournaments */}
      <Suspense fallback={<UpcomingTournamentsSkeleton />}>
        <UpcomingTournamentsPreview />
      </Suspense>

      {/* Closing CTA */}
      <section className="bg-primary/5 py-16">
        <div className="mx-auto max-w-screen-xl px-4 text-center">
          <h2 className="mb-4 text-2xl font-semibold">
            Ready to build your competitive identity?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join trainers.gg and start your journey.
          </p>
          <HeroCTA />
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Run landing tests to confirm no regressions**

```bash
pnpm test --filter @trainers/web -- --testPathPattern="landing" --no-coverage
```

Expected: all PASS (hero-cta, upcoming-tournaments-preview, journey-steps, plus old component tests which still exist)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat: wire journey narrative into hero page, update metadata and CTAs"
```

---

## Task 5: Delete replaced components and their tests

**Files:**
- Delete: `apps/web/src/components/landing/feature-cards.tsx`
- Delete: `apps/web/src/components/landing/coming-soon-cards.tsx`
- Delete: `apps/web/src/components/landing/analytics-card-link.tsx`
- Delete: `apps/web/src/components/landing/__tests__/feature-cards.test.tsx`
- Delete: `apps/web/src/components/landing/__tests__/coming-soon-cards.test.tsx`
- Delete: `apps/web/src/components/landing/__tests__/analytics-card-link.test.tsx`

- [ ] **Step 1: Delete the files**

```bash
rm apps/web/src/components/landing/feature-cards.tsx \
   apps/web/src/components/landing/coming-soon-cards.tsx \
   apps/web/src/components/landing/analytics-card-link.tsx \
   apps/web/src/components/landing/__tests__/feature-cards.test.tsx \
   apps/web/src/components/landing/__tests__/coming-soon-cards.test.tsx \
   apps/web/src/components/landing/__tests__/analytics-card-link.test.tsx
```

- [ ] **Step 2: Run typecheck — confirm no dangling imports**

```bash
pnpm typecheck --filter @trainers/web
```

Expected: 0 errors

- [ ] **Step 3: Run full test suite**

```bash
pnpm test --filter @trainers/web -- --no-coverage
```

Expected: all tests PASS

- [ ] **Step 4: Commit**

```bash
git add -A apps/web/src/components/landing/
git commit -m "chore: remove feature-cards, coming-soon-cards, analytics-card-link (replaced by journey steps)"
```

---

## Verification

- [ ] Run `pnpm dev:web` and open `http://localhost:3000`
- [ ] Confirm 7 journey steps render with alternating left/right layout
- [ ] Confirm Steps 03 (Build Smarter) and 06 (Articles) show amber "Coming Soon" badges
- [ ] Confirm Step 07 shows the Discord Server Index callout
- [ ] Confirm Step 03 shows the regionals callout
- [ ] Confirm hero subheading is updated
- [ ] Confirm closing CTA heading reads "Ready to build your competitive identity?" with subheading "Join trainers.gg and start your journey."
- [ ] Confirm secondary CTA button reads "Explore Players" and links to `/players`
- [ ] Check mobile at 375px width — steps stack vertically
- [ ] Run `pnpm lint --filter @trainers/web` — 0 errors
- [ ] Run `pnpm typecheck --filter @trainers/web` — 0 errors
