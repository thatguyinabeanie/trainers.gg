import { type NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

// E2E test users matching apps/web/e2e/fixtures/auth.ts
// The handle_new_user() trigger auto-creates public.users + public.alts
const E2E_USERS = [
  {
    id: "a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d",
    email: "admin@trainers.local",
    password: "Password123!",
    username: "admin_trainer",
    firstName: "Admin",
    lastName: "Trainer",
    isAdmin: true,
  },
  {
    id: "b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e",
    email: "player@trainers.local",
    password: "Password123!",
    username: "ash_ketchum",
    firstName: "Ash",
    lastName: "Ketchum",
    isAdmin: false,
  },
  {
    id: "c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f",
    email: "champion@trainers.local",
    password: "Password123!",
    username: "cynthia",
    firstName: "Cynthia",
    lastName: "Shirona",
    isAdmin: false,
  },
  {
    id: "d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a",
    email: "gymleader@trainers.local",
    password: "Password123!",
    username: "brock",
    firstName: "Brock",
    lastName: "Harrison",
    isAdmin: false,
  },
] as const;

// Error codes from @supabase/auth-js that indicate user already exists
const USER_EXISTS_CODES = new Set([
  "email_exists",
  "user_already_exists",
  "identity_already_exists",
]);

// ---------------------------------------------------------------------------
// Safety check: verify this preview has a Supabase branch DB, not production.
// Returns { safe: true } or { safe: false, reason, ...diagnostics }.
// ---------------------------------------------------------------------------
function checkBranchSafety(): {
  safe: boolean;
  reason?: string;
  supabaseUrl?: string;
  currentRef?: string;
  productionRef?: string;
} {
  const vercelEnv = process.env.VERCEL_ENV;

  const isAllowedEnvironment =
    vercelEnv === "development" ||
    vercelEnv === "preview" ||
    (!vercelEnv && process.env.NODE_ENV === "development");

  if (!isAllowedEnvironment) {
    return {
      safe: false,
      reason: `Blocked environment: VERCEL_ENV=${vercelEnv ?? "<unset>"}, NODE_ENV=${process.env.NODE_ENV}`,
    };
  }

  // Local dev (no VERCEL_ENV) is always safe — skip ref comparison.
  if (!vercelEnv) {
    return { safe: true };
  }

  const productionRef = process.env.SUPABASE_PRODUCTION_PROJECT_REF;
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
  const projectRefMatch = supabaseUrl.match(
    /https:\/\/([a-z0-9]+)\.supabase\.co/i
  );
  const currentRef = projectRefMatch?.[1] ?? "<unknown>";

  if (!productionRef) {
    const reason =
      "SUPABASE_PRODUCTION_PROJECT_REF is not set — cannot verify this is not the production database";
    console.error(
      `[e2e/seed] BLOCKED: ${reason} (connecting to: ${supabaseUrl || "<empty>"}, ref: ${currentRef})`
    );
    return { safe: false, reason, supabaseUrl, currentRef };
  }

  if (!projectRefMatch) {
    const reason = "Could not extract Supabase project ref from configured URL";
    console.error(
      `[e2e/seed] BLOCKED: ${reason} (connecting to: ${supabaseUrl || "<empty>"})`
    );
    return { safe: false, reason, supabaseUrl };
  }

  if (currentRef === productionRef) {
    const reason =
      "Connected to production database — Supabase branching may not have created a branch DB for this PR";
    console.error(
      `[e2e/seed] BLOCKED: ${reason} (connecting to: ${supabaseUrl}, ref: ${currentRef}, production ref: ${productionRef})`
    );
    return { safe: false, reason, supabaseUrl, currentRef, productionRef };
  }

  return { safe: true, supabaseUrl, currentRef, productionRef };
}

// GET /api/e2e/seed — lightweight pre-check for CI to determine if
// Supabase branching is active before attempting the seed POST.
export async function GET() {
  const result = checkBranchSafety();
  return NextResponse.json(
    { safe: result.safe, ...(!result.safe && { reason: result.reason }) },
    { status: result.safe ? 200 : 404 }
  );
}

export async function POST(request: NextRequest) {
  // Validate secret before exposing any diagnostic information
  const secret = request.headers.get("x-e2e-seed-secret");
  const expectedSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const safety = checkBranchSafety();
  if (!safety.safe) {
    return NextResponse.json(
      { error: "Not found", ...safety },
      { status: 404 }
    );
  }

  const supabase = createServiceRoleClient();
  const results: Array<{ email: string; status: string; error?: string }> = [];
  let hasErrors = false;

  // Ensure site_admin role exists (only in seeds, not migrations)
  const { error: roleUpsertError } = await supabase.from("roles").upsert(
    {
      name: "site_admin",
      description: "Full administrative access to the entire platform",
      scope: "site",
    },
    { onConflict: "name,scope" }
  );

  if (roleUpsertError) {
    return NextResponse.json(
      {
        success: false,
        error: `Failed to upsert site_admin role: ${roleUpsertError.message}`,
      },
      { status: 500 }
    );
  }

  for (const user of E2E_USERS) {
    try {
      // Create auth user — the handle_new_user() trigger auto-creates
      // public.users and public.alts rows
      const { error } = await supabase.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          first_name: user.firstName,
          last_name: user.lastName,
        },
      });

      if (error) {
        // Check structured error code for "already exists" (stable across versions)
        if (error.code && USER_EXISTS_CODES.has(error.code)) {
          results.push({ email: user.email, status: "already_exists" });
        } else {
          hasErrors = true;
          results.push({
            email: user.email,
            status: "error",
            error: `[${error.code ?? error.status}] ${error.message}`,
          });
          continue;
        }
      } else {
        results.push({ email: user.email, status: "created" });
      }

      // Update public.users with PDS fields
      const { error: updateError } = await supabase
        .from("users")
        .update({
          did: `did:plc:${user.username}`,
          pds_status: "active",
          pds_handle: `${user.username}.trainers.gg`,
        })
        .eq("id", user.id);

      if (updateError) {
        hasErrors = true;
        results.push({
          email: user.email,
          status: "error",
          error: `users.update failed: ${updateError.message}`,
        });
      }

      // Make the primary alt public so it appears in the player directory.
      // handle_new_user() creates the alt with is_public = false by default.
      const { error: altPublicError } = await supabase
        .from("alts")
        .update({ is_public: true })
        .eq("user_id", user.id)
        .eq("username", user.username);

      if (altPublicError) {
        hasErrors = true;
        results.push({
          email: user.email,
          status: "error",
          error: `alts.is_public update failed: ${altPublicError.message}`,
        });
      }

      // Assign site_admin role to admin user
      if (user.isAdmin) {
        const { data: roleData, error: roleFetchError } = await supabase
          .from("roles")
          .select("id")
          .eq("name", "site_admin")
          .eq("scope", "site")
          .maybeSingle();

        if (roleFetchError) {
          hasErrors = true;
          results.push({
            email: user.email,
            status: "error",
            error: `roles.select failed: ${roleFetchError.message}`,
          });
        } else if (roleData) {
          const { error: roleAssignError } = await supabase
            .from("user_roles")
            .upsert(
              { user_id: user.id, role_id: roleData.id },
              { onConflict: "user_id,role_id" }
            );

          if (roleAssignError) {
            hasErrors = true;
            results.push({
              email: user.email,
              status: "error",
              error: `user_roles.upsert failed: ${roleAssignError.message}`,
            });
          }
        }
      }
    } catch (err) {
      hasErrors = true;
      results.push({
        email: user.email,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Create VGC League community for community dashboard E2E tests.
  // The SQL seed files (04_organizations.sql etc.) only run on local dev via
  // pnpm db:reset — the Supabase preview branch DB has schema but no seed data.
  // ---------------------------------------------------------------------------
  const adminUserId = E2E_USERS[0]!.id;

  const { data: community, error: communityError } = await supabase
    .from("communities")
    .upsert(
      {
        name: "VGC League",
        slug: "vgc-league",
        description: "VGC League - Pokemon VGC Tournament Organization",
        owner_user_id: adminUserId,
        status: "active",
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (communityError) {
    hasErrors = true;
    results.push({
      email: "community",
      status: "error",
      error: `communities.upsert failed: ${communityError.message}`,
    });
  } else if (community) {
    // Add admin as staff member (owner access is via owner_user_id,
    // but community_staff membership is also checked by some queries).
    // No unique constraint on (community_id, user_id) — use insert and
    // ignore "duplicate key" errors for idempotency.
    const { error: staffError } = await supabase
      .from("community_staff")
      .insert({ community_id: community.id, user_id: adminUserId });
    if (staffError && !staffError.message.includes("duplicate")) {
      hasErrors = true;
      results.push({
        email: "community_staff",
        status: "error",
        error: `community_staff.insert failed: ${staffError.message}`,
      });
    }

    // Create a completed tournament so the overview page has stats
    const { error: tournamentError } = await supabase
      .from("tournaments")
      .upsert(
        {
          community_id: community.id,
          name: "VGC League Week 1 Championship",
          slug: "vgc-league-week-01",
          status: "completed",
          game_format: "gen9vgc2026regi",
          tournament_format: "swiss_with_cut",
          max_participants: 64,
        },
        { onConflict: "slug" }
      );
    if (tournamentError) {
      hasErrors = true;
      results.push({
        email: "tournament",
        status: "error",
        error: `tournaments.upsert failed: ${tournamentError.message}`,
      });
    }

    // Create Pallet Town community owned by player for access control test
    const playerUserId = E2E_USERS[1]!.id;
    const { error: palletError } = await supabase.from("communities").upsert(
      {
        name: "Pallet Town Trainers",
        slug: "pallet-town",
        description: "Pallet Town community",
        owner_user_id: playerUserId,
        status: "active",
      },
      { onConflict: "slug" }
    );
    if (palletError) {
      hasErrors = true;
      results.push({
        email: "pallet-town",
        status: "error",
        error: `pallet-town.upsert failed: ${palletError.message}`,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Enable coaching feature flag (migration inserts it as disabled; the local
  // db:reset seed that enables it does not run on preview branch DBs).
  // ---------------------------------------------------------------------------
  const { error: flagError } = await supabase
    .from("feature_flags")
    .upsert({ key: "coaching", enabled: true }, { onConflict: "key" });

  if (flagError) {
    hasErrors = true;
    results.push({
      email: "feature_flags",
      status: "error",
      error: `coaching flag update failed: ${flagError.message}`,
    });
  }

  // ---------------------------------------------------------------------------
  // Seed cynthia as a coach (mirrors packages/supabase/supabase/seeds/14_coaching.sql).
  // The coaching E2E tests require at least one seeded coach in the player directory.
  // ---------------------------------------------------------------------------
  const cynthiaUserId = E2E_USERS[2]!.id;

  const { data: cynthiaAlt, error: cynthiaAltError } = await supabase
    .from("alts")
    .select("id")
    .eq("username", "cynthia")
    .maybeSingle();

  if (cynthiaAltError) {
    hasErrors = true;
    results.push({
      email: "cynthia",
      status: "error",
      error: `cynthia alt lookup failed: ${cynthiaAltError.message}`,
    });
  }

  const { error: coachUserError } = await supabase
    .from("users")
    .update({
      is_coach: true,
      ...(cynthiaAlt ? { main_alt_id: cynthiaAlt.id } : {}),
    })
    .eq("id", cynthiaUserId);

  if (coachUserError) {
    hasErrors = true;
    results.push({
      email: "cynthia",
      status: "error",
      error: `coach user update failed: ${coachUserError.message}`,
    });
  }

  const { error: coachProfileError } = await supabase
    .from("coach_profiles")
    .upsert(
      {
        user_id: cynthiaUserId,
        headline:
          "Sinnoh Champion & VGC Veteran — 10+ years of competitive experience",
        bio: "Former Sinnoh Champion turned full-time VGC coach.",
        formats: ["vgc2025regh", "vgc2025regi"],
        links: [{ label: "YouTube", url: "https://youtube.com" }],
        service_types: ["live", "replay_review", "team_review", "mentorship"],
      },
      { onConflict: "user_id" }
    );

  if (coachProfileError) {
    hasErrors = true;
    results.push({
      email: "cynthia",
      status: "error",
      error: `coach_profiles upsert failed: ${coachProfileError.message}`,
    });
  }

  return NextResponse.json(
    { success: !hasErrors, results },
    { status: hasErrors ? 207 : 200 }
  );
}
