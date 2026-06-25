"use client";

import { type ReactNode } from "react";

import { BuilderNav } from "@/components/builder-nav";
import { type EnrichedAccountTeam } from "@/components/team-builder/persistence/account-team-record";

import { TeamsLandingClient } from "./teams-landing-client";

/**
 * Full-chrome shell for the /builder landing page.
 *
 * Renders inside the (builder) group layout's h-dvh main:
 *   <div h-full flex-col>
 *     <BuilderNav />          — top bar (shrink-0), same as editor
 *     <div flex-1 overflow-auto>
 *       <TeamsLandingClient />
 *       {footer}              — site footer at bottom of the scroll area
 *     </div>
 *   </div>
 *
 * The `footer` prop accepts a server-rendered ReactNode so the page can pass
 * <Footer /> (or the equivalent inline footer JSX) from a Server Component
 * without violating the RSC → client import constraint.
 *
 * `userId`, `initialAccountTeams`, and `initialAlts` are SSR-seeded from the
 * page and forwarded to TeamsLandingClient for zero-waterfall account data.
 */

interface LandingShellProps {
  footer?: ReactNode;
  userId?: string | null;
  initialAccountTeams?: EnrichedAccountTeam[];
  initialAlts?: { id: number; username: string }[];
}

export function LandingShell({
  footer,
  userId,
  initialAccountTeams,
  initialAlts,
}: LandingShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top bar — identical chrome to the workspace editor */}
      <BuilderNav />

      {/* Middle row: full-height rail + scrolling content. TeamsLandingClient
          owns the [rail | content] split. */}
      <div className="flex min-h-0 flex-1">
        <TeamsLandingClient
          userId={userId}
          initialAccountTeams={initialAccountTeams}
          initialAlts={initialAlts}
        />
      </div>

      {/* Footer — full-width along the bottom, BELOW the rail + content
          (sandwiched under the full-width top bar). */}
      <div className="shrink-0">{footer}</div>
    </div>
  );
}
