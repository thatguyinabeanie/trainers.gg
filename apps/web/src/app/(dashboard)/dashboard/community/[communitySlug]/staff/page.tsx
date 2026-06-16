import {
  getCommunityBySlug,
  listCommunityStaffWithRoles,
  listCommunityGroups,
} from "@trainers/supabase";

import { createClient, createServiceRoleClient, getUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { RolePermissionsCard } from "@/components/dashboard/role-permissions-card";

import { StaffClient } from "./staff-client";

interface PageProps {
  params: Promise<{
    communitySlug: string;
  }>;
}

export default async function DashboardStaffPage({ params }: PageProps) {
  const { communitySlug } = await params;
  const supabase = await createClient();

  const organization = await getCommunityBySlug(supabase, communitySlug);

  if (!organization) {
    return null; // Layout handles 404
  }

  // Get current user to check if they're the owner
  const user = await getUser();
  const isOwner = user?.id === organization.owner_user_id;

  // Service-role client for PII enrichment (get_users_pii RPC is service_role-only).
  const serviceSupabase = createServiceRoleClient();

  // Fetch initial data
  const [staffMembers, groups] = await Promise.all([
    listCommunityStaffWithRoles(supabase, organization.id, serviceSupabase),
    listCommunityGroups(supabase, organization.id),
  ]);

  // Get current user's role from staff list
  const currentUserStaff = user
    ? staffMembers.find((s) => s.user_id === user.id)
    : null;
  const currentUserRole = currentUserStaff?.role?.name ?? null;

  return (
    <>
      <PageHeader title="Staff" />
      <DashboardContent>
        <StaffClient
          communityId={organization.id}
          communitySlug={communitySlug}
          initialStaff={staffMembers}
          groups={groups}
          isOwner={isOwner}
          currentUserId={user?.id}
          currentUserRole={currentUserRole}
        />
        <RolePermissionsCard />
      </DashboardContent>
    </>
  );
}
