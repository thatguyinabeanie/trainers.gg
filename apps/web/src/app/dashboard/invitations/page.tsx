"use client";

import { TournamentInvitationsView } from "@/components/tournaments/tournament-invitations-view";

export default function InvitationsPage() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Tournament Invitations</h2>
        <p className="text-muted-foreground text-sm">
          Manage invitations to tournaments you&apos;ve been invited to
        </p>
      </div>
      <TournamentInvitationsView />
    </div>
  );
}
