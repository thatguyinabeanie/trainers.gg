import type { Id } from "@trainers/backend/convex/_generated/dataModel";

export interface DashboardTournament {
  _id: Id<"tournaments">;
  name: string;
  startDate?: number | null;
  status: string;
}

export interface DashboardOrganization {
  _id: Id<"organizations">;
  name: string;
  slug: string;
}

export interface MyDashboardData {
  myTournaments: DashboardTournament[];
  myOrganizations: DashboardOrganization[];
}
