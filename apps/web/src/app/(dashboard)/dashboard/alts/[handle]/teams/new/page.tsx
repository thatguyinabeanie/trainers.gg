import { notFound, redirect } from "next/navigation";

import { getActiveFormats } from "@trainers/pokemon";
import { getAltByUsername } from "@trainers/supabase";

import { getUser } from "@/lib/supabase/server";
import { createClientReadOnly } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";

import { NewTeamForm } from "./new-team-form";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata = {
  title: "New Team — trainers.gg",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

interface NewTeamPageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ mode?: string }>;
}

/**
 * New team creation page.
 * Resolves the alt from the URL handle, then renders the client form
 * with altId injected as a prop.
 */
export default async function NewTeamPage({
  params,
  searchParams,
}: NewTeamPageProps) {
  const { handle } = await params;
  const { mode } = await searchParams;

  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }

  const supabase = await createClientReadOnly();
  const alt = await getAltByUsername(supabase, handle);

  if (!alt) {
    notFound();
  }

  const activeFormats = getActiveFormats();
  const defaultFormat = activeFormats[0]?.id ?? "";
  const initialMode = mode === "import" ? "import" : "empty";

  return (
    <>
      <PageHeader title="New Team" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <div className="mx-auto w-full max-w-xl">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight">
              Create a new team
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Build from scratch or import a Showdown paste.
            </p>
          </div>

          <NewTeamForm
            altId={alt.id}
            handle={handle}
            activeFormats={activeFormats}
            defaultFormat={defaultFormat}
            initialMode={initialMode}
          />
        </div>
      </div>
    </>
  );
}
