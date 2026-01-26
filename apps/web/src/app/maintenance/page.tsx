"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/page-container";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function MaintenancePage() {
  return (
    <PageContainer
      variant="narrow"
      className="flex min-h-[80vh] flex-col items-center justify-center"
    >
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Private Beta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 text-center">
          <p className="text-muted-foreground">
            trainers.gg is currently in private beta. We&apos;re working hard to
            build the best platform for competitive Pokemon players.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/sign-up"
              className={cn(buttonVariants({ variant: "default" }), "w-full")}
            >
              Join the Waitlist
            </Link>
            <Link
              href="/sign-in"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Sign In
            </Link>
          </div>

          <p className="text-muted-foreground text-sm">
            Already have an account? Sign in to access all features.
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
