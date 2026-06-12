/**
 * Back-compat shim — re-exports the canonical query factory from
 * `@trainers/supabase` so existing mobile imports keep working without changes.
 *
 * The implementation has been promoted to the shared package so that web and
 * mobile can share one factory. See:
 *   packages/supabase/src/hooks/query-factory.ts
 *
 * Mobile callers should continue importing from this path — the shim ensures
 * zero blast radius for existing code. New code may import directly from
 * `@trainers/supabase/react-query`.
 */
export { useApiQuery, useApiMutation } from "@trainers/supabase/react-query";
