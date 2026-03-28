import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Bento card wrapper
// ---------------------------------------------------------------------------

interface BentoCardProps {
  step: string;
  label: string;
  headline: string;
  description: ReactNode;
  preview: ReactNode;
  className?: string;
}

function BentoCard({
  step,
  label,
  headline,
  description,
  preview,
  className,
}: BentoCardProps) {
  return (
    <div
      className={cn(
        "bg-muted/60 rounded-xl p-6",
        "dark:bg-[#1a1f2e]",
        className
      )}
    >
      <p className="text-primary/60 font-mono text-[10px] font-medium tracking-[3px] uppercase">
        {step} — {label}
      </p>
      <h3 className="text-foreground mt-3 text-lg font-extrabold tracking-tight sm:text-xl">
        {headline}
      </h3>
      <p className="text-muted-foreground mt-1.5 text-[11px] leading-relaxed">
        {description}
      </p>
      <div className="bg-background/60 mt-3 rounded-md p-2.5 text-[11px] dark:bg-black/30">
        {preview}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview panels (static illustrative JSX)
// ---------------------------------------------------------------------------

function AltsPreview() {
  const alts = [
    { name: "thatguyinabeanie", elo: "1124", gxe: "52.3", public: true },
    { name: "AdamantBeanie", elo: "1089", gxe: "49.7", public: true },
    { name: "CalmBeanie", elo: "1042", gxe: "47.1", public: false },
    { name: "ModestBeanie", elo: "1003", gxe: "44.8", public: false },
  ] as const;

  return (
    <>
      <div className="space-y-0">
        {alts.map(({ name, elo, gxe, public: isPublic }) => (
          <div
            key={name}
            className="flex items-center gap-2 border-b border-border/40 py-1.5 last:border-0"
          >
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                isPublic ? "bg-green-500" : "bg-amber-500"
              )}
            />
            <span className="text-foreground text-[11px] font-semibold">
              {name}
            </span>
            <span className="text-muted-foreground ml-auto font-mono text-[10px]">
              {elo} ELO · {gxe} GXE
            </span>
          </div>
        ))}
      </div>
      <div className="text-muted-foreground mt-2 flex items-center gap-3 border-t border-border/40 pt-2 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-green-500" /> Public
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-amber-500" /> Anonymous
        </span>
        <span className="text-muted-foreground/60 ml-auto italic">
          Making an alt public is permanent.
        </span>
      </div>
    </>
  );
}

function ProfilePreview() {
  return (
    <>
      {/* Rich profile card */}
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="bg-primary/40 size-8 shrink-0 rounded-full" />
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-foreground text-[11px] font-semibold">
              thatguyinabeanie
            </p>
            <span className="text-[10px]">🇺🇸</span>
          </div>
          <p className="text-muted-foreground text-[9px]">
            @thatguyinabeanie.trainers.gg
          </p>
        </div>
      </div>

      {/* Format badges */}
      <div className="mb-2.5 flex flex-wrap gap-1">
        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[9px] font-medium">
          VGC Reg H
        </span>
        <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[9px] font-medium">
          Smogon OU
        </span>
      </div>

      {/* Stats row */}
      <div className="mb-2.5 flex gap-2">
        <div className="flex-1 text-center">
          <p className="text-primary font-mono text-base font-extrabold">
            1124
          </p>
          <p className="text-muted-foreground text-[8px] tracking-[1px] uppercase">
            ELO
          </p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-primary font-mono text-base font-extrabold">
            52.3
          </p>
          <p className="text-muted-foreground text-[8px] tracking-[1px] uppercase">
            GXE
          </p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-primary font-mono text-base font-extrabold">
            54%
          </p>
          <p className="text-muted-foreground text-[8px] tracking-[1px] uppercase">
            Win rate
          </p>
        </div>
      </div>

      {/* Recent results */}
      <div className="mb-2.5 border-t border-border/40 pt-2">
        <p className="text-muted-foreground mb-1 text-[8px] tracking-[1px] uppercase">
          Recent results
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <div>
              <span className="text-foreground font-medium">Spring Cup 2026</span>
              <span className="text-muted-foreground ml-1 text-[9px]">as AdamantBeanie</span>
            </div>
            <span className="text-primary font-mono font-semibold">1st</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <div>
              <span className="text-foreground font-medium">Weekly #12</span>
              <span className="text-muted-foreground ml-1 text-[9px]">as thatguyinabeanie</span>
            </div>
            <span className="text-muted-foreground font-mono">5th</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <div>
              <span className="text-foreground font-medium">Ladder Series</span>
              <span className="text-muted-foreground ml-1 text-[9px]">as AdamantBeanie</span>
            </div>
            <span className="text-muted-foreground font-mono">3rd</span>
          </div>
        </div>
      </div>

    </>
  );
}

