import type { Metadata } from "next";
import { TournamentInvitationsView } from "@/components/tournaments/tournament-invitations-view";

export const metadata: Metadata = {
  title: "Invitations",
};

export default function InvitationsPage() {
  return <TournamentInvitationsView />;
}
