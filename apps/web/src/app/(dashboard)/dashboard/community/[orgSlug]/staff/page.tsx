import { createClient, getUser } from "@/lib/supabase/server";
import {
  getCommunityBySlug,
  listCommunityStaffWithRoles,
  listCommunityGroups,
} from "@trainers/supabase";
import { StaffListClient } from "@/app/(app)/to-dashboard/[orgSlug]/staff/staff-list-client";
import { PageHeader } from "@/components/dashboard/page-header";

interface PageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

export default async function DashboardStaffPage({ params }: PageProps) {
  const { orgSlug: communitySlug } = await params;
  const supabase = await createClient();

  const organization = await getCommunityBySlug(supabase, communitySlug);

  if (!organization) {
    return null; // Layout handles 404
  }

  // Get current user to check if they're the owner
  const user = await getUser();
  const isOwner = user?.id === organization.owner_user_id;

  // Fetch initial data
  const [staffMembers, groups] = await Promise.all([
    listCommunityStaffWithRoles(supabase, organization.id),
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
      <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <StaffListClient
          communityId={organization.id}
          communitySlug={communitySlug}
          initialStaff={staffMembers}
          groups={groups}
          isOwner={isOwner}
          currentUserId={user?.id}
          currentUserRole={currentUserRole}
        />
      </div>
    </>
  );
}
