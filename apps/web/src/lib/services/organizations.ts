/**
 * Organization Service Layer
 *
 * Pure business logic for organization operations.
 * Called by both Server Actions (web) and API Routes (mobile).
 */

import { createClient } from "@/lib/supabase/server";
import {
  listOrganizations,
  getOrganizationBySlug,
  createOrganization as createOrganizationMutation,
  updateOrganization as updateOrganizationMutation,
  inviteToOrganization as inviteToOrganizationMutation,
  acceptOrganizationInvitation as acceptOrganizationInvitationMutation,
  declineOrganizationInvitation as declineOrganizationInvitationMutation,
  leaveOrganization as leaveOrganizationMutation,
  removeStaff as removeStaffMutation,
} from "@trainers/supabase";

// =============================================================================
// Queries
// =============================================================================

export async function listOrganizationsService() {
  const supabase = await createClient();
  return await listOrganizations(supabase);
}

export async function getOrganizationBySlugService(slug: string) {
  const supabase = await createClient();
  const organization = await getOrganizationBySlug(supabase, slug);
  if (!organization) {
    throw new Error("Organization not found");
  }
  return organization;
}

// =============================================================================
// Organization CRUD
// =============================================================================

export async function createOrganizationService(data: {
  name: string;
  slug: string;
  description?: string;
  website?: string;
  logoUrl?: string;
}) {
  const supabase = await createClient();
  return await createOrganizationMutation(supabase, data);
}

export async function updateOrganizationService(
  organizationId: number,
  updates: {
    name?: string;
    description?: string;
    website?: string;
    logoUrl?: string;
  }
) {
  const supabase = await createClient();
  return await updateOrganizationMutation(supabase, organizationId, updates);
}

// =============================================================================
// Staff Management
// =============================================================================

export async function inviteToOrganizationService(
  organizationId: number,
  invitedUserId: string
) {
  const supabase = await createClient();
  return await inviteToOrganizationMutation(
    supabase,
    organizationId,
    invitedUserId
  );
}

export async function acceptOrganizationInvitationService(
  invitationId: number
) {
  const supabase = await createClient();
  return await acceptOrganizationInvitationMutation(supabase, invitationId);
}

export async function declineOrganizationInvitationService(
  invitationId: number
) {
  const supabase = await createClient();
  return await declineOrganizationInvitationMutation(supabase, invitationId);
}

export async function removeStaffService(
  organizationId: number,
  userId: string
) {
  const supabase = await createClient();
  return await removeStaffMutation(supabase, organizationId, userId);
}

export async function leaveOrganizationService(organizationId: number) {
  const supabase = await createClient();
  return await leaveOrganizationMutation(supabase, organizationId);
}
