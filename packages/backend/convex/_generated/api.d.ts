/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as clerkSync from "../clerkSync.js";
import type * as comprehensiveSeed from "../comprehensiveSeed.js";
import type * as groups_mutations from "../groups/mutations.js";
import type * as groups_queries from "../groups/queries.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_tiers from "../lib/tiers.js";
import type * as lib_tournamentConstants from "../lib/tournamentConstants.js";
import type * as meta_queries from "../meta/queries.js";
import type * as organizationRequests_mutations from "../organizationRequests/mutations.js";
import type * as organizationRequests_queries from "../organizationRequests/queries.js";
import type * as organizations from "../organizations.js";
import type * as organizations_mutations from "../organizations/mutations.js";
import type * as organizations_queries from "../organizations/queries.js";
import type * as permissionKeys from "../permissionKeys.js";
import type * as permissions from "../permissions.js";
import type * as permissions_mutations from "../permissions/mutations.js";
import type * as permissions_queries from "../permissions/queries.js";
import type * as pokemon_mutations from "../pokemon/mutations.js";
import type * as pokemon_queries from "../pokemon/queries.js";
import type * as rbac from "../rbac.js";
import type * as rbac_mutations from "../rbac/mutations.js";
import type * as roles_mutations from "../roles/mutations.js";
import type * as roles_queries from "../roles/queries.js";
import type * as seed from "../seed.js";
import type * as teams_mutations from "../teams/mutations.js";
import type * as teams_queries from "../teams/queries.js";
import type * as tierConstants from "../tierConstants.js";
import type * as tournaments from "../tournaments.js";
import type * as tournaments_bracket from "../tournaments/bracket.js";
import type * as tournaments_checkin from "../tournaments/checkin.js";
import type * as tournaments_invitations from "../tournaments/invitations.js";
import type * as tournaments_matches from "../tournaments/matches.js";
import type * as tournaments_mutations from "../tournaments/mutations.js";
import type * as tournaments_pairings from "../tournaments/pairings.js";
import type * as tournaments_queries from "../tournaments/queries.js";
import type * as tournaments_registration from "../tournaments/registration.js";
import type * as tournaments_registrations from "../tournaments/registrations.js";
import type * as tournaments_subscriptions from "../tournaments/subscriptions.js";
import type * as users from "../users.js";
import type * as users_mutations from "../users/mutations.js";
import type * as users_queries from "../users/queries.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  clerkSync: typeof clerkSync;
  comprehensiveSeed: typeof comprehensiveSeed;
  "groups/mutations": typeof groups_mutations;
  "groups/queries": typeof groups_queries;
  helpers: typeof helpers;
  http: typeof http;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/tiers": typeof lib_tiers;
  "lib/tournamentConstants": typeof lib_tournamentConstants;
  "meta/queries": typeof meta_queries;
  "organizationRequests/mutations": typeof organizationRequests_mutations;
  "organizationRequests/queries": typeof organizationRequests_queries;
  organizations: typeof organizations;
  "organizations/mutations": typeof organizations_mutations;
  "organizations/queries": typeof organizations_queries;
  permissionKeys: typeof permissionKeys;
  permissions: typeof permissions;
  "permissions/mutations": typeof permissions_mutations;
  "permissions/queries": typeof permissions_queries;
  "pokemon/mutations": typeof pokemon_mutations;
  "pokemon/queries": typeof pokemon_queries;
  rbac: typeof rbac;
  "rbac/mutations": typeof rbac_mutations;
  "roles/mutations": typeof roles_mutations;
  "roles/queries": typeof roles_queries;
  seed: typeof seed;
  "teams/mutations": typeof teams_mutations;
  "teams/queries": typeof teams_queries;
  tierConstants: typeof tierConstants;
  tournaments: typeof tournaments;
  "tournaments/bracket": typeof tournaments_bracket;
  "tournaments/checkin": typeof tournaments_checkin;
  "tournaments/invitations": typeof tournaments_invitations;
  "tournaments/matches": typeof tournaments_matches;
  "tournaments/mutations": typeof tournaments_mutations;
  "tournaments/pairings": typeof tournaments_pairings;
  "tournaments/queries": typeof tournaments_queries;
  "tournaments/registration": typeof tournaments_registration;
  "tournaments/registrations": typeof tournaments_registrations;
  "tournaments/subscriptions": typeof tournaments_subscriptions;
  users: typeof users;
  "users/mutations": typeof users_mutations;
  "users/queries": typeof users_queries;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
