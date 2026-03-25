import { type Metadata } from "next";
import { Suspense } from "react";
import { HeroCTA } from "@/components/landing/hero-cta";
import { FeatureCards } from "@/components/landing/feature-cards";
import { ComingSoonCards } from "@/components/landing/coming-soon-cards";
import { UpcomingTournamentsPreview } from "@/components/landing/upcoming-tournaments-preview";
import { UpcomingTournamentsSkeleton } from "@/components/landing/upcoming-tournaments-skeleton";

export const revalidate = false;

export const metadata: Metadata = {
  title: "trainers.gg — Your home for competitive Pokemon",
  description:
    "Find tournaments, join communities, and track your journey as a Pokemon trainer. Browse upcoming events, connect with organizations, and analyze your competitive performance.",
  openGraph: {
    title: "trainers.gg — Your home for competitive Pokemon",
    description:
      "Find tournaments, join communities, and track your journey as a Pokemon trainer.",
    siteName: "trainers.gg",
  },
};

export default function HomePage() {
  return (
    <div>
      {/* Section 1: Hero Banner */}
      <section className="bg-primary/5 py-20 sm:py-28">
        <div className="mx-auto max-w-screen-xl px-4 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Your home for competitive Pokemon
          </h1>
          <p className="text-muted-foreground mx-auto mb-8 max-w-xl text-lg">
            Find tournaments, join communities, and track your journey as a
            trainer.
          </p>
          <HeroCTA />
        </div>
      </section>

      {/* Section 2: Feature Cards */}
      <FeatureCards />

      {/* Section 3: Live Upcoming Tournaments */}
      <Suspense fallback={<UpcomingTournamentsSkeleton />}>
        <UpcomingTournamentsPreview />
      </Suspense>

      {/* Section 4: Coming Soon */}
      <ComingSoonCards />

      {/* Section 5: Closing CTA */}
      <section className="bg-primary/5 py-16">
        <div className="mx-auto max-w-screen-xl px-4 text-center">
          <h2 className="mb-4 text-2xl font-semibold">
            Ready to start your journey?
          </h2>
          <HeroCTA />
        </div>
      </section>
    </div>
  );
}
