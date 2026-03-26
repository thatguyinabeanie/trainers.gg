import { type Metadata } from "next";
import { HeroCTA } from "@/components/landing/hero-cta";
import { HeroStats } from "@/components/landing/hero-stats";
import { JourneySteps } from "@/components/landing/journey-steps";

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

      {/* Stats strip */}
      <HeroStats />

      {/* Journey Steps */}
      <JourneySteps />

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
