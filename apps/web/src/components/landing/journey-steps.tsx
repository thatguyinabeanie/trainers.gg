// apps/web/src/components/landing/journey-steps.tsx
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
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
      <p className="text-primary mb-2 flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
        {stepLabel} — {label}
        {comingSoon && <StatusBadge status="draft" label="Coming Soon" />}
      </p>
      <h2 className="mb-3 text-xl font-semibold">{headline}</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );

  const previewPanel = (
    <div className="bg-muted/40 rounded-lg p-5 text-sm">{preview}</div>
  );

  return (
    <section className={cn("py-16", number % 2 === 0 && "bg-muted/30")}>
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
      <div className="mt-2 rounded bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
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
          className="bg-background flex items-center rounded px-3 py-2 text-xs"
        >
          <span className="text-primary flex-1 font-medium">{a}</span>
          <span className="text-muted-foreground shrink-0 px-3 text-center">
            vs
          </span>
          <span className="flex-1 text-right">{b}</span>
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

function CommunityPreview() {
  const communities = [
    { name: "Pallet Town VGC", members: "2.4k", tag: "VGC" },
    { name: "Smogon OU Hub", members: "8.1k", tag: "Smogon" },
  ] as const;

  return (
    <div className="space-y-2">
      {communities.map(({ name, members, tag }) => (
        <div
          key={name}
          className="bg-background flex items-center gap-2 rounded px-3 py-2 text-xs"
        >
          <div className="bg-muted h-6 w-6 flex-shrink-0 rounded-full" />
          <div className="flex-1">
            <span className="font-medium">{name}</span>
            <span className="text-muted-foreground ml-1">{members}</span>
          </div>
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-medium">
            {tag}
          </span>
        </div>
      ))}
      <div className="bg-primary/5 flex items-center gap-2 rounded px-3 py-2 text-xs">
        <svg
          className="text-primary h-4 w-4 shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
        </svg>
        <span className="text-primary font-semibold">Discord Server Index</span>
        <span className="text-muted-foreground ml-auto">Browse all →</span>
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
            leaderboard. Explore a searchable index of competitive Pokémon
            Discord servers — find your community in one place.
          </>
        }
        preview={<CommunityPreview />}
        reverse
      />
    </div>
  );
}
