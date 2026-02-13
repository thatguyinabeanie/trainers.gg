export interface DashboardTournament {
  id: number;
  name: string;
  startDate?: number | null;
  status: string;
  hasTeam: boolean;
  registrationStatus?: string | null;
  checkInOpen?: boolean;
  registrationId?: number | null;
}

export interface DashboardOrganization {
  id: number;
  name: string;
  slug: string;
}

export interface MyDashboardData {
  myTournaments: DashboardTournament[];
  myOrganizations: DashboardOrganization[];
}
