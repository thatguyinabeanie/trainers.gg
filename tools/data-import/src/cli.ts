#!/usr/bin/env node
import { Command } from "commander";
import { existsSync } from "fs";
import { join } from "path";
import { createAdminClient } from "./shared/supabase.js";
import { getLimitlessApiKey } from "./shared/env.js";
import {
  scrapeEvents,
  scrapeRoster,
  scrapeTeams,
  scrapeMatches,
  readEvents,
  readRoster,
  readTeams,
  readMatches,
  readJson,
  DATA_DIR,
  type EventMeta,
} from "./rk9/scrape.js";
import {
  syncEvents,
  importRoster,
  seedSpeciesMap,
  importTeams,
  importMatchResults,
} from "./rk9/import.js";
import { normalizeSpeciesInline } from "./rk9/normalize.js";
import {
  syncTournaments,
  scrapeTournament,
  readTournaments,
  readTournamentData,
} from "./limitless/scrape.js";
import {
  LIMITLESS_TO_FORMAT,
  syncTournamentList,
  importTournament,
} from "./limitless/import.js";
import type { SupabaseClient } from "@supabase/supabase-js";
// =============================================================================
// Helpers
// =============================================================================

async function checkCronGuard(
  supabase: SupabaseClient,
  key: string,
  force: boolean
): Promise<void> {
  const { data } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const enabled = data?.value === true || data?.value === "true";
  if (enabled && !force) {
    console.error(
      `\n❌  ${key} is enabled in site_config — the edge function cron is active.\n` +
        `    Disable it first, or pass --force to override.\n`
    );
    process.exit(1);
  }
}

async function loadSpeciesMap(
  supabase: SupabaseClient
): Promise<Map<string, string>> {
  const { data } = await supabase
    .schema("rk9")
    .from("species_map")
    .select("raw_name, species_slug");
  const map = new Map<string, string>();
  for (const row of data ?? []) map.set(row.raw_name, row.species_slug);
  return map;
}

const today = new Date().toISOString().slice(0, 10);

// =============================================================================
// CLI
// =============================================================================

const program = new Command("data-import")
  .description(
    "trainers.gg data import CLI — scrapes RK9 and Limitless into Supabase"
  )
  .version("0.1.0");

// =============================================================================
// rk9 subcommand group
// =============================================================================

const rk9 = program.command("rk9").description("RK9 data scraping and import");

