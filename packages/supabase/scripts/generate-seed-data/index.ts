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

  // Insert tournament registrations
  // Build lookup maps from internal IDs to slugs/usernames
  const tournamentSlugMap = new Map<number, string>();
  for (const t of tournaments) {
    tournamentSlugMap.set(t.id, t.slug);
  }

  const altUsernameMap = new Map<number, string>();
  for (const alt of alts) {
    altUsernameMap.set(alt.id, alt.username);
  }

  lines.push(`-- Tournament Registrations`);
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  registrations_exist boolean;`);
  lines.push(`BEGIN`);
  lines.push(`  -- Check if registrations already exist`);
  lines.push(
    `  SELECT EXISTS(SELECT 1 FROM public.tournament_registrations LIMIT 1) INTO registrations_exist;`
  );
  lines.push(`  IF registrations_exist THEN`);
  lines.push(`    RAISE NOTICE 'Registrations already exist, skipping';`);
  lines.push(`    RETURN;`);
  lines.push(`  END IF;\n`);

  // Batch insert registrations using subqueries to resolve IDs
  // Group by tournament for efficiency
  const regsByTournament = new Map<number, GeneratedTournamentRegistration[]>();
  for (const reg of registrations) {
    if (!regsByTournament.has(reg.tournamentId)) {
      regsByTournament.set(reg.tournamentId, []);
    }
    regsByTournament.get(reg.tournamentId)!.push(reg);
  }

  // Insert in batches per tournament
  const regBatchSize = 100;
  let totalInserted = 0;

  for (const tournament of tournaments) {
    const tournamentRegs = regsByTournament.get(tournament.id) || [];
    if (tournamentRegs.length === 0) continue;

    lines.push(
      `  -- Registrations for: ${tournament.name} (${tournamentRegs.length} players)`
    );

    // Process in batches
    for (let i = 0; i < tournamentRegs.length; i += regBatchSize) {
      const batch = tournamentRegs.slice(i, i + regBatchSize);

      lines.push(`  INSERT INTO public.tournament_registrations (`);
      lines.push(
        `    tournament_id, alt_id, status, registered_at, checked_in_at`
      );
      lines.push(`  )`);

      const values = batch.map((reg) => {
        const altUsername = altUsernameMap.get(reg.altId);
        if (!altUsername) {
          throw new Error(`Alt ID ${reg.altId} not found in alt username map`);
        }

        const checkedInAt = reg.checkedInAt
          ? `'${reg.checkedInAt.toISOString()}'::timestamptz`
          : "NULL::timestamptz";

        return `  SELECT
      t.id,
      a.id,
      '${reg.status}'::registration_status,
      '${reg.registeredAt.toISOString()}'::timestamptz,
      ${checkedInAt}
    FROM public.tournaments t, public.alts a
    WHERE t.slug = '${escapeString(tournament.slug)}'
      AND a.username = '${escapeString(altUsername)}'`;
      });

      lines.push(values.join("\n  UNION ALL\n"));
      lines.push(`  ON CONFLICT DO NOTHING;\n`);

      totalInserted += batch.length;
    }
  }

  lines.push(
    `  RAISE NOTICE 'Created ${registrations.length} tournament registrations';`
  );
  lines.push(`END $$;\n`);

  return lines.join("\n");
}

/**
 * Generate 11_matches.sql - Rounds, Matches, and Games
 *
 * Database structure:
 *   tournament_phases (id, tournament_id, ...)
 *     └── tournament_rounds (id, phase_id, round_number, ...)
 *           └── tournament_matches (id, round_id, alt1_id, alt2_id, ...)
 */
function generateMatchesSql(
  matches: GeneratedMatch[],
  games: GeneratedMatchGame[],
  phases: GeneratedTournamentPhase[],
  tournaments: GeneratedTournament[],
  alts: GeneratedAlt[]
): string {
  const lines: string[] = [];

  lines.push(
    generateHeader("11_matches.sql", "Create Rounds, Matches, and Games")
  );
  lines.push(`-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING`);
  lines.push(`-- Depends on: 10_tournaments.sql`);
  lines.push(`-- Generated: ${matches.length} matches, ${games.length} games`);
  lines.push(
    `-- =============================================================================\n`
  );

  // Build lookup maps
  const tournamentById = new Map<number, GeneratedTournament>();
  for (const t of tournaments) {
    tournamentById.set(t.id, t);
  }

  const phaseById = new Map<number, GeneratedTournamentPhase>();
  for (const p of phases) {
    phaseById.set(p.id, p);
  }

  const altUsernameById = new Map<number, string>();
  for (const a of alts) {
    altUsernameById.set(a.id, a.username);
  }

  // Group matches by phase and round
  const matchesByPhaseAndRound = new Map<string, GeneratedMatch[]>();
  for (const match of matches) {
    const key = `${match.phaseId}-${match.round}`;
    if (!matchesByPhaseAndRound.has(key)) {
      matchesByPhaseAndRound.set(key, []);
    }
    matchesByPhaseAndRound.get(key)!.push(match);
  }

  // Extract unique rounds per phase
  interface RoundInfo {
    phaseId: number;
    roundNumber: number;
    startTime: Date;
    endTime: Date;
  }

  const rounds: RoundInfo[] = [];
  for (const [key, roundMatches] of matchesByPhaseAndRound) {
    const [phaseIdStr, roundStr] = key.split("-");
    const phaseId = parseInt(phaseIdStr!, 10);
    const roundNumber = parseInt(roundStr!, 10);

    // Get round timing from first and last match
    const sortedMatches = roundMatches.sort(
      (a, b) => a.startedAt.getTime() - b.startedAt.getTime()
    );
    const startTime = sortedMatches[0]!.startedAt;
    const endTime = sortedMatches[sortedMatches.length - 1]!.completedAt;

    rounds.push({ phaseId, roundNumber, startTime, endTime });
  }

  // Sort rounds by phase, then round number
  rounds.sort((a, b) => {
    if (a.phaseId !== b.phaseId) return a.phaseId - b.phaseId;
    return a.roundNumber - b.roundNumber;
  });

  // Start the main DO block
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  matches_exist boolean;`);
  lines.push(`  phase_id bigint;`);
  lines.push(`  round_id bigint;`);
  lines.push(`BEGIN`);
  lines.push(`  -- Check if matches already exist`);
  lines.push(
    `  SELECT EXISTS(SELECT 1 FROM public.tournament_matches LIMIT 1) INTO matches_exist;`
  );
  lines.push(`  IF matches_exist THEN`);
  lines.push(`    RAISE NOTICE 'Matches already exist, skipping';`);
  lines.push(`    RETURN;`);
  lines.push(`  END IF;\n`);

  // Group phases by tournament for organized insertion
  const phasesByTournament = new Map<number, GeneratedTournamentPhase[]>();
  for (const phase of phases) {
    if (!phasesByTournament.has(phase.tournamentId)) {
      phasesByTournament.set(phase.tournamentId, []);
    }
    phasesByTournament.get(phase.tournamentId)!.push(phase);
  }

  // Process only completed tournaments (they have phases)
  const completedTournaments = tournaments.filter(
    (t) => t.status === "completed"
  );

  let totalRounds = 0;
  let totalMatches = 0;

  for (const tournament of completedTournaments) {
    const tournamentPhases = phasesByTournament.get(tournament.id) || [];
    if (tournamentPhases.length === 0) continue;

    lines.push(`  -- Tournament: ${tournament.name}`);

    for (const phase of tournamentPhases.sort(
      (a, b) => a.phaseOrder - b.phaseOrder
    )) {
      // Get rounds for this phase
      const phaseRounds = rounds.filter((r) => r.phaseId === phase.id);
      if (phaseRounds.length === 0) continue;

      lines.push(`  -- Phase: ${phase.name}`);
      lines.push(`  SELECT p.id INTO phase_id FROM public.tournament_phases p`);
      lines.push(`    JOIN public.tournaments t ON p.tournament_id = t.id`);
      lines.push(
        `    WHERE t.slug = '${escapeString(tournament.slug)}' AND p.phase_order = ${phase.phaseOrder};`
      );
      lines.push(`  IF phase_id IS NULL THEN`);
      lines.push(
        `    RAISE NOTICE 'Phase not found for ${tournament.slug} order ${phase.phaseOrder}';`
      );
      lines.push(`  ELSE`);

      for (const round of phaseRounds.sort(
        (a, b) => a.roundNumber - b.roundNumber
      )) {
        const roundMatches = matchesByPhaseAndRound.get(
          `${phase.id}-${round.roundNumber}`
        );
        if (!roundMatches || roundMatches.length === 0) continue;

        // Insert round
        lines.push(`    -- Round ${round.roundNumber}`);
        lines.push(`    INSERT INTO public.tournament_rounds (`);
        lines.push(
          `      phase_id, round_number, name, status, start_time, end_time`
        );
        lines.push(`    ) VALUES (`);
        lines.push(
          `      phase_id, ${round.roundNumber}, 'Round ${round.roundNumber}', 'completed'::phase_status,`
        );
        lines.push(
          `      '${round.startTime.toISOString()}'::timestamptz, '${round.endTime.toISOString()}'::timestamptz`
        );
        lines.push(`    ) RETURNING id INTO round_id;`);
        totalRounds++;

        // Insert matches for this round individually to avoid PL/pgSQL variable ambiguity
        for (const match of roundMatches) {
          const alt1Username = altUsernameById.get(match.alt1Id);
          const alt2Username = altUsernameById.get(match.alt2Id);
          const winnerUsername = altUsernameById.get(match.winnerAltId);

          if (!alt1Username || !alt2Username || !winnerUsername) {
            throw new Error(`Alt username not found for match ${match.id}`);
          }

          lines.push(`    INSERT INTO public.tournament_matches (
      round_id, alt1_id, alt2_id, winner_alt_id, game_wins1, game_wins2, status, table_number, start_time, end_time
    ) VALUES (
      round_id,
      (SELECT a1.id FROM public.alts a1 WHERE a1.username = '${escapeString(alt1Username)}'),
      (SELECT a2.id FROM public.alts a2 WHERE a2.username = '${escapeString(alt2Username)}'),
      (SELECT aw.id FROM public.alts aw WHERE aw.username = '${escapeString(winnerUsername)}'),
      ${match.alt1Score},
      ${match.alt2Score},
      'completed'::phase_status,
      ${match.tableNumber},
      '${match.startedAt.toISOString()}'::timestamptz,
      '${match.completedAt.toISOString()}'::timestamptz
    );`);

          totalMatches++;
        }
      }

      lines.push(`  END IF;\n`);
    }
  }

  lines.push(
    `  RAISE NOTICE 'Created ${totalRounds} rounds and ${totalMatches} matches';`
  );
  lines.push(`END $$;\n`);

  return lines.join("\n");
}

