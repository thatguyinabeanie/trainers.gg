// Shared permission key type and constants definition
// This file is in the convex directory so it can be imported by Convex backend code
// without using path aliases (which are not supported in Convex)

export type PermissionKey =
  | "organization.create"
  | "organization.request.create"
  | "organization.request.approve"
  | "organization.request.reject"
  | "organization.request.view.all"
  | "organization.view.all"
  | "organization.view.own"
  | "organization.update"
  | "organization.delete"
  | "organization.invite_members"
  | "organization.view_members"
  | "organization.manage_group_assignments"
  | "organization.remove_member"
  | "organization.request_join"
  | "organization.manage_requests"
  | "role.create"
  | "role.list"
  | "role.view.detail"
  | "role.update"
  | "role.assign_permissions"
  | "permission.create"
  | "permission.list"
  | "permission.view.detail"
  | "permission.update"
  | "permission.delete"
  | "group.create"
  | "group.list"
  | "group.view.detail"
  | "group.update"
  | "group.delete"
  | "group.manage_members"
  | "group.manage_available_roles"
  | "user_profile.list"
  | "user_profile.view.detail"
  | "user_profile.update"
  | "tournament.create"
  | "tournament.view"
  | "tournament.update"
  | "tournament.delete"
  | "tournament.manage_registrations"
  | "tournament.register"
  | "tournament.withdraw"
  | "tournament.submit_team"
  | "tournament.invite_players"
  | "tournament.manage_invitations"
  | "tournament.respond_to_invitation"
  | "template.create"
  | "template.update"
  | "template.delete"
  | "team.create"
  | "team.update"
  | "team.delete"
  | "pokemon.create"
  | "pokemon.update"
  | "pokemon.delete"
  | "match.report_result"
  | "admin.manage_templates"
  | "admin.view_audit_logs"
  | "admin.manage_audit_logs"
  | "admin.assume_site_admin"
  | "admin.manage_temporary_roles";

// Permission constants for use in Convex backend code
export const PERMISSIONS: Record<string, PermissionKey> = {
  // Organization Permissions
  ORG_CREATE: "organization.create",
  ORG_REQUEST_CREATE: "organization.request.create",
  ORG_REQUEST_APPROVE: "organization.request.approve",
  ORG_REQUEST_REJECT: "organization.request.reject",
  ORG_REQUEST_VIEW_ALL: "organization.request.view.all",
  ORG_VIEW_ALL: "organization.view.all",
  ORG_VIEW_OWN: "organization.view.own",
  ORG_UPDATE: "organization.update",
  ORG_DELETE: "organization.delete",
  ORG_INVITE_MEMBERS: "organization.invite_members",
  ORG_VIEW_MEMBERS: "organization.view_members",
  ORG_MANAGE_GROUP_ASSIGNMENTS: "organization.manage_group_assignments",
  ORG_REMOVE_MEMBER: "organization.remove_member",
  ORG_REQUEST_JOIN: "organization.request_join",
  ORG_MANAGE_REQUESTS: "organization.manage_requests",

  // Role Permissions
  ROLE_CREATE: "role.create",
  ROLE_VIEW_ALL: "role.list",
  ROLE_VIEW_DETAIL: "role.view.detail",
  ROLE_UPDATE: "role.update",
  ROLE_ASSIGN_PERMISSIONS: "role.assign_permissions",

  // Permission (meta-permissions)
  PERMISSION_CREATE: "permission.create",
  PERMISSION_VIEW_ALL: "permission.list",
  PERMISSION_VIEW_DETAIL: "permission.view.detail",
  PERMISSION_UPDATE: "permission.update",
  PERMISSION_DELETE: "permission.delete",

  // Group Permissions
  GROUP_CREATE: "group.create",
  GROUP_VIEW_ALL: "group.list",
  GROUP_VIEW_DETAIL: "group.view.detail",
  GROUP_UPDATE: "group.update",
  GROUP_DELETE: "group.delete",
  GROUP_MANAGE_MEMBERS: "group.manage_members",
  GROUP_MANAGE_AVAILABLE_ROLES: "group.manage_available_roles",

  // User Profile Permissions
  USER_PROFILE_VIEW_ALL: "user_profile.list",
  USER_PROFILE_VIEW_DETAIL: "user_profile.view.detail",
  USER_PROFILE_UPDATE: "user_profile.update",

  // Tournament Permissions
  TOURNAMENT_CREATE: "tournament.create",
  TOURNAMENT_VIEW: "tournament.view",
  TOURNAMENT_UPDATE: "tournament.update",
  TOURNAMENT_DELETE: "tournament.delete",
  TOURNAMENT_MANAGE_REGISTRATIONS: "tournament.manage_registrations",
  TOURNAMENT_REGISTER: "tournament.register",
  TOURNAMENT_WITHDRAW: "tournament.withdraw",
  TOURNAMENT_SUBMIT_TEAM: "tournament.submit_team",
  TOURNAMENT_INVITE_PLAYERS: "tournament.invite_players",
  TOURNAMENT_MANAGE_INVITATIONS: "tournament.manage_invitations",
  TOURNAMENT_RESPOND_TO_INVITATION: "tournament.respond_to_invitation",
  TOURNAMENT_MANAGE: "tournament.update", // Alias for update

  // Template Permissions
  TEMPLATE_CREATE: "template.create",
  TEMPLATE_UPDATE: "template.update",
  TEMPLATE_DELETE: "template.delete",

  // Team Permissions
  TEAM_CREATE: "team.create",
  TEAM_UPDATE: "team.update",
  TEAM_DELETE: "team.delete",

  // Pokemon Permissions
  POKEMON_CREATE: "pokemon.create",
  POKEMON_UPDATE: "pokemon.update",
  POKEMON_DELETE: "pokemon.delete",

  // Match Permissions
  MATCH_REPORT_RESULT: "match.report_result",

  // Admin Permissions
  ADMIN_MANAGE_TEMPLATES: "admin.manage_templates",
  ADMIN_VIEW_AUDIT_LOGS: "admin.view_audit_logs",
  ADMIN_MANAGE_AUDIT_LOGS: "admin.manage_audit_logs",
  ADMIN_ASSUME_SITE_ADMIN: "admin.assume_site_admin",
  ADMIN_MANAGE_TEMPORARY_ROLES: "admin.manage_temporary_roles",
};
