/**
 * `@trainers/supabase/react-query` subpath entry point.
 *
 * Houses the TanStack Query wrappers (`useApiQuery` / `useApiMutation`) so the
 * package's root barrel (`@trainers/supabase`) stays framework-agnostic — it
 * must not pull `@tanstack/react-query` into every consumer's module graph.
 *
 * Importers opt into the React-Query dependency explicitly by importing from
 * this subpath. Mirrors the `./pipeline` subpath pattern: a dedicated entry
 * that isolates an optional peer dependency from the general barrels.
 */

export { useApiQuery, useApiMutation } from "./hooks/query-factory";
