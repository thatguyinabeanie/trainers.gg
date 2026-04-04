import { type Metadata } from "next";
import { HeroCTA } from "@/components/landing/hero-cta";
import { HeroStats } from "@/components/landing/hero-stats";
import { BentoGrid, UnderConstruction } from "@/components/landing/bento-grid";
import { hero } from "./copy";

export const metadata: Metadata = {
  title: `${hero.brand} — ${hero.tagline}`,
  description: `One account for ${hero.tagline}. ${hero.description}`,
  openGraph: {
    title: `${hero.brand} — ${hero.tagline}`,
    description: hero.description,
    siteName: hero.brand,
  },
  twitter: {
    card: "summary_large_image",
    title: `${hero.brand} — ${hero.tagline}`,
    description: hero.description,
  },
};

export default function HomePage() {
  return (
    <div>
      {/* Hero + Bento unified background */}
      <div className="relative overflow-hidden">
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
            maskImage: "linear-gradient(to bottom, black 20%, transparent 60%)",
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
            maskImage: "linear-gradient(to bottom, black 20%, transparent 60%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 20%, transparent 60%)",
          }}
        />

        {/* Hero content */}
        <section className="relative z-10 py-20 sm:py-28">
          <div className="mx-auto max-w-screen-xl px-4 text-center">
            <p className="text-primary mb-5 text-5xl font-extrabold tracking-[6px] sm:text-7xl">
              {hero.brand}
            </p>
            <h1 className="text-foreground mb-4 text-2xl font-semibold tracking-tight sm:text-3xl dark:text-green-50">
              {hero.tagline}
            </h1>
            <p className="text-muted-foreground mx-auto mb-8 max-w-xl text-base font-normal sm:text-lg dark:text-white/50">
              {hero.description}
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
