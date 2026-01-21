// Re-export all RBAC mutations for easier access
export {
  assignRoleToUser,
  removeRoleFromUser,
  addUserToGroup,
  removeUserFromGroup,
  createRole,
  assignPermissionsToRole,
} from "./rbac/mutations";
