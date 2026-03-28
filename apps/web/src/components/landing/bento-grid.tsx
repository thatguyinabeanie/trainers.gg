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
        "bg-muted/60 rounded-xl p-5",
        "dark:bg-[#1a1f2e]",
        className
      )}
    >
      <p className="text-primary/60 font-mono text-[10px] font-medium tracking-[3px] uppercase">
        {step} — {label}
      </p>
      <h3 className="text-foreground mt-2.5 text-[15px] font-bold">
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
    { name: "thatguyinabeanie", elo: "1482", gxe: "68.2", public: true },
    { name: "AdamantBeanie", elo: "1350", gxe: "59.1", public: true },
    { name: "CalmBeanie", elo: "1200", gxe: "50.0", public: false },
    { name: "ModestBeanie", elo: "1200", gxe: "50.0", public: false },
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
            1482
          </p>
          <p className="text-muted-foreground text-[8px] tracking-[1px] uppercase">
            ELO
          </p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-primary font-mono text-base font-extrabold">
            68.2
          </p>
          <p className="text-muted-foreground text-[8px] tracking-[1px] uppercase">
            GXE
          </p>
        </div>
        <div className="flex-1 text-center">
          <p className="text-primary font-mono text-base font-extrabold">
            71%
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

      {/* Public alts */}
      <div className="border-t border-border/40 pt-2">
        <p className="text-muted-foreground mb-1 text-[8px] tracking-[1px] uppercase">
          Public alts
        </p>
        <div className="flex flex-wrap gap-1">
          <span className="border-primary/20 text-primary rounded border px-1.5 py-0.5 text-[9px]">
            AdamantBeanie
          </span>
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

function UnderConstructionPreview() {
  const items = [
    {
      emoji: "📊",
      label: "Meta Analytics",
      desc: "Usage rates, win rates, cores",
    },
    { emoji: "📝", label: "Articles", desc: "Guides, reports, recaps" },
    { emoji: "🎓", label: "Coaching", desc: "Find a personal coach" },
  ] as const;

  return (
    <div className="space-y-1.5">
      {items.map(({ emoji, label, desc }) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-md bg-background/60 px-3 py-2 dark:bg-black/30"
        >
          <span className="shrink-0 text-sm">{emoji}</span>
          <div>
            <p className="text-foreground text-[11px] font-semibold">{label}</p>
            <p className="text-muted-foreground text-[10px]">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

export function BentoGrid() {
  return (
    <section className="mx-auto max-w-screen-xl px-4 py-12 sm:py-16">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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

        {/* Row 3: Community (2-col) + Under Construction */}
        <BentoCard
          step="08"
          label="community"
          headline="Find who's competing — and where they hang out."
          description="Search players by format, country, or name. Browse competitive Discord servers."
          preview={<CommunityPreview />}
          className="md:col-span-2 lg:col-span-2"
        />
        <div
          className={cn(
            "bg-primary/[0.03] rounded-xl border border-dashed border-primary/20 p-5"
          )}
        >
          <p className="text-muted-foreground mb-2.5 text-[9px] tracking-[2px] uppercase">
            Under Construction
          </p>
          <UnderConstructionPreview />
        </div>
      </div>
    </section>
  );
}
