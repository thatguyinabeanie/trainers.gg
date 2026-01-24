"use client";

import { Button } from "@/components/ui/button";
import { BlueskyIcon } from "@/components/icons/bluesky-icon";

interface LoginScreenProps {
  onBlueskyLogin: () => void;
  isLoading?: boolean;
}

export function LoginScreen({ onBlueskyLogin, isLoading }: LoginScreenProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="mx-auto max-w-md text-center">
        {/* Logo / Brand */}
        <h1 className="text-primary mb-2 text-5xl font-bold tracking-tight">
          trainers.gg
        </h1>
        <p className="text-muted-foreground mb-12 text-lg">
          The social platform for Pokemon trainers
        </p>

        {/* Main CTA */}
        <div className="space-y-4">
          <Button
            size="lg"
            className="w-full gap-3 text-base"
            onClick={onBlueskyLogin}
            disabled={isLoading}
          >
            <BlueskyIcon className="size-5" />
            {isLoading ? "Connecting..." : "Sign in with Bluesky"}
          </Button>

          <p className="text-muted-foreground text-sm">
            Powered by the AT Protocol for decentralized social networking
          </p>
        </div>

        {/* Features */}
        <div className="mt-16 grid gap-6 text-left sm:grid-cols-2">
          <FeatureCard
            title="Pokemon Feed"
            description="Stay updated with posts from trainers across Bluesky"
          />
          <FeatureCard
            title="Tournaments"
            description="Find and join competitive Pokemon events"
          />
          <FeatureCard
            title="Team Builder"
            description="Build and share your competitive teams"
          />
          <FeatureCard
            title="Community"
            description="Connect with trainers who share your passion"
          />
        </div>

        {/* Footer links */}
        <nav className="text-muted-foreground mt-12 flex flex-wrap justify-center gap-6 text-sm">
          <a
            href="https://bsky.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors"
          >
            What is Bluesky?
          </a>
          <a href="/about" className="hover:text-primary transition-colors">
            About
          </a>
        </nav>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <h3 className="mb-1 font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}
