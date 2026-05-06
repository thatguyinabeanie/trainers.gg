import Link from "next/link";
import { UserPlus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WelcomeHeaderProps {
  username: string;
  hasAlts: boolean;
  hasTeamBuilderAccess: boolean;
}

/**
 * Server-rendered welcome header for the dashboard home.
 * Shows a personalized greeting and contextual quick action buttons.
 */
export function WelcomeHeader({
  username,
  hasAlts,
  hasTeamBuilderAccess,
}: WelcomeHeaderProps) {
  // Determine display name — strip temp/user prefixes
  const isTemp = username.startsWith("temp_") || username.startsWith("user_");
  const displayName = isTemp ? "Trainer" : username;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Welcome back, {displayName}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Here&apos;s what&apos;s happening on trainers.gg
        </p>
      </div>

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/tournaments" />}
          nativeButton={false}
        >
          <Search className="mr-1.5 size-3.5" />
          Browse Tournaments
        </Button>
        {hasTeamBuilderAccess && (
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/dashboard/builder" />}
            nativeButton={false}
          >
            <Plus className="mr-1.5 size-3.5" />
            Team Builder
          </Button>
        )}
        {hasAlts && (
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/dashboard/alts" />}
            nativeButton={false}
          >
            <UserPlus className="mr-1.5 size-3.5" />
            New Alt
          </Button>
        )}
        {!hasAlts && (
          <Button
            size="sm"
            render={<Link href="/dashboard/alts" />}
            nativeButton={false}
          >
            <UserPlus className="mr-1.5 size-3.5" />
            Create Alt
          </Button>
        )}
      </div>
    </div>
  );
}
