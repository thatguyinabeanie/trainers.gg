"use client";

import { useAuthContext } from "@/components/auth/auth-provider";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function HeroCTA() {
  const { isAuthenticated, loading } = useAuthContext();

  if (loading) {
    return <CTAButtons authenticated={false} />;
  }

  return <CTAButtons authenticated={isAuthenticated} />;
}

function CTAButtons({ authenticated }: { authenticated: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      {authenticated ? (
        <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }))}>
          Go to Dashboard
        </Link>
      ) : (
        <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }))}>
          Get Started
        </Link>
      )}
      <Link
        href="/tournaments"
        className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
      >
        Browse Tournaments
      </Link>
    </div>
  );
}
