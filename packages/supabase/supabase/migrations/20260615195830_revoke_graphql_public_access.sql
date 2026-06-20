-- =============================================================================
-- Revoke public GraphQL access
-- =============================================================================
-- The Supabase security linter reported ~70 WARN items for "Public Can See
-- Object in GraphQL Schema" — every table and view is visible to anon and
-- authenticated via the GraphQL endpoint (/graphql/v1).
--
-- trainers.gg does not use Supabase GraphQL. All data access goes through
-- the PostgREST REST API (/rest/v1) and RPC endpoints. The pg_graphql
-- extension is present (Supabase bundles it) but the app never calls
-- /graphql/v1.
--
-- Revoking EXECUTE on graphql.resolve disables the /graphql/v1 endpoint for
-- anon and authenticated callers without removing the extension. The Supabase
-- dashboard (which uses service_role) continues to work normally.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION graphql.resolve FROM anon;
REVOKE EXECUTE ON FUNCTION graphql.resolve FROM authenticated;
