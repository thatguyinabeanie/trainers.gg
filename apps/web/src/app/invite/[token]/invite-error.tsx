"use client";

import Link from "next/link";
import { Trophy, XCircle, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorReason = "invalid" | "expired" | "used";

const errorConfig: Record<
  ErrorReason,
  { icon: typeof XCircle; title: string; description: string }
> = {
  invalid: {
    icon: XCircle,
    title: "Invalid Invite",
    description:
      "This invite link is not valid. It may have been copied incorrectly. Please check the link and try again, or contact the person who sent it.",
  },
  expired: {
    icon: Clock,
    title: "Invite Expired",
    description:
      "This invite link has expired. Invite links are valid for 7 days. Please ask the person who invited you to send a new one.",
  },
  used: {
    icon: CheckCircle2,
    title: "Invite Already Used",
    description:
      "This invite link has already been used to create an account. Each invite can only be used once. If you already created an account, try signing in.",
  },
};

export function InviteError({ reason }: { reason: ErrorReason }) {
  const config = errorConfig[reason];
  const Icon = config.icon;

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-8">
      {/* Branding */}
      <Link href="/" className="flex items-center gap-2">
        <div className="bg-primary flex size-10 items-center justify-center rounded-xl">
          <Trophy className="size-5 text-white" />
        </div>
        <span className="text-xl font-bold tracking-tight">trainers.gg</span>
      </Link>

      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <Icon className="text-muted-foreground size-12" />
          </div>
          <CardTitle className="text-2xl">{config.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-center">
          <p className="text-muted-foreground">{config.description}</p>
          <div className="flex flex-col gap-2">
            {reason === "used" && (
              <Link href="/sign-in" className={cn(buttonVariants(), "w-full")}>
                Sign In
              </Link>
            )}
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Go Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
