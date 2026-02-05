import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CoachingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
          <GraduationCap className="h-10 w-10 text-teal-600 dark:text-teal-400" />
        </div>

        <h1 className="text-primary mb-4 text-5xl font-bold tracking-tight">
          Coaching
        </h1>

        <p className="text-muted-foreground mb-4 text-xl">Coming Soon</p>

        <p className="text-muted-foreground mb-8">
          Get matchup prep, coaching tools, and personalized resources to
          improve your competitive game.
          <br />
          Check back soon!
        </p>

        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
      </div>
    </main>
  );
}
