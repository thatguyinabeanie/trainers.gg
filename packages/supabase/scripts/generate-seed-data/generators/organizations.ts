/**
 * Organization Generator
 *
 * Generates organizations, staff assignments, and role assignments.
 *
 * Schema notes (post-migrations):
 * - organizations.owner_user_id (uuid) - FK to users, not alts
 * - organization_staff.user_id (uuid) - FK to users, not alts
 * - groups are per-organization
 * - group_roles link groups to roles
 * - user_group_roles link users to group_roles for org permissions
 */

import { SEED_CONFIG, type OrganizationConfig } from "../config.js";
import {
  deterministicPick,
  deterministicShuffle,
  hash,
} from "../utils/deterministic.js";
import { type GeneratedUser, getUserByUsername } from "./users.js";

export interface GeneratedOrganization {
  id: number;
  name: string;
  slug: string;
  description: string;
  status: "active" | "pending";
  ownerUserId: string;
  tier: "regular" | "verified" | "partner";
  subscriptionTier: "free" | "organization_plus" | "enterprise";
  mainDay: number;
  practiceDay: number;
  isExisting: boolean;
}

export interface GeneratedOrgStaff {
  id: number;
  organizationId: number;
  userId: string;
}

export interface GeneratedGroup {
  id: number;
  organizationId: number;
  name: string;
  description: string;
}

export interface GeneratedUserGroupRole {
  id: number;
  userId: string;
  groupRoleId: number;
}

/**
 * Generate all organizations
 */
export function generateOrganizations(
  users: GeneratedUser[]
): GeneratedOrganization[] {
  const organizations: GeneratedOrganization[] = [];

  for (let i = 0; i < SEED_CONFIG.ORGANIZATIONS.length; i++) {
    const config = SEED_CONFIG.ORGANIZATIONS[i]!;
    const owner = getUserByUsername(users, config.ownerUsername);

    if (!owner) {
      throw new Error(
        `Owner user not found: ${config.ownerUsername} for org ${config.slug}`
      );
    }

    organizations.push({
      id: i + 1, // 1-indexed for DB
      name: config.name,
      slug: config.slug,
      description: generateOrgDescription(config),
      status: "active",
      ownerUserId: owner.id,
      tier: config.tier,
      subscriptionTier: config.subscriptionTier,
      mainDay: config.mainDay,
      practiceDay: config.practiceDay,
      isExisting: config.existing,
    });
  }

  return organizations;
}

/**
 * Generate a description for an organization
 * Using simple, generic descriptions
 */
function generateOrgDescription(config: OrganizationConfig): string {
  // Generic descriptions - no Faker-generated content
  return `${config.name} - Pokemon VGC Tournament Organization`;
}

/**
 * Assign staff to organizations
 *
 * Staff assignment rules:
 * - Each org gets staff from the staff user pool
 * - 30% of staff work for 2 orgs
 * - 10% of staff work for 3 orgs
 * - Org owners are NOT added as staff (they have owner permissions)
 */
export function generateOrgStaff(
  organizations: GeneratedOrganization[],
  users: GeneratedUser[]
): GeneratedOrgStaff[] {
  const staffUsers = users.filter((u) => u.isStaff && !u.isSpecial);
  const assignments: GeneratedOrgStaff[] = [];
  let assignmentId = 1;

  // Track which users are assigned to which orgs
  const userOrgAssignments = new Map<string, Set<number>>();

  // Calculate staff needed per org
  const staffPerOrg = SEED_CONFIG.STAFF_ROLES_PER_ORG.reduce(
    (sum, r) => sum + r.count,
    0
  );

  // Shuffle staff for random assignment
  const shuffledStaff = deterministicShuffle(
    staffUsers,
    `staff-shuffle-${SEED_CONFIG.RANDOM_SEED}`
  );

  // Assign staff to each organization
  for (const org of organizations) {
    // Get available staff (not owner, respecting multi-org limits)
    const availableStaff = shuffledStaff.filter((user) => {
      // Skip if this user is the org owner
      if (user.id === org.ownerUserId) return false;

      // Check multi-org limits
      const currentOrgs = userOrgAssignments.get(user.id) || new Set();
      if (currentOrgs.has(org.id)) return false; // Already assigned to this org

      // Determine max orgs for this user based on their index
      const _userIndex = shuffledStaff.indexOf(user);
      const multiOrgRandom = hash(`multi-org-${user.id}`);

      let maxOrgs = 1;
      if (multiOrgRandom < SEED_CONFIG.STAFF_THREE_ORG_RATE) {
        maxOrgs = 3;
      } else if (
        multiOrgRandom <
        SEED_CONFIG.STAFF_THREE_ORG_RATE + SEED_CONFIG.STAFF_MULTI_ORG_RATE
      ) {
        maxOrgs = 2;
      }

      return currentOrgs.size < maxOrgs;
    });

    // Pick staff for this org
    const orgStaff = deterministicPick(
      availableStaff,
      staffPerOrg,
      `org-staff-${org.slug}`
    );

    for (const user of orgStaff) {
      assignments.push({
        id: assignmentId++,
        organizationId: org.id,
        userId: user.id,
      });

      // Track assignment
      if (!userOrgAssignments.has(user.id)) {
        userOrgAssignments.set(user.id, new Set());
      }
      userOrgAssignments.get(user.id)!.add(org.id);
    }
  }

  return assignments;
}

