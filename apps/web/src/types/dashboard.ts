export interface DashboardTournament {
  id: string;
  name: string;
  startDate?: number | null;
  status: string;
}

export interface DashboardOrganization {
  id: string;
  name: string;
  slug: string;
}

export interface MyDashboardData {
  myTournaments: DashboardTournament[];
  myOrganizations: DashboardOrganization[];
}