function TeamsPreview() {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <span className="text-foreground text-[10px] font-semibold">
          Rain Balance
        </span>
        <span className="text-[9px] text-amber-500">Private</span>
      </div>
      <div className="flex justify-between">
        <span className="text-foreground text-[10px] font-semibold">
          Trick Room Sun
        </span>
        <span className="text-[9px] text-green-500">Public</span>
      </div>
    </div>
  );
}

function CompetePreview() {
  return (
    <div className="space-y-1 font-mono text-[10px]">
      <div className="text-foreground flex justify-between">
        <span className="text-primary">ash_ketchum</span>
        <span className="text-muted-foreground">vs</span>
        <span>misty_cerulean</span>
      </div>
      <div className="text-foreground flex justify-between">
        <span className="text-primary">gary_oak</span>
        <span className="text-muted-foreground">vs</span>
        <span>brock_pewter</span>
      </div>
    </div>
  );
}

function CommunityPreview() {
  return (
    <div className="flex gap-3">
      <div className="flex-1">
        <p className="text-muted-foreground mb-1 text-[8px] tracking-[1px] uppercase">
          Players
        </p>
        <p className="text-foreground text-[10px]">
          ash_ketchum, cynthia, lance, brock...
        </p>
      </div>
      <div className="flex-1">
        <p className="text-muted-foreground mb-1 text-[8px] tracking-[1px] uppercase">
          Discord Servers
        </p>
        <p className="text-foreground text-[10px]">
          Pallet Town VGC, Smogon OU Hub...
        </p>
      </div>
    </div>
  );
}

const underConstructionItems = [
  {
    emoji: "📊",
    label: "Meta Analytics",
    desc: "Track usage rates, win rates, and popular cores drawn from publicly played tournament teams. See what's working in the current meta before you build.",
  },
  {
    emoji: "⚔️",
    label: "Builder",
    desc: "Build and share teams with current meta analytics at your fingertips. See usage rates, win rates, and popular cores from public tournament data as you build — plus coverage checks and spread insights.",
  },
  {
    emoji: "📝",
    label: "Articles",
    desc: "Publish guides, team reports, and tournament recaps. Use articles as private notes for yourself or share insights with the whole community.",
  },
  {
    emoji: "🎓",
    label: "Coaching",
    desc: "Find coaches in the player directory, identified by a coach badge. Book sessions directly, share teams for prep, and get personalized guidance from players who know the meta.",
  },
] as const;

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function UnderConstruction() {
  return (
    <section className="mx-auto max-w-screen-2xl px-6 py-12 sm:px-10 sm:py-16">
      <div className="mb-8 text-center">
        <p className="text-primary/60 font-mono text-[11px] font-medium tracking-[3px] uppercase">
          Under Construction
        </p>
        <h2 className="text-foreground mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          What we&apos;re building next.
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {underConstructionItems.map(({ emoji, label, desc }) => (
          <div
            key={label}
            className="bg-muted/60 rounded-xl border border-dashed border-primary/20 p-6 dark:bg-[#1a1f2e]"
          >
            <span className="mb-3 block text-2xl">{emoji}</span>
            <h3 className="text-foreground text-base font-bold">{label}</h3>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
              {desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BentoGrid() {
  return (
    <section className="mx-auto max-w-screen-2xl px-6 py-16 sm:px-10 sm:py-20">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
        {/* Row 1: Alts (2-col) + Profile (2-row) */}
        <BentoCard
          step="01"
          label="built-in alts"
          headline="One account. Unlimited identities."
          description="Create alts that each have their own profile, teams, ELO, and tournament history. Anonymous alts can't be traced back to you — they compete in the world with no link to your main account."
          preview={<AltsPreview />}
          className="md:col-span-2 lg:col-span-2"
        />
        <BentoCard
          step="05"
          label="profile"
          headline="Your competitive story, one link."
          description="Public alts appear on your main profile. Anonymous alts get their own standalone page — full history, zero connection to you."
          preview={<ProfilePreview />}
          className="lg:row-span-2"
        />

        {/* Row 2: Teams + Compete */}
        <BentoCard
          step="02"
          label="teams"
          headline="Secret until you play them."
          description="Private by default. Only public once played in a tournament. Stays private even if the alt goes public."
          preview={<TeamsPreview />}
        />
        <BentoCard
          step="04"
          label="compete"
          headline="Swiss, brackets, standings."
          description="Run tournaments with automatic pairings and results tracked to profiles."
          preview={<CompetePreview />}
        />

        {/* Row 3: Community (full width) */}
        <BentoCard
          step="08"
          label="community"
          headline="Find who's competing — and where they hang out."
          description="Search players by format, country, or name. Browse competitive Discord servers."
          preview={<CommunityPreview />}
          className="md:col-span-2 lg:col-span-3"
        />
      </div>
    </section>
  );
}
