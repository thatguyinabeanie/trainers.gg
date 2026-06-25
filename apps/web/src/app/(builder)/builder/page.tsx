import { type Metadata } from "next";

import { getCurrentUserAlts } from "@trainers/supabase";

import { CopyrightYear } from "@/components/layout/copyright-year";
import { fetchEnrichedAccountTeams } from "@/lib/data/enriched-teams";
import { createClientReadOnly } from "@/lib/supabase/server";
import { type EnrichedAccountTeam } from "@/components/team-builder/persistence/account-team-record";
import { LandingShell } from "@/components/team-builder/landing/landing-shell";

export const metadata: Metadata = {
  title: "Team Builder — trainers.gg",
  description:
    "Build competitive Pokémon teams with type coverage checks, speed tiers, and damage calculations — no account required.",
};

/**
 * The footer is authored here in the Server Component so that CopyrightYear
 * (a Client Component) can be imported without violating the RSC → client
 * import boundary. The rendered ReactNode is passed into LandingShell as a prop
 * — Next.js allows passing a server-rendered node as children/prop to a Client
 * Component.
 */
const siteFooter = (
  <footer className="border-border/40 w-full border-t py-4">
    <div className="text-muted-foreground mx-auto flex max-w-screen-2xl flex-col items-center justify-between px-4 text-sm md:flex-row md:px-6">
      <p className="font-semibold whitespace-nowrap">
        Built for competitors, by competitors.
      </p>
      <p className="text-xs whitespace-nowrap">
        &copy; <CopyrightYear /> Beanie LLC
      </p>
    </div>
  </footer>
);

export default async function BuilderPage() {
  const supabase = await createClientReadOnly();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  let initialAccountTeams: EnrichedAccountTeam[] | undefined = undefined;
  let initialAlts: { id: number; username: string }[] = [];

  if (userId) {
    const [teams, alts] = await Promise.all([
      fetchEnrichedAccountTeams(supabase, userId),
      getCurrentUserAlts(supabase),
    ]);
    initialAccountTeams = teams;
    initialAlts = alts.map((a) => ({ id: a.id, username: a.username }));
  }

  return (
    <LandingShell
      footer={siteFooter}
      userId={userId}
      initialAccountTeams={initialAccountTeams}
      initialAlts={initialAlts}
    />
  );
}
