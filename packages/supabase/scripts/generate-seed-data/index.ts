#!/usr/bin/env npx tsx
/**
 * Seed Data Generator - Main Entry Point
 *
 * Generates SQL seed files for development testing with realistic tournament data.
 *
 * Usage:
 *   pnpm generate-seeds
 *
 * Output:
 *   Replaces files in packages/supabase/supabase/seeds/
 *
 * The generator creates deterministic data - running it multiple times produces
 * identical output (given the same users.json input).
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

import { SEED_CONFIG } from "./config.js";
import {
  generateHeader,
  generateSection,
  escapeString,
  formatValue,
} from "./utils/sql-builder.js";
import {
  generateUsers,
  generateAlts,
  getSeedPassword,
  type GeneratedUser,
  type GeneratedAlt,
} from "./generators/users.js";
import {
  generateOrganizations,
  generateOrgStaff,
  type GeneratedOrganization,
  type GeneratedOrgStaff,
} from "./generators/organizations.js";
import {
  generateTournaments,
  generateTournamentPhases,
  generateTournamentRegistrations,
  type GeneratedTournament,
  type GeneratedTournamentPhase,
  type GeneratedTournamentRegistration,
} from "./generators/tournaments.js";
import {
  generateMatches,
  type GeneratedMatch,
  type GeneratedMatchGame,
} from "./generators/matches.js";
import {
  generateStandings,
  type GeneratedStanding,
} from "./generators/standings.js";

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SEEDS_DIR = join(__dirname, "..", "..", "supabase", "seeds");

// ============================================================================
// SQL Generation
// ============================================================================

/**
 * Generate 03_users.sql - auth.users and public.users/alts updates
 */
