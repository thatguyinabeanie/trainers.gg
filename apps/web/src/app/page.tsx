import { type Metadata } from "next";
import { HeroCTA } from "@/components/landing/hero-cta";
import { HeroStats } from "@/components/landing/hero-stats";
import { BentoGrid } from "@/components/landing/bento-grid";

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
      {/* Hero */}
      <section className="bg-primary/5 relative overflow-hidden py-20 sm:py-28 dark:bg-[#070b0a]">
        {/* Dark mode: teal glow from below */}
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at 50% 130%, oklch(0.7 0.12 183 / 0.18) 0%, transparent 55%)",
          }}
        />
        {/* Dark mode: subtle grid */}
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          aria-hidden="true"
          style={{
            backgroundImage: [
              "linear-gradient(oklch(0.7 0.12 183 / 0.03) 1px, transparent 1px)",
              "linear-gradient(90deg, oklch(0.7 0.12 183 / 0.03) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-screen-xl px-4 text-center">
          <p className="text-primary/50 mb-5 text-[11px] font-medium tracking-[6px] uppercase">
            trainers.gg
          </p>
          <h1 className="text-foreground mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl dark:text-green-50">
            Everything a trainer needs.
            <br />
            One platform.
          </h1>
          <p className="text-muted-foreground mx-auto mb-2 max-w-xl text-base font-medium sm:text-lg dark:text-white/50">
            Manage your alts, guard your strategies, run tournaments, and
            connect with your community.
          </p>
          <p className="text-muted-foreground/60 mx-auto mb-8 max-w-xl text-sm leading-relaxed dark:text-white/30">
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

      {/* Feature Bento Grid */}
      <BentoGrid />

      {/* Closing CTA */}
      <section className="bg-primary/5 relative overflow-hidden py-12 sm:py-16 dark:bg-[#070b0a]">
        <div
          className="pointer-events-none absolute inset-0 hidden dark:block"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at 50% 130%, oklch(0.7 0.12 183 / 0.12) 0%, transparent 55%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-screen-xl px-4 text-center">
          <h2 className="text-foreground mb-2.5 text-2xl font-bold sm:text-3xl dark:text-green-50">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8 dark:text-white/40">
            Join trainers who take the game seriously.
          </p>
          <HeroCTA />
        </div>
      </section>
    </div>
  );
}
