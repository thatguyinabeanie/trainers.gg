export interface DashboardTournament {
  _id: string;
  name: string;
  startDate?: number | null;
  status: string;
}

export interface DashboardOrganization {
  _id: string;
  name: string;
  slug: string;
}

export interface MyDashboardData {
  myTournaments: DashboardTournament[];
  myOrganizations: DashboardOrganization[];
}