function generateUsersSql(
  users: GeneratedUser[],
  alts: GeneratedAlt[]
): string {
  const password = getSeedPassword();
  const lines: string[] = [];

  lines.push(generateHeader("03_users.sql", "Create Test Users"));
  lines.push(
    `-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING for inserts, UPDATE for profile data`
  );
  lines.push(`--`);
  lines.push(`-- TEST CREDENTIALS:`);
  lines.push(`--   Password: ${password}`);
  lines.push(`--   Emails: See users below`);
  lines.push(
    `-- =============================================================================\n`
  );

  // Generate auth.users inserts
  lines.push(generateSection("auth.users"));
  lines.push(`INSERT INTO auth.users (`);
  lines.push(
    `  id, instance_id, email, encrypted_password, email_confirmed_at,`
  );
  lines.push(`  aud, role, raw_app_meta_data, raw_user_meta_data,`);
  lines.push(
    `  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token`
  );
  lines.push(`) VALUES`);

  const userValues = users.map((user, index) => {
    const metaData = JSON.stringify({
      username: user.username,
      first_name: user.firstName,
      last_name: user.lastName,
    });

    const comma = index < users.length - 1 ? "," : "";
    return `  ('${user.id}', '00000000-0000-0000-0000-000000000000',
   '${escapeString(user.email)}', extensions.crypt('${escapeString(password)}', extensions.gen_salt('bf')), NOW(),
   'authenticated', 'authenticated',
   '{"provider": "email", "providers": ["email"]}'::jsonb,
   '${escapeString(metaData)}'::jsonb,
   NOW(), NOW(), '', '', '', '')${comma}`;
  });

  lines.push(userValues.join("\n"));
  lines.push(`ON CONFLICT (id) DO NOTHING;\n`);

  // Generate auth.identities
  lines.push(generateSection("auth.identities"));
  lines.push(`INSERT INTO auth.identities (`);
  lines.push(
    `  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at`
  );
  lines.push(`) VALUES`);

  const identityValues = users.map((user, index) => {
    const identityData = JSON.stringify({
      sub: user.id,
      email: user.email,
      email_verified: true,
    });

    const comma = index < users.length - 1 ? "," : "";
    return `  (gen_random_uuid(), '${user.id}', '${user.id}', 'email',
   '${escapeString(identityData)}'::jsonb,
   NOW(), NOW(), NOW())${comma}`;
  });

  lines.push(identityValues.join("\n"));
  lines.push(`ON CONFLICT (provider, provider_id) DO NOTHING;\n`);

  // Update public.users with additional data
  lines.push(generateSection("public.users updates"));
  for (const user of users) {
    lines.push(`UPDATE public.users SET`);
    lines.push(
      `  birth_date = '${user.birthDate}', country = '${user.country}',`
    );
    lines.push(
      `  did = 'did:plc:${user.username.slice(0, 24).padEnd(24, "0")}', pds_status = 'active'`
    );
    lines.push(`WHERE id = '${user.id}';\n`);
  }

  // Update primary alts and insert additional alts
  lines.push(generateSection("public.alts updates and inserts"));
  const altsByUser = new Map<string, GeneratedAlt[]>();
  for (const alt of alts) {
    if (!altsByUser.has(alt.userId)) {
      altsByUser.set(alt.userId, []);
    }
    altsByUser.get(alt.userId)!.push(alt);
  }

  // Update primary alts with bio/tier
  for (const user of users) {
    const userAlts = altsByUser.get(user.id) || [];
    const primaryAlt = userAlts.find((a) => a.isPrimary);
    if (primaryAlt && (primaryAlt.bio || primaryAlt.tier !== "free")) {
      lines.push(`UPDATE public.alts SET`);
      const updates: string[] = [];
      if (primaryAlt.bio) {
        updates.push(`bio = '${escapeString(primaryAlt.bio)}'`);
      }
      if (primaryAlt.tier !== "free") {
        updates.push(`tier = '${primaryAlt.tier}'`);
      }
      lines.push(`  ${updates.join(", ")}`);
      lines.push(`WHERE user_id = '${user.id}';\n`);
    }
  }

  // Insert additional (non-primary) alts
  lines.push(generateSection("Additional alts"));
  const additionalAlts = alts.filter((a) => !a.isPrimary);

  if (additionalAlts.length > 0) {
    // Batch insert additional alts in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < additionalAlts.length; i += chunkSize) {
      const chunk = additionalAlts.slice(i, i + chunkSize);
      lines.push(
        `INSERT INTO public.alts (user_id, username, display_name, bio, tier) VALUES`
      );

      const values = chunk.map((alt, idx) => {
        const bio = alt.bio ? `'${escapeString(alt.bio)}'` : "NULL";
        const comma = idx < chunk.length - 1 ? "," : "";
        return `  ('${alt.userId}', '${escapeString(alt.username)}', '${escapeString(alt.displayName)}', ${bio}, '${alt.tier}')${comma}`;
      });

      lines.push(values.join("\n"));
      lines.push(`ON CONFLICT (username) DO NOTHING;\n`);
    }
  }

  // Grant Site Admin role to admin user
  lines.push(generateSection("Site Admin Role"));
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  site_admin_role_id bigint;`);
  lines.push(`BEGIN`);
  lines.push(
    `  SELECT id INTO site_admin_role_id FROM public.roles WHERE name = 'Site Admin' AND scope = 'site';`
  );
  lines.push(`  IF site_admin_role_id IS NOT NULL THEN`);
  lines.push(`    INSERT INTO public.user_roles (user_id, role_id) VALUES`);
  lines.push(
    `      ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', site_admin_role_id)`
  );
  lines.push(`    ON CONFLICT DO NOTHING;`);
  lines.push(`  END IF;`);
  lines.push(`END $$;\n`);

  return lines.join("\n");
}

/**
 * Generate 04_organizations.sql - Organizations and staff
 */
function generateOrganizationsSql(
  organizations: GeneratedOrganization[],
  orgStaff: GeneratedOrgStaff[]
): string {
  const lines: string[] = [];

  lines.push(
    generateHeader("04_organizations.sql", "Create Organizations and Staff")
  );
  lines.push(`-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING`);
  lines.push(`-- Depends on: 03_users.sql`);
  lines.push(
    `-- =============================================================================\n`
  );

  // Insert organizations
  lines.push(generateSection("Organizations"));
  for (const org of organizations) {
    lines.push(`INSERT INTO public.organizations (`);
    lines.push(
      `  name, slug, description, status, owner_user_id, tier, subscription_tier`
    );
    lines.push(`) VALUES (`);
    lines.push(`  '${escapeString(org.name)}', '${escapeString(org.slug)}',`);
    lines.push(`  '${escapeString(org.description)}',`);
    lines.push(
      `  '${org.status}', '${org.ownerUserId}', '${org.tier}', '${org.subscriptionTier}'`
    );
    lines.push(`) ON CONFLICT (slug) DO NOTHING;\n`);
  }

  // Insert organization staff
  lines.push(generateSection("Organization Staff"));
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  for (const org of organizations) {
    lines.push(`  ${org.slug.replace(/-/g, "_")}_id bigint;`);
  }
  lines.push(`BEGIN`);

  for (const org of organizations) {
    lines.push(
      `  SELECT id INTO ${org.slug.replace(/-/g, "_")}_id FROM public.organizations WHERE slug = '${org.slug}';`
    );
  }

  lines.push(`\n  -- Add staff members`);
  lines.push(
    `  INSERT INTO public.organization_staff (organization_id, user_id) VALUES`
  );

  const staffValues = orgStaff.map((staff, index) => {
    const org = organizations.find((o) => o.id === staff.organizationId)!;
    const comma = index < orgStaff.length - 1 ? "," : "";
    return `    (${org.slug.replace(/-/g, "_")}_id, '${staff.userId}')${comma}`;
  });

  lines.push(staffValues.join("\n"));
  lines.push(`  ON CONFLICT DO NOTHING;`);
  lines.push(`END $$;\n`);

  return lines.join("\n");
}

