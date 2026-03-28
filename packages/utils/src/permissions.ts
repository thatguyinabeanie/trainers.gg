// Permission key type and constants definition
// Standalone file that doesn't depend on backend packages

export type PermissionKey =
  | "community.create"
  | "community.request.create"
  | "community.request.approve"
  | "community.request.reject"
  | "community.request.view.all"
  | "community.view.all"
  | "community.view.own"
  | "community.update"
  | "community.delete"
  | "community.invite_staff"
  | "community.view_staff"
  | "community.manage_group_assignments"
  | "community.remove_staff"
  | "community.request_join"
  | "community.manage_requests"
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
  | "group.manage_staff"
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

// Permission constants for use in frontend code
export const PERMISSIONS = {
  // Community Permissions
  COMMUNITY_CREATE: "community.create",
  COMMUNITY_REQUEST_CREATE: "community.request.create",
  COMMUNITY_REQUEST_APPROVE: "community.request.approve",
  COMMUNITY_REQUEST_REJECT: "community.request.reject",
  COMMUNITY_REQUEST_VIEW_ALL: "community.request.view.all",
  COMMUNITY_VIEW_ALL: "community.view.all",
  COMMUNITY_VIEW_OWN: "community.view.own",
  COMMUNITY_UPDATE: "community.update",
  COMMUNITY_DELETE: "community.delete",
  COMMUNITY_INVITE_STAFF: "community.invite_staff",
  COMMUNITY_VIEW_STAFF: "community.view_staff",
  COMMUNITY_MANAGE_GROUP_ASSIGNMENTS: "community.manage_group_assignments",
  COMMUNITY_REMOVE_STAFF: "community.remove_staff",
  COMMUNITY_REQUEST_JOIN: "community.request_join",
  COMMUNITY_MANAGE_REQUESTS: "community.manage_requests",

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
  GROUP_MANAGE_STAFF: "group.manage_staff",
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
} as const satisfies Record<string, PermissionKey>;
