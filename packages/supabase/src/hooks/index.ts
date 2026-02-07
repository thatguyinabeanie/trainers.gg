/**
 * Shared React Hooks for Supabase
 *
 * Platform-agnostic hooks that work in both Next.js and Expo.
 * These require platform-specific client factories to be passed in.
 */

export { useSiteRoles, useSiteAdmin } from "./use-site-roles";
export type { SiteRolesResult } from "./use-site-roles";
export type { QueryResult } from "./use-supabase-query";
export { useSupabaseQuery } from "./use-supabase-query";
export type { MutationResult } from "./use-supabase-mutation";
export { useSupabaseMutation } from "./use-supabase-mutation";
