import { type Metadata } from "next";
import { HeroCTA } from "@/components/landing/hero-cta";
import { HeroStats } from "@/components/landing/hero-stats";
import { BentoGrid, UnderConstruction } from "@/components/landing/bento-grid";

export const metadata: Metadata = {
  title: "trainers.gg — Everything a trainer needs",
  description:
    "Manage your alts, guard your strategies, run tournaments, and connect with your community. One account for everything.",
  openGraph: {
    title: "trainers.gg — Everything a trainer needs",
    description:
      "Manage your alts, guard your strategies, run tournaments, and connect with your community.",
    siteName: "trainers.gg",
  },
};

export default function HomePage() {
  return (
    <div>
      {/* Hero + Bento unified background */}
      <div className="relative overflow-hidden dark:bg-[#070b0a]">
        {/* Radial glow — very subtle, only near hero */}
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at 50% 130%, oklch(0.7 0.12 183 / 0.1) 0%, transparent 45%)",
          }}
        />

        {/* Dot grid with fade mask — light mode */}
        <div
          className="pointer-events-none absolute inset-0 dark:hidden"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(0.5 0.08 183 / 0.35) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage:
              "linear-gradient(to bottom, black 20%, transparent 60%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 20%, transparent 60%)",
          }}
        />
        {/* Dot grid — dark mode */}
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle, oklch(0.7 0.12 183 / 0.18) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage:
              "linear-gradient(to bottom, black 20%, transparent 60%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 20%, transparent 60%)",
          }}
        />

        {/* Hero content */}
        <section className="relative z-10 py-20 sm:py-28">
          <div className="mx-auto max-w-screen-xl px-4 text-center">
            <p className="mb-5 text-[11px] font-medium tracking-[6px] uppercase text-primary/50">
              trainers.gg
            </p>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl dark:text-green-50">
              Everything a trainer needs.
              <br />
              One platform.
            </h1>
            <p className="mx-auto mb-2 max-w-xl text-base font-medium text-muted-foreground sm:text-lg dark:text-white/50">
              Manage your alts, guard your strategies, run tournaments, and
              connect with your community.
            </p>
            <p className="mx-auto mb-8 max-w-xl text-sm leading-relaxed text-muted-foreground/60 dark:text-white/30">
              One account for everything — compete under any name, keep teams
              private until you play them, and track all your analytics in one
              place.
            </p>

            <div className="mb-9">
              <HeroCTA />
            </div>

            <HeroStats />
          </div>
        </section>

        {/* Bento grid — same background, no separate wrapper */}
        <BentoGrid />

        {/* Under Construction */}
        <UnderConstruction />
      </div>
    </div>
  );
}
