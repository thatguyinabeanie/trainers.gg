/**
 * Shared React Hooks for Supabase
 *
 * Platform-agnostic hooks that work in both Next.js and Expo.
 * These require platform-specific client factories to be passed in.
 */

export { useSiteRoles, useSiteAdmin } from "./use-site-roles";
export type { SiteRolesResult } from "./use-site-roles";
export { useTeamBuilderAccess } from "./use-team-builder-access";
export type { TeamBuilderAccessResult } from "./use-team-builder-access";
export type { QueryResult } from "./use-supabase-query";
export { useSupabaseQuery } from "./use-supabase-query";
export type { MutationResult } from "./use-supabase-mutation";
export { useSupabaseMutation } from "./use-supabase-mutation";

// API Query Factory — shared TanStack Query factory for ActionResult<T> endpoints
export { useApiQuery, useApiMutation } from "./query-factory";

// JWT utilities — cross-platform base64url decoder
export { decodeBase64Url } from "./jwt-utils";
