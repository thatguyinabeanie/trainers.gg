"use client";

import { type ReactNode } from "react";

import { BuilderNav } from "@/components/builder-nav";

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
 */

interface LandingShellProps {
  footer?: ReactNode;
}

export function LandingShell({ footer }: LandingShellProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Top bar — identical chrome to the workspace editor */}
      <BuilderNav />

      {/* Scrollable content area: landing list + site footer */}
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        <TeamsLandingClient />
        {footer}
      </div>
    </div>
  );
}
