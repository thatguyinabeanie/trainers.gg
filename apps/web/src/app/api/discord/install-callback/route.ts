/**
 * Discord Bot Install Callback Route
 *
 * Handles the OAuth2 redirect from Discord after a user authorizes Beanie Bot
 * in their Discord server. This route is the final step of the bot install flow.
 *
 * Flow:
 * 1. Verify the `state` param signature (CSRF / anti-hijack protection)
 * 2. Confirm the current session belongs to the user encoded in the state
 * 3. Confirm the user is still a community leader for the target community
 * 4. Create the `discord_servers` row linking the guild to the community
 * 5. Redirect to the community's Discord integration settings page
 *
 * OAuth2 token exchange: deliberately skipped.
 * The bot uses its bot token for all Discord API calls — it does not need to
 * act on behalf of the installing user. The `code` param Discord provides is
 * only needed to exchange for a user access token, which we have no use for.
 * Skipping the exchange avoids needing DISCORD_CLIENT_SECRET in this flow.
 *
 * GET /api/discord/install-callback?code=...&guild_id=...&state=...
 */

import { DISCORD_BOT_INSTALLED } from "@trainers/posthog";
import {
  hasCommunityAccess,
  getCommunityById,
  createDiscordServer,
} from "@trainers/supabase";

import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { checkCommunityFeatureAccess } from "@/lib/feature-flags/check-flag";
import { verifyInstallState } from "@/lib/discord/install-state";
import { captureServerEvent } from "@/lib/posthog/server";

// =============================================================================
// Helpers
// =============================================================================

/** PostgreSQL unique constraint violation error code. */
const PG_UNIQUE_VIOLATION = "23505";

/**
 * Detect a Postgres unique constraint violation from a thrown error.
 * Supabase throws an object with a `code` property set to `"23505"`.
 */
function isUniqueConstraintError(err: unknown): boolean {
  return (
    err !== null &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: unknown }).code === PG_UNIQUE_VIOLATION
  );
}

// =============================================================================
// Route handler
// =============================================================================

export async function GET(request: Request): Promise<Response> {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;

  // Derive base URL for building absolute redirect targets.
  // In production: request.url is the actual public URL.
  // In development with a tunnel: NEXT_PUBLIC_SITE_URL overrides the origin.
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin;

  /**
   * Build a 303 redirect with a `discord_install_error` query param.
   * `Response.redirect` requires an absolute URL.
   * Errors always land on `/dashboard` — the integration settings page
   * (Phase 5) does not exist yet and will become the proper destination.
   */
  function redirectWithError(code: string): Response {
    // Build via URL + searchParams so `code` is properly encoded — defense in
    // depth against any future caller passing a value with reserved chars.
    const redirectUrl = new URL("/dashboard", baseUrl);
    redirectUrl.searchParams.set("discord_install_error", code);
    return Response.redirect(redirectUrl.toString(), 303);
  }

  // Step 1: Discord explicitly denied (user clicked "Cancel" on the auth page)
  const discordError = searchParams.get("error");
  if (discordError) {
    // `error` is the OAuth error code, e.g. "access_denied"
    return redirectWithError(discordError);
  }

  // Step 2: Validate required params
  const code = searchParams.get("code");
  const guildId = searchParams.get("guild_id");
  const state = searchParams.get("state");

  if (!code || !guildId || !state) {
    return redirectWithError("missing_params");
  }

  // Step 3: Verify state signature and extract community_id + user_id
  // Returns null on any failure: bad signature, expired token, malformed JWT
  const verified = await verifyInstallState(state);
  if (!verified) {
    return redirectWithError("invalid_state");
  }
  const { community_id, user_id: expectedUserId } = verified;

  // Step 4: Confirm the current session matches the user encoded in the state
  // This prevents account hijacking: if User A generates the state, User B
  // cannot complete the install flow with it.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== expectedUserId) {
    return redirectWithError("auth_mismatch");
  }

  // Step 5: Confirm the user is still a community leader
  // Role could have been revoked between state issuance and callback.
  const hasAccess = await hasCommunityAccess(supabase, community_id, user.id);
  if (!hasAccess) {
    return redirectWithError("not_authorized");
  }

  // Step 5b: Confirm Discord integration is enabled for this community
  const discordEnabled = await checkCommunityFeatureAccess(
    "discord_integration",
    community_id
  );
  if (!discordEnabled) {
    return redirectWithError("feature_disabled");
  }

  // Step 6: Create the discord_servers row
  // We use the service-role client to bypass RLS — the authorization check
  // above (steps 4 & 5) already confirmed the user has the right to do this.
  try {
    const adminClient = createServiceRoleClient();
    await createDiscordServer(adminClient, {
      guild_id: guildId,
      community_id,
      installed_by: user.id,
    });
  } catch (err) {
    // Unique constraint on community_id or guild_id → bot already installed
    if (isUniqueConstraintError(err)) {
      return redirectWithError("already_installed");
    }
    // Unexpected DB error — rethrow so it surfaces in logs
    throw err;
  }

  // Step 7: Emit bot-installed analytics event — fire-and-forget
  void captureServerEvent({
    event: DISCORD_BOT_INSTALLED,
    distinctId: user.id,
    properties: {
      community_id,
      guild_id: guildId,
    },
  });

  // Step 8: Look up the community slug for the redirect URL
  // getCommunityById returns null on missing community, but at this point
  // hasCommunityAccess already confirmed it exists, so this should never be null.
  const community = await getCommunityById(supabase, community_id);
  if (!community) {
    // Defensive: community deleted between access check and slug lookup
    return redirectWithError("community_not_found");
  }

  // Step 9: Redirect to the integration settings page (Phase 5 page location)
  return Response.redirect(
    `${baseUrl}/dashboard/community/${community.slug}/settings/integrations/discord?installed=true&guild=${guildId}`,
    303
  );
}
