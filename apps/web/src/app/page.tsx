import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-primary mb-4 text-5xl font-bold tracking-tight">
          trainers.gg
        </h1>
        <p className="text-muted-foreground mb-8 text-xl">
          The social platform for Pokemon trainers, powered by Bluesky
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Link href="/home">
            <Button size="lg" className="w-full sm:w-auto">
              Enter the Community
            </Button>
          </Link>
          <Link href="/about">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Learn More
            </Button>
          </Link>
        </div>

        <nav className="text-muted-foreground mt-12 flex flex-wrap justify-center gap-6 text-sm">
          <Link href="/tournaments" className="hover:text-primary transition-colors">
            Tournaments
          </Link>
          <Link href="/draft-leagues" className="hover:text-primary transition-colors">
            Draft Leagues
          </Link>
          <Link href="/teams" className="hover:text-primary transition-colors">
            Team Builder
          </Link>
        </nav>
      </div>
    </main>
  );
}
