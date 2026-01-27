import { createClient } from "@/lib/supabase/server";
import {
  getOrganizationBySlug,
  listOrganizationStaffWithRoles,
  listOrganizationGroups,
} from "@trainers/supabase";
import { StaffListClient } from "./staff-list-client";

interface PageProps {
  params: Promise<{
    orgSlug: string;
  }>;
}

export default async function StaffPage({ params }: PageProps) {
  const { orgSlug } = await params;
  const supabase = await createClient();

  const organization = await getOrganizationBySlug(supabase, orgSlug);

  if (!organization) {
    return null; // Layout handles 404
  }

  // Get current user to check if they're the owner
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwner = user?.id === organization.owner_user_id;

  // Fetch initial data
  const [staffMembers, groups] = await Promise.all([
    listOrganizationStaffWithRoles(supabase, organization.id),
    listOrganizationGroups(supabase, organization.id),
  ]);

  return (
    <StaffListClient
      organizationId={organization.id}
      orgSlug={orgSlug}
      initialStaff={staffMembers}
      groups={groups}
      isOwner={isOwner}
      currentUserId={user?.id}
    />
  );
}