/**
 * Generate groups for each organization
 *
 * Each org gets one group that contains all the org-specific roles
 */
export function generateGroups(
  organizations: GeneratedOrganization[]
): GeneratedGroup[] {
  const groups: GeneratedGroup[] = [];
  let groupId = 1;

  for (const org of organizations) {
    groups.push({
      id: groupId++,
      organizationId: org.id,
      name: "Staff",
      description: `Staff group for ${org.name}`,
    });
  }

  return groups;
}

/**
 * Generate user group role assignments
 *
 * This links users to their roles within an organization.
 * Roles are assigned based on STAFF_ROLES_PER_ORG config.
 */
export function generateUserGroupRoles(
  organizations: GeneratedOrganization[],
  orgStaff: GeneratedOrgStaff[],
  groups: GeneratedGroup[],
  roleIdsByName: Map<string, number>,
  groupRoleIdsByGroupAndRole: Map<string, number>
): GeneratedUserGroupRole[] {
  const assignments: GeneratedUserGroupRole[] = [];
  let assignmentId = 1;

  for (const org of organizations) {
    // Get staff for this org
    const staffForOrg = orgStaff.filter((s) => s.organizationId === org.id);

    // Get the group for this org
    const orgGroup = groups.find((g) => g.organizationId === org.id);
    if (!orgGroup) continue;

    // Assign roles according to STAFF_ROLES_PER_ORG
    let staffIndex = 0;
    for (const roleConfig of SEED_CONFIG.STAFF_ROLES_PER_ORG) {
      const roleId = roleIdsByName.get(roleConfig.role);
      if (!roleId) {
        console.warn(`Role not found: ${roleConfig.role}`);
        continue;
      }

      // Get the group_role ID for this group + role combination
      const groupRoleKey = `${orgGroup.id}-${roleId}`;
      const groupRoleId = groupRoleIdsByGroupAndRole.get(groupRoleKey);
      if (!groupRoleId) {
        // Group role will be created during SQL generation
        continue;
      }

      // Assign the specified count of staff to this role
      for (
        let i = 0;
        i < roleConfig.count && staffIndex < staffForOrg.length;
        i++
      ) {
        const staff = staffForOrg[staffIndex]!;
        assignments.push({
          id: assignmentId++,
          userId: staff.userId,
          groupRoleId: groupRoleId,
        });
        staffIndex++;
      }
    }
  }

  return assignments;
}

/**
 * Get staff users assigned to a specific organization
 */
export function getOrgStaffUserIds(
  organizationId: number,
  orgStaff: GeneratedOrgStaff[]
): string[] {
  return orgStaff
    .filter((s) => s.organizationId === organizationId)
    .map((s) => s.userId);
}

/**
 * Get all user IDs associated with an org (owner + staff)
 */
export function getOrgMemberUserIds(
  org: GeneratedOrganization,
  orgStaff: GeneratedOrgStaff[]
): string[] {
  const staffIds = getOrgStaffUserIds(org.id, orgStaff);
  return [org.ownerUserId, ...staffIds.filter((id) => id !== org.ownerUserId)];
}
