// Re-export permission types and constants from the backend package
// This allows frontend code to import from a local path while keeping
// the source of truth in the backend package

export { PERMISSIONS } from "@trainers/backend/convex/permissionKeys";
export type { PermissionKey } from "@trainers/backend/convex/permissionKeys";