/**
 * Generate 12_standings.sql - Tournament standings
 */
function generateStandingsSql(
  standings: GeneratedStanding[],
  tournaments: GeneratedTournament[],
  matches: GeneratedMatch[],
  alts: GeneratedAlt[]
): string {
  const lines: string[] = [];

  lines.push(generateHeader("12_standings.sql", "Create Tournament Standings"));
  lines.push(`-- IDEMPOTENT: Uses ON CONFLICT DO NOTHING`);
  lines.push(`-- Depends on: 11_matches.sql`);
  lines.push(`-- Generated: ${standings.length} standings entries`);
  lines.push(
    `-- =============================================================================\n`
  );

  // Build lookup maps
  const tournamentById = new Map<number, GeneratedTournament>();
  for (const t of tournaments) {
    tournamentById.set(t.id, t);
  }

  const altUsernameById = new Map<number, string>();
  for (const a of alts) {
    altUsernameById.set(a.id, a.username);
  }

  // Get max round per tournament (for round_number field)
  const maxRoundByTournament = new Map<number, number>();
  for (const match of matches) {
    const tournament = tournaments.find((t) =>
      standings.some((s) => s.tournamentId === t.id && s.altId === match.alt1Id)
    );
    if (tournament) {
      const current = maxRoundByTournament.get(tournament.id) || 0;
      if (match.round > current) {
        maxRoundByTournament.set(tournament.id, match.round);
      }
    }
  }

  // Group standings by tournament
  const standingsByTournament = new Map<number, GeneratedStanding[]>();
  for (const s of standings) {
    if (!standingsByTournament.has(s.tournamentId)) {
      standingsByTournament.set(s.tournamentId, []);
    }
    standingsByTournament.get(s.tournamentId)!.push(s);
  }

  // Start the main DO block
  lines.push(`DO $$`);
  lines.push(`DECLARE`);
  lines.push(`  standings_exist boolean;`);
  lines.push(`  t_id bigint;`);
  lines.push(`BEGIN`);
  lines.push(`  -- Check if standings already exist`);
  lines.push(
    `  SELECT EXISTS(SELECT 1 FROM public.tournament_standings LIMIT 1) INTO standings_exist;`
  );
  lines.push(`  IF standings_exist THEN`);
  lines.push(`    RAISE NOTICE 'Standings already exist, skipping';`);
  lines.push(`    RETURN;`);
  lines.push(`  END IF;\n`);

  let totalStandings = 0;

  // Only process completed tournaments
  const completedTournaments = tournaments.filter(
    (t) => t.status === "completed"
  );

  for (const tournament of completedTournaments) {
    const tournamentStandings = standingsByTournament.get(tournament.id);
    if (!tournamentStandings || tournamentStandings.length === 0) continue;

    const finalRound = maxRoundByTournament.get(tournament.id) || 1;

    lines.push(`  -- Tournament: ${tournament.name}`);
    lines.push(`  SELECT t.id INTO t_id FROM public.tournaments t`);
    lines.push(`    WHERE t.slug = '${escapeString(tournament.slug)}';`);
    lines.push(`  IF t_id IS NOT NULL THEN`);

    // Insert standings for this tournament
    for (const standing of tournamentStandings) {
      const altUsername = altUsernameById.get(standing.altId);
      if (!altUsername) continue;

      const totalMatches = standing.wins + standing.losses;
      // numeric(5,4) = max 9.9999, so percentages must be 0.0-1.0 decimals
      const matchWinPct =
        totalMatches > 0
          ? Math.round((standing.wins / totalMatches) * 10000) / 10000
          : 0;
      const totalGames = standing.gameWins + standing.gameLosses;
      const gameWinPct =
        totalGames > 0
          ? Math.round((standing.gameWins / totalGames) * 10000) / 10000
          : 0;
      // Resistance percentage also needs to be 0-1 decimal
      const resistancePct = Math.round(standing.resistancePct * 100) / 10000;

      // Match points: 3 for win, 0 for loss (standard Swiss)
      const matchPoints = standing.wins * 3;

      lines.push(`    INSERT INTO public.tournament_standings (
      tournament_id, alt_id, round_number, match_points, game_wins, game_losses,
      match_win_percentage, game_win_percentage, opponent_match_win_percentage, rank
    ) VALUES (
      t_id,
      (SELECT a.id FROM public.alts a WHERE a.username = '${escapeString(altUsername)}'),
      ${finalRound},
      ${matchPoints},
      ${standing.gameWins},
      ${standing.gameLosses},
      ${matchWinPct},
      ${gameWinPct},
      ${resistancePct},
      ${standing.placement}
    );`);

      totalStandings++;
    }

    lines.push(`  END IF;\n`);
  }

  lines.push(
    `  RAISE NOTICE 'Created ${totalStandings} standings entries for ${completedTournaments.length} tournaments';`
  );
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
      content: generateMatchesSql(matches, games, phases, tournaments, alts),
    },
    {
      name: "12_standings.sql",
      content: generateStandingsSql(standings, tournaments, matches, alts),
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