/**
 * Generate 10_tournaments.sql - Tournaments, phases, and registrations
 */
function generateTournamentsSql(
  tournaments: GeneratedTournament[],
  phases: GeneratedTournamentPhase[],
  registrations: GeneratedTournamentRegistration[],
  organizations: GeneratedOrganization[],
  alts: GeneratedAlt[]
): string {
  const lines: string[] = [];

  lines.push(
    generateHeader(
      "10_tournaments.sql",
      "Create Tournaments, Phases, and Registrations"
    )
  );
  lines.push(`-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING`);
  lines.push(`-- Depends on: 03_users.sql, 04_organizations.sql`);
  lines.push(
    `-- =============================================================================\n`
  );

  lines.push(`DO $$`);
  lines.push(`DECLARE`);

  // Declare org IDs
  for (const org of organizations) {
    lines.push(`  ${org.slug.replace(/-/g, "_")}_id bigint;`);
  }

  // Declare tournament IDs
  for (const t of tournaments.slice(0, 50)) {
    // Limit to first 50 for variable declarations
    lines.push(`  tournament_${t.id}_id bigint;`);
  }

  lines.push(`  tournaments_exist boolean;`);
  lines.push(`BEGIN`);

  // Check if tournaments exist
  lines.push(`  -- Check if tournaments already seeded`);
  lines.push(
    `  SELECT EXISTS(SELECT 1 FROM public.tournaments LIMIT 1) INTO tournaments_exist;`
  );
  lines.push(`  IF tournaments_exist THEN`);
  lines.push(`    RAISE NOTICE 'Tournaments already exist, skipping';`);
  lines.push(`    RETURN;`);
  lines.push(`  END IF;\n`);

  // Get org IDs
  lines.push(`  -- Get organization IDs`);
  for (const org of organizations) {
    lines.push(
      `  SELECT id INTO ${org.slug.replace(/-/g, "_")}_id FROM public.organizations WHERE slug = '${org.slug}';`
    );
  }
  lines.push("");

  // Insert tournaments (in batches)
  const batchSize = 20;
  for (let i = 0; i < tournaments.length; i += batchSize) {
    const batch = tournaments.slice(i, i + batchSize);
    lines.push(`  -- Tournaments batch ${Math.floor(i / batchSize) + 1}`);

    for (const t of batch) {
      const org = organizations.find((o) => o.id === t.organizationId)!;
      lines.push(`  INSERT INTO public.tournaments (`);
      lines.push(
        `    organization_id, name, slug, description, format, status,`
      );
      lines.push(
        `    start_date, end_date, registration_deadline, max_participants,`
      );
      lines.push(
        `    tournament_format, swiss_rounds, round_time_minutes, featured, top_cut_size`
      );
      lines.push(`  ) VALUES (`);
      lines.push(
        `    ${org.slug.replace(/-/g, "_")}_id, '${escapeString(t.name)}', '${escapeString(t.slug)}',`
      );
      lines.push(`    '${escapeString(t.description)}',`);
      lines.push(`    '${t.format}', '${t.status}',`);
      lines.push(
        `    '${t.startDate.toISOString()}'::timestamptz, '${t.endDate.toISOString()}'::timestamptz,`
      );
      lines.push(
        `    '${t.registrationDeadline.toISOString()}'::timestamptz, ${t.maxParticipants},`
      );
      lines.push(
        `    '${t.tournamentFormat}', ${t.swissRounds ?? "NULL"}, ${t.roundTimeMinutes}, ${t.featured}, ${t.topCutSize ?? "NULL"}`
      );

      if (i + batch.indexOf(t) < 50) {
        lines.push(`  ) RETURNING id INTO tournament_${t.id}_id;\n`);
      } else {
        lines.push(`  ) ON CONFLICT (slug) DO NOTHING;\n`);
      }
    }
  }

  // For tournaments beyond the first 50, we need to look up IDs for registrations
  if (tournaments.length > 50) {
    lines.push(
      `  -- Note: Only first 50 tournaments have tracked IDs for registrations`
    );
  }

  lines.push(`\n  RAISE NOTICE 'Created ${tournaments.length} tournaments';`);
  lines.push(`END $$;\n`);

  // Insert tournament phases in a separate block
  // Group phases by tournament for efficient insertion
  lines.push(`-- Tournament Phases`);
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  t_id bigint;`);
  lines.push(`BEGIN`);

  // Group phases by tournament
  const phasesByTournament = new Map<number, GeneratedTournamentPhase[]>();
  for (const phase of phases) {
    if (!phasesByTournament.has(phase.tournamentId)) {
      phasesByTournament.set(phase.tournamentId, []);
    }
    phasesByTournament.get(phase.tournamentId)!.push(phase);
  }

  // Insert phases for each tournament (only completed tournaments need phases for now)
  const completedTournaments = tournaments.filter(
    (t) => t.status === "completed"
  );
  for (const tournament of completedTournaments) {
    const tournamentPhases = phasesByTournament.get(tournament.id) || [];
    if (tournamentPhases.length === 0) continue;

    lines.push(`  -- Phases for: ${tournament.name}`);
    lines.push(
      `  SELECT id INTO t_id FROM public.tournaments WHERE slug = '${escapeString(tournament.slug)}';`
    );
    lines.push(`  IF t_id IS NOT NULL THEN`);

    for (const phase of tournamentPhases) {
      lines.push(`    INSERT INTO public.tournament_phases (`);
      lines.push(`      tournament_id, name, phase_order, phase_type, status,`);
      lines.push(
        `      match_format, round_time_minutes, planned_rounds, current_round,`
      );
      lines.push(`      advancement_count, bracket_size, total_rounds`);
      lines.push(`    ) VALUES (`);
      lines.push(
        `      t_id, '${escapeString(phase.name)}', ${phase.phaseOrder}, '${phase.phaseType}', '${phase.status}',`
      );
      lines.push(
        `      '${phase.matchFormat}', ${phase.roundTimeMinutes}, ${phase.plannedRounds ?? "NULL"}, ${phase.currentRound},`
      );
      lines.push(
        `      ${phase.advancementCount ?? "NULL"}, ${phase.bracketSize ?? "NULL"}, ${phase.totalRounds ?? "NULL"}`
      );
      lines.push(`    ) ON CONFLICT DO NOTHING;`);
    }

    lines.push(`  END IF;\n`);
  }

  lines.push(
    `  RAISE NOTICE 'Created phases for ${completedTournaments.length} completed tournaments';`
  );
  lines.push(`END $$;\n`);

  return lines.join("\n");
}

/**
 * Generate 11_matches.sql - Matches and games
 */
function generateMatchesSql(
  matches: GeneratedMatch[],
  games: GeneratedMatchGame[],
  phases: GeneratedTournamentPhase[],
  tournaments: GeneratedTournament[]
): string {
  const lines: string[] = [];

  lines.push(generateHeader("11_matches.sql", "Create Matches and Games"));
  lines.push(`-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING`);
  lines.push(`-- Depends on: 10_tournaments.sql`);
  lines.push(`-- Generated: ${matches.length} matches, ${games.length} games`);
  lines.push(
    `-- =============================================================================\n`
  );

  lines.push(
    `-- Note: Match generation is complex and requires tournament phase IDs.`
  );
  lines.push(
    `-- This file provides the structure; full match data generation requires`
  );
  lines.push(`-- additional tooling to resolve phase IDs at runtime.\n`);

  lines.push(`DO $$`);
  lines.push(`BEGIN`);
  lines.push(
    `  RAISE NOTICE 'Match seed data: ${matches.length} matches ready for insertion';`
  );
  lines.push(
    `  RAISE NOTICE 'Match games: ${games.length} games ready for insertion';`
  );
  lines.push(`  -- Full match insertion requires phase ID resolution`);
  lines.push(`  -- See match generator for detailed implementation`);
  lines.push(`END $$;\n`);

  // Add sample matches comment
  lines.push(`-- Sample match structure:`);
  if (matches.length > 0) {
    const sample = matches[0]!;
    lines.push(`-- Match ID: ${sample.id}`);
    lines.push(`-- Phase ID: ${sample.phaseId} (requires runtime lookup)`);
    lines.push(`-- Round: ${sample.round}, Table: ${sample.tableNumber}`);
    lines.push(`-- Players: alt ${sample.alt1Id} vs alt ${sample.alt2Id}`);
    lines.push(`-- Winner: alt ${sample.winnerAltId}`);
    lines.push(`-- Score: ${sample.alt1Score}-${sample.alt2Score}`);
  }

  return lines.join("\n");
}

/**
 * Generate 12_standings.sql - Tournament standings
 */
function generateStandingsSql(
  standings: GeneratedStanding[],
  tournaments: GeneratedTournament[]
): string {
  const lines: string[] = [];

  lines.push(generateHeader("12_standings.sql", "Create Tournament Standings"));
  lines.push(`-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING`);
  lines.push(`-- Depends on: 10_tournaments.sql`);
  lines.push(`-- Generated: ${standings.length} standings entries`);
  lines.push(
    `-- =============================================================================\n`
  );

  lines.push(`-- Note: Standings are calculated from match results.`);
  lines.push(
    `-- This file provides a summary; actual standings should be derived from matches.\n`
  );

  lines.push(`DO $$`);
  lines.push(`BEGIN`);
  lines.push(
    `  RAISE NOTICE 'Standing seed data: ${standings.length} entries ready';`
  );

  // Summary by tournament
  const standingsByTournament = new Map<number, GeneratedStanding[]>();
  for (const s of standings) {
    if (!standingsByTournament.has(s.tournamentId)) {
      standingsByTournament.set(s.tournamentId, []);
    }
    standingsByTournament.get(s.tournamentId)!.push(s);
  }

  lines.push(`  -- ${standingsByTournament.size} tournaments with standings`);
  lines.push(`END $$;\n`);

  return lines.join("\n");
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log("🎮 trainers.gg Seed Data Generator\n");

  // Generate all data
  console.log("📊 Generating data...");

  const users = generateUsers();
  console.log(`  ✓ Users: ${users.length}`);

  const alts = generateAlts(users);
  console.log(`  ✓ Alts: ${alts.length}`);

  const organizations = generateOrganizations(users);
  console.log(`  ✓ Organizations: ${organizations.length}`);

  const orgStaff = generateOrgStaff(organizations, users);
  console.log(`  ✓ Organization staff: ${orgStaff.length}`);

  const tournaments = generateTournaments(organizations);
  console.log(`  ✓ Tournaments: ${tournaments.length}`);

  const phases = generateTournamentPhases(tournaments);
  console.log(`  ✓ Tournament phases: ${phases.length}`);

  const registrations = generateTournamentRegistrations(tournaments, alts);
  console.log(`  ✓ Registrations: ${registrations.length}`);

  const { matches, games } = generateMatches(
    tournaments,
    phases,
    registrations
  );
  console.log(`  ✓ Matches: ${matches.length}`);
  console.log(`  ✓ Games: ${games.length}`);

  const standings = generateStandings(
    tournaments,
    phases,
    registrations,
    matches
  );
  console.log(`  ✓ Standings: ${standings.length}`);

  // Generate SQL files
  console.log("\n📝 Generating SQL files...");

  const files = [
    { name: "03_users.sql", content: generateUsersSql(users, alts) },
    {
      name: "04_organizations.sql",
      content: generateOrganizationsSql(organizations, orgStaff),
    },
    {
      name: "10_tournaments.sql",
      content: generateTournamentsSql(
        tournaments,
        phases,
        registrations,
        organizations,
        alts
      ),
    },
    {
      name: "11_matches.sql",
      content: generateMatchesSql(matches, games, phases, tournaments),
    },
    {
      name: "12_standings.sql",
      content: generateStandingsSql(standings, tournaments),
    },
  ];

  for (const file of files) {
    const filePath = join(SEEDS_DIR, file.name);
    writeFileSync(filePath, file.content);
    console.log(`  ✓ ${file.name}`);
  }

  console.log("\n✅ Seed data generation complete!");
  console.log(`\n📁 Output: ${SEEDS_DIR}`);
  console.log("\nTo apply seeds, run: pnpm db:reset");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