rk9
  .command("discover")
  .description("Scrape events page → data/rk9/events.json")
  .action(async () => {
    try {
      await scrapeEvents();
    } catch (err) {
      console.error(
        "discover failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });

rk9
  .command("scrape <eventId>")
  .description("Scrape roster + teams + matches for one event")
  .option("-c, --concurrency <n>", "Team scrape concurrency", "3")
  .action(async (eventId: string, opts: { concurrency: string }) => {
    try {
      // Read dateStart from events.json if available — needed for format detection
      let dateStart = "";
      const eventsPath = join(DATA_DIR, "rk9", "events.json");
      if (existsSync(eventsPath)) {
        const events = await readEvents();
        const ev = events.find((e) => e.eventId === eventId);
        if (ev) dateStart = ev.dateStart;
      }

      console.log(`\nScraping ${eventId}...`);
      const { roster } = await scrapeRoster(eventId, dateStart);
      await scrapeTeams(eventId, roster, parseInt(opts.concurrency, 10));
      await scrapeMatches(eventId, roster.length);
      console.log(`\nDone scraping ${eventId}`);
    } catch (err) {
      console.error(
        "scrape failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });

rk9
  .command("import-events")
  .description("Import events from data/rk9/events.json into Supabase")
  .option("-f, --force", "Run even if rk9_backend_auto_import is enabled")
  .action(async (opts: { force?: boolean }) => {
    try {
      const supabase = createAdminClient();
      await checkCronGuard(
        supabase,
        "rk9_backend_auto_import",
        opts.force ?? false
      );
      const events = await readEvents();
      await syncEvents(supabase, events);
      console.log(`Upserted ${events.length} events`);
    } catch (err) {
      console.error(
        "import-events failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });

rk9
  .command("import-event <eventId>")
  .description("Import one event's roster + teams + matches from local files")
  .option("-f, --force", "Run even if rk9_backend_auto_import is enabled")
  .action(async (eventId: string, opts: { force?: boolean }) => {
    try {
      const supabase = createAdminClient();
      await checkCronGuard(
        supabase,
        "rk9_backend_auto_import",
        opts.force ?? false
      );

      // Read format_id from meta.json if present
      const metaPath = join(DATA_DIR, "rk9", eventId, "meta.json");
      let formatId: string | null = null;
      if (existsSync(metaPath)) {
        const meta = await readJson<EventMeta>(metaPath);
        formatId = meta.formatId;
      }

      // Update format_id on the event row if we have it
      if (formatId) {
        await supabase
          .schema("rk9")
          .from("events")
          .update({ format_id: formatId })
          .eq("event_id", eventId);
      }

      console.log(`\nImporting ${eventId}...`);

      // Roster
      const roster = await readRoster(eventId);
      const { playersUpserted, standingsInserted } = await importRoster(
        supabase,
        eventId,
        roster
      );
      console.log(`  Players: ${playersUpserted}, Standings: ${standingsInserted}`);

      // Teams
      const teamsPath = join(DATA_DIR, "rk9", eventId, "teams.json");
      if (existsSync(teamsPath)) {
        const teams = await readTeams(eventId);
        const speciesMap = await loadSpeciesMap(supabase);
        const pokemonCount = await importTeams(supabase, eventId, teams, speciesMap);

        // Seed any new species encountered
        const newSpecies = new Map<string, string>();
        for (const team of teams) {
          for (const mon of team.pokemon) {
            if (mon.speciesRaw && !speciesMap.has(mon.speciesRaw)) {
              newSpecies.set(
                mon.speciesRaw,
                normalizeSpeciesInline(mon.speciesRaw)
              );
            }
          }
        }
        if (newSpecies.size > 0) await seedSpeciesMap(supabase, newSpecies);

        console.log(`  Pokemon: ${pokemonCount}`);
      }

      // Matches
      const matchesPath = join(DATA_DIR, "rk9", eventId, "matches.json");
      if (existsSync(matchesPath)) {
        const pairingsByRound = await readMatches(eventId);
        const { matches, rounds } = await importMatchResults(
          supabase,
          eventId,
          pairingsByRound
        );
        console.log(`  Matches: ${matches} across ${rounds} rounds`);
      }

      // Mark complete
      await supabase
        .schema("rk9")
        .from("events")
        .update({
          import_status: "complete",
          import_error: null,
          has_team_lists: existsSync(
            join(DATA_DIR, "rk9", eventId, "teams.json")
          ),
          imported_at: new Date().toISOString(),
        })
        .eq("event_id", eventId);

      console.log(`\nImport complete for ${eventId}`);
    } catch (err) {
      console.error(
        "import-event failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });

rk9
  .command("do-all")
  .alias("backfill")
  .description("Full pipeline: discover → scrape all pending → import all")
  .option("-f, --force", "Run even if rk9_backend_auto_import is enabled")
  .option("-c, --concurrency <n>", "Team scrape concurrency", "3")
  .action(async (opts: { force?: boolean; concurrency: string }) => {
    try {
      const supabase = createAdminClient();
      await checkCronGuard(
        supabase,
        "rk9_backend_auto_import",
        opts.force ?? false
      );

      // Step 1: Discover
      console.log("\nDiscovering events...");
      const events = await scrapeEvents();

      // Step 2: Find pending events (ended, not complete in DB)
      const { data: completedRows } = await supabase
        .schema("rk9")
        .from("events")
        .select("event_id")
        .eq("import_status", "complete");
      const completed = new Set((completedRows ?? []).map((r) => r.event_id));

      const pending = events.filter((e) => {
        if (completed.has(e.eventId)) return false;
        const endDate = e.dateEnd ?? e.dateStart;
        return endDate <= today;
      });

      console.log(
        `\n${pending.length} events pending (${completed.size} already complete)`
      );

      // Upsert all discovered events first
      await syncEvents(supabase, events);

      const concurrency = parseInt(opts.concurrency, 10);

      for (const event of pending) {
        console.log(`\n── ${event.name} (${event.eventId})`);

        try {
          // Scrape
          const { roster } = await scrapeRoster(event.eventId, event.dateStart);
          await scrapeTeams(event.eventId, roster, concurrency);
          await scrapeMatches(event.eventId, roster.length);

          // Import roster
          const { playersUpserted, standingsInserted } = await importRoster(
            supabase,
            event.eventId,
            roster
          );
          console.log(
            `  Players: ${playersUpserted}, Standings: ${standingsInserted}`
          );

          // Import teams
          const teamsPath = join(DATA_DIR, "rk9", event.eventId, "teams.json");
          if (existsSync(teamsPath)) {
            const teams = await readTeams(event.eventId);
            const speciesMap = await loadSpeciesMap(supabase);
            const pokemonCount = await importTeams(
              supabase,
              event.eventId,
              teams,
              speciesMap
            );

            const newSpecies = new Map<string, string>();
            for (const team of teams) {
              for (const mon of team.pokemon) {
                if (mon.speciesRaw && !speciesMap.has(mon.speciesRaw)) {
                  newSpecies.set(
                    mon.speciesRaw,
                    normalizeSpeciesInline(mon.speciesRaw)
                  );
                }
              }
            }
            if (newSpecies.size > 0) await seedSpeciesMap(supabase, newSpecies);

            console.log(`  Pokemon: ${pokemonCount}`);
          }

          // Import matches
          const matchesPath = join(
            DATA_DIR,
            "rk9",
            event.eventId,
            "matches.json"
          );
          if (existsSync(matchesPath)) {
            const pairingsByRound = await readMatches(event.eventId);
            const { matches, rounds } = await importMatchResults(
              supabase,
              event.eventId,
              pairingsByRound
            );
            console.log(`  Matches: ${matches} across ${rounds} rounds`);
          }

          // Mark complete
          const teamsPath2 = join(
            DATA_DIR,
            "rk9",
            event.eventId,
            "teams.json"
          );
          await supabase
            .schema("rk9")
            .from("events")
            .update({
              import_status: "complete",
              import_error: null,
              has_team_lists: existsSync(teamsPath2),
              imported_at: new Date().toISOString(),
            })
            .eq("event_id", event.eventId);

          console.log(`  Done`);
        } catch (err) {
          console.error(
            `  Failed: ${err instanceof Error ? err.message : err}`
          );
          // Continue to next event — don't abort the whole backfill
        }
      }

      console.log("\nRK9 backfill complete");
    } catch (err) {
      console.error(
        "backfill failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });

// =============================================================================
// limitless subcommand group
// =============================================================================

const limitless = program
  .command("limitless")
  .description("Limitless data scraping and import");

limitless
  .command("sync")
  .description("Fetch tournament list → data/limitless/tournaments.json")
  .action(async () => {
    try {
      const apiKey = getLimitlessApiKey();
      await syncTournaments(apiKey);
    } catch (err) {
      console.error("sync failed:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

limitless
  .command("scrape <id>")
  .description("Scrape one tournament → data/limitless/data/<id>.json")
  .action(async (id: string) => {
    try {
      const apiKey = getLimitlessApiKey();
      await scrapeTournament(id, apiKey);
    } catch (err) {
      console.error("scrape failed:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

limitless
  .command("import <id>")
  .description("Import one tournament from local file into Supabase")
  .option("-f, --force", "Run even if limitless_backend_auto_import is enabled")
  .action(async (id: string, opts: { force?: boolean }) => {
    try {
      const supabase = createAdminClient();
      await checkCronGuard(
        supabase,
        "limitless_backend_auto_import",
        opts.force ?? false
      );

      const data = await readTournamentData(id);
      const rawFormat = data.details.format ?? "";
      const result = await importTournament(supabase, data, rawFormat);
      console.log(
        `Imported ${result.name}: ${result.players} players, ${result.standings} standings, ${result.pokemon} pokemon, ${result.matches} matches`
      );
    } catch (err) {
      console.error("import failed:", err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

limitless
  .command("do-all")
  .alias("backfill")
  .description("sync → scrape all → import all unimported")
  .option("-f, --force", "Run even if limitless_backend_auto_import is enabled")
  .action(async (opts: { force?: boolean }) => {
    try {
      const supabase = createAdminClient();
      await checkCronGuard(
        supabase,
        "limitless_backend_auto_import",
        opts.force ?? false
      );

      const apiKey = getLimitlessApiKey();

      // Step 1: Sync tournament list
      console.log("\nSyncing tournament list...");
      await syncTournamentList(supabase, apiKey);
      const tournaments = await syncTournaments(apiKey);

      // Step 2: Find unimported tournaments with known format mappings
      const { data: alreadyImported } = await supabase
        .schema("limitless")
        .from("tournaments")
        .select("tournament_id")
        .not("data_imported_at", "is", null);
      const imported = new Set(
        (alreadyImported ?? []).map((r) => r.tournament_id)
      );

      const toImport = tournaments.filter(
        (t) =>
          !imported.has(t.id) && LIMITLESS_TO_FORMAT[t.format] !== undefined
      );

      console.log(
        `\n${toImport.length} tournaments to scrape+import (${imported.size} already done)`
      );

      for (const tournament of toImport) {
        console.log(`\n── ${tournament.name} (${tournament.id})`);
        try {
          const data = await scrapeTournament(tournament.id, apiKey);
          const rawFormat = data.details.format ?? tournament.format ?? "";
          const result = await importTournament(supabase, data, rawFormat);
          console.log(
            `  ${result.players} players, ${result.standings} standings, ${result.pokemon} pokemon, ${result.matches} matches`
          );
        } catch (err) {
          console.error(
            `  Failed: ${err instanceof Error ? err.message : err}`
          );
          // Continue to next tournament — don't abort the whole backfill
        }
      }

      console.log("\nLimitless backfill complete");
    } catch (err) {
      console.error(
        "backfill failed:",
        err instanceof Error ? err.message : err
      );
      process.exit(1);
    }
  });

// ===========================================================================
// crons subcommand group — toggle pg_cron auto-import flags in site_config
// ===========================================================================

const CRON_KEYS = ["rk9_backend_auto_import", "limitless_backend_auto_import"] as const;

const crons = program
  .command("crons")
  .description("Manage auto-import cron flags in site_config");

crons
  .command("status")
  .description("Show current values of auto-import flags")
  .action(async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_config")
      .select("key, value")
      .in("key", [...CRON_KEYS]);
    if (error) { console.error(error.message); process.exit(1); }
    for (const key of CRON_KEYS) {
      const row = data?.find((r) => r.key === key);
      const val = row ? String(row.value) : "(not set)";
      console.log(`  ${key}: ${val}`);
    }
  });

crons
  .command("disable")
  .description("Set both auto-import flags to false (safe to run CLI)")
  .action(async () => {
    const supabase = createAdminClient();
    for (const key of CRON_KEYS) {
      const { error } = await supabase
        .from("site_config")
        .update({ value: false })
        .eq("key", key);
      if (error) { console.error(`Failed to update ${key}: ${error.message}`); process.exit(1); }
      console.log(`  ${key} → false`);
    }
    console.log("\nCrons disabled. Run `crons enable` when the CLI import finishes.");
  });

crons
  .command("enable")
  .description("Re-enable both auto-import flags")
  .action(async () => {
    const supabase = createAdminClient();
    for (const key of CRON_KEYS) {
      const { error } = await supabase
        .from("site_config")
        .update({ value: true })
        .eq("key", key);
      if (error) { console.error(`Failed to update ${key}: ${error.message}`); process.exit(1); }
      console.log(`  ${key} → true`);
    }
    console.log("\nCrons re-enabled.");
  });

program.parse(process.argv);
