---
title: Organization System Overview
description: Comprehensive guide to tournament organizations, groups, roles, and permissions on the Battle Stadium platform
category: organizations
type: overview
obsidian_compatible: true
---

# 🏢 Organization System Overview

> **Note:** This documentation is Obsidian-compatible. Use [[WikiLinks]] for navigation.

Welcome to the Battle Stadium Organization System!

**Battle Stadium is built for grassroots, community-driven tournament organizing.** Organizations on this platform represent community groups like Discord servers, friend groups, content creator communities, local gaming clubs, and other grassroots tournament organizers - NOT corporate entities or professional esports organizations.

This documentation explains how these community-driven tournament organizations, groups, roles, and permissions work on the platform.

---

## 📚 Table of Contents

- [[organizations/ORGANIZATIONS#Core Concepts|Core Concepts: Membership & Administration]]
- [[organizations/groups/ORG_GROUPS|👥 Groups & Group-Specific Roles]]
- [[organizations/roles/ORG_ROLES|🏷️ Global Roles & Permissions System]]
- [[organizations/permissions/ORG_PERMISSIONS|🗂️ Example Permission Matrix & Advanced Topics]]

---

## Core Concepts: Membership & Administration

This section outlines how profiles become members of organizations and how administrative privileges are managed.

### 🔑 Organization Membership (`organization_members` table)

- **Core Principle:** A user's profile becomes an official member of an organization through an entry in the `organization_members` table. This table simply links an `organization_id` to a `profile_id`.
- **No Org-Level Roles Here:** This table does not store organization-level roles. Its sole purpose is to signify that a profile is part of the organization's roster.
- **Prerequisite:** Being listed in `organization_members` is a prerequisite for a profile to be added to any specific groups within that organization.
- **Public Visibility:** The list of members for any given organization (i.e., profiles in its `organization_members` list) is considered public information. Detailed group memberships and specific roles within those groups for each member will also be publicly queryable for an organization.

### 📨 Inviting Members to an Organization

- **Invitation Process:** Profiles are invited to join an organization by existing members who have the `PERMISSIONS.ORG_INVITE_MEMBERS` permission for that specific organization.
- **Existing Profiles Only:** Invitations can currently only be sent to profiles that already exist on the platform.
- **Tracking Invitations:** Invitations are tracked in an `organization_invitations` table, which records the organization, the invited profile, the inviting profile, a status (e.g., 'pending', 'accepted', 'declined', 'revoked'), and an optional expiration date.
- **Accepting an Invitation:** When a profile accepts an invitation to join an organization:
  1. An entry is created in the `organization_members` table for that profile and organization.
  2. No default group placement occurs. The profile is now an org member and can be subsequently added to specific groups by authorized users.

### 👑 Organization Ownership & Implicit Admin Rights

- **Owner as Administrator:** The profile designated as the `owner_profile_id` of an organization inherently has full administrative rights over that organization. This includes the ability to invite members, manage group assignments, remove members, and perform all other administrative actions, bypassing standard permission checks for their own organization.
- **Delegation:** While the owner has full control, they are encouraged to delegate responsibilities by creating groups and assigning roles with specific permissions to other members of the organization.

### 🛡️ Granting Administrative Permissions for an Organization

- **Group-Based Permissions:** All specific administrative permissions for managing an organization (beyond the owner's implicit rights) are granted through group-based role assignments.
- **Mechanism:**
  1. **Global Roles:** Define global `Roles` (in the main `roles` table) that encapsulate specific sets of permissions. For example, a global role named "Organization Manager" might be granted permissions like:
     - `PERMISSIONS.ORG_INVITE_MEMBERS` (to invite new members to the org)
     - `PERMISSIONS.ORG_MANAGE_GROUP_ASSIGNMENTS` (to add/remove org members to/from groups and manage their roles within those groups)
     - `PERMISSIONS.ORG_REMOVE_MEMBER` (to remove a member from the organization entirely)
     - `PERMISSIONS.GROUP_CREATE` (to create new groups within this org)
     - `PERMISSIONS.GROUP_DELETE` (to delete groups within this org)
     - `PERMISSIONS.GROUP_MANAGE_AVAILABLE_ROLES` (to manage which global roles are usable within a specific group in this org)
  2. **Privileged Groups:** Within an organization, create a specific group (e.g., "Org Staff," "Administrators").
  3. **Linking Global Role to Group:** Link the powerful global role (e.g., "Organization Manager") to this privileged group within the organization (this creates an entry in the `group_roles` table).
  4. **Assigning Profiles:** Add trusted profiles (who are already members of the organization via `organization_members`) to this privileged group, assigning them the linked powerful role (this creates an entry in `profile_group_roles`).
- **Result:** Members of this privileged group now effectively have the administrative permissions for that specific organization, as defined by the global role they were assigned within that group.

### 📄 Listing Your Organization Memberships

- Authenticated users can retrieve a list of all organizations they are a member of (i.e., where their profile is listed in the `organization_members` table). This is typically achieved via a dedicated Convex query function (e.g., `organizations.listMyMemberOrganizations`).

---

## Old Content (To be reviewed/merged/deleted): Not all content below is preserved. Referencing old sections for review

Original "Organization Ownership" and "Site Admins" sections can be reviewed. The new model for owner rights is above. Site admin concepts remain largely unchanged but are distinct from per-org admin rights.

---

For details on specific group structures and group-level roles, see:

- [[organizations/groups/ORG_GROUPS|👥 Groups & Group-Specific Roles]]

For a glossary of example global roles and the overall permissions system, see:

- [[organizations/roles/ORG_ROLES|🏷️ Global Roles & Permissions System]]

For an example permission matrix and other advanced topics, see:

- [[organizations/permissions/ORG_PERMISSIONS|🗂️ Example Permission Matrix & Advanced Topics]]

---

This system is designed to be practical, flexible, and extensible for organizations of all sizes. As needs evolve, more roles, groups, and templates can be added or customized.
