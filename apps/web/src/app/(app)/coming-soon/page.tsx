import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ComingSoonPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Construction className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>

        <h1 className="text-primary mb-4 text-5xl font-bold tracking-tight">
          trainers.gg
        </h1>

        <p className="text-muted-foreground mb-4 text-xl">Coming Soon</p>

        <p className="text-muted-foreground mb-8">
          We&apos;re building something special for Pokemon trainers.
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
