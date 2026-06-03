import type { Metadata } from "next";

import { listCoaches } from "@trainers/supabase";

import { createClientReadOnly } from "@/lib/supabase/server";

import { CoachesManager } from "./coaches-manager";

export const metadata: Metadata = {
  title: "Coaches — Admin — trainers.gg",
};

export default async function AdminCoachesPage() {
  const supabase = await createClientReadOnly();
  const coaches = await listCoaches(supabase);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Coaches</h2>
        <p className="text-muted-foreground text-sm">
          Grant or revoke coach status for user accounts.
        </p>
      </div>
      <CoachesManager coaches={coaches} />
    </div>
  );
}
