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
import { DEFAULT_TEAM_CONCURRENCY } from "./rk9/http.js";
import { importMatchResults } from "./rk9/import.js";
import {
  syncTournaments,
  scrapeTournament,
  readTournaments,
  readTournamentData,
} from "./limitless/scrape.js";
import {
  syncEvents,
  importEvent,
  seedSpeciesMap,
  loadSpeciesMap,
  collectUniqueSpecies,
  LIMITLESS_TO_FORMAT,
  syncTournamentList,
  importTournament,
  type RK9Pokemon,
} from "@trainers/data-sources";
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
  .description("Scrape events page → data/rk9/events.json and upsert into DB")
  .option("-f, --force", "Run even if rk9_backend_auto_import is enabled")
  .action(async (opts: { force?: boolean }) => {
    try {
      const events = await scrapeEvents();
      const supabase = createAdminClient();
      await checkCronGuard(
        supabase,
        "rk9_backend_auto_import",
        opts.force ?? false
      );
      await syncEvents(supabase, events);
      console.log(`Upserted ${events.length} events into DB`);
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
  .option(
    "-c, --concurrency <n>",
    "Team scrape concurrency",
    String(DEFAULT_TEAM_CONCURRENCY)
  )
  .option("-i, --import", "Import into DB after scraping")
  .option("-f, --force", "Run even if rk9_backend_auto_import is enabled")
  .action(
    async (
      eventId: string,
      opts: { concurrency: string; import?: boolean; force?: boolean }
    ) => {
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
        await scrapeMatches(eventId);
        console.log(`\nDone scraping ${eventId}`);

        if (opts.import) {
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

          if (formatId) {
            await supabase
              .schema("rk9")
              .from("events")
              .update({ format_id: formatId })
              .eq("event_id", eventId);
          }

          console.log(`\nImporting ${eventId}...`);

          const teamsPath = join(DATA_DIR, "rk9", eventId, "teams.json");
          const teamsRecord: Record<string, RK9Pokemon[]> = {};
          if (existsSync(teamsPath)) {
            const teams = await readTeams(eventId);
            for (const team of teams) {
              teamsRecord[team.rosterEntryId] = team.pokemon;
            }
          }

          const speciesMap = await loadSpeciesMap(supabase);
          const result = await importEvent(
            supabase,
            eventId,
            roster,
            teamsRecord,
            speciesMap
          );
          console.log(
            `  Players: ${result.playersUpserted}, Standings: ${result.standingsInserted}`
          );
          if (result.pokemonInserted > 0) {
            console.log(`  Pokemon: ${result.pokemonInserted}`);
          }

          // Seed unmapped species
          const allSpecies = collectUniqueSpecies(teamsRecord);
          const newSpecies = new Map<string, string>();
          for (const [raw, slug] of allSpecies) {
            if (!speciesMap.has(raw)) newSpecies.set(raw, slug);
          }
          if (newSpecies.size > 0) await seedSpeciesMap(supabase, newSpecies);

          const matchesPath = join(DATA_DIR, "rk9", eventId, "matches.json");
          if (existsSync(matchesPath)) {
            const divisionPairings = await readMatches(eventId);
            const { matches, rounds } = await importMatchResults(
              supabase,
              eventId,
              divisionPairings
            );
            console.log(`  Matches: ${matches} across ${rounds} rounds`);
          }
        }
      } catch (err) {
        console.error(
          "scrape failed:",
          err instanceof Error ? err.message : err
        );
        process.exit(1);
      }
    }
  );

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

      const roster = await readRoster(eventId);
      const teamsPath = join(DATA_DIR, "rk9", eventId, "teams.json");
      const teamsRecord: Record<string, RK9Pokemon[]> = {};
      if (existsSync(teamsPath)) {
        const teams = await readTeams(eventId);
        for (const team of teams) {
          teamsRecord[team.rosterEntryId] = team.pokemon;
        }
      }

      const speciesMap = await loadSpeciesMap(supabase);
      const result = await importEvent(
        supabase,
        eventId,
        roster,
        teamsRecord,
        speciesMap
      );
      console.log(
        `  Players: ${result.playersUpserted}, Standings: ${result.standingsInserted}`
      );
      if (result.pokemonInserted > 0) {
        console.log(`  Pokemon: ${result.pokemonInserted}`);
      }

      // Seed unmapped species
      const allSpecies = collectUniqueSpecies(teamsRecord);
      const newSpecies = new Map<string, string>();
      for (const [raw, slug] of allSpecies) {
        if (!speciesMap.has(raw)) newSpecies.set(raw, slug);
      }
      if (newSpecies.size > 0) await seedSpeciesMap(supabase, newSpecies);

      // Matches
      const matchesPath = join(DATA_DIR, "rk9", eventId, "matches.json");
      if (existsSync(matchesPath)) {
        const divisionPairings = await readMatches(eventId);
        const { matches, rounds } = await importMatchResults(
          supabase,
          eventId,
          divisionPairings
        );
        console.log(`  Matches: ${matches} across ${rounds} rounds`);
      }
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
  .option(
    "-c, --concurrency <n>",
    "Team scrape concurrency per event",
    String(DEFAULT_TEAM_CONCURRENCY)
  )
  .option(
    "-e, --event-concurrency <n>",
    "Number of events to process in parallel",
    "3"
  )
  .action(
    async (opts: {
      force?: boolean;
      concurrency: string;
      eventConcurrency: string;
    }) => {
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

        // Step 2: Find events to process
        // Without --force: only events not yet complete
        // With --force: all ended events, including already-complete ones
        const { data: completedRows } = await supabase
          .schema("rk9")
          .from("events")
          .select("event_id")
          .eq("import_status", "complete");
        const completed = new Set((completedRows ?? []).map((r) => r.event_id));

        const pending = events.filter((e) => {
          const endDate = e.dateEnd ?? e.dateStart;
          if (endDate > today) return false;
          if (opts.force) return true;
          return !completed.has(e.eventId);
        });

        console.log(
          opts.force
            ? `\n${pending.length} events to process (--force: includes ${completed.size} already complete)`
            : `\n${pending.length} events pending (${completed.size} already complete)`
        );

        // Upsert all discovered events first
        await syncEvents(supabase, events);

        const teamConcurrency = parseInt(opts.concurrency, 10);
        const eventConcurrency = parseInt(opts.eventConcurrency, 10);

        // Pool pattern: N event workers share a queue index.
        // Each picks the next event, processes it fully, then picks the next.
        let nextIdx = 0;

        async function processEvent(): Promise<void> {
          while (true) {
            const i = nextIdx++;
            if (i >= pending.length) break;
            const event = pending[i]!;
            const tag = `[${event.name}]`;

            console.log(`\n── ${event.name} (${event.eventId})`);

            try {
              // Scrape
              const { roster } = await scrapeRoster(
                event.eventId,
                event.dateStart
              );
              await scrapeTeams(event.eventId, roster, teamConcurrency);
              await scrapeMatches(event.eventId);

              const teamsPath = join(
                DATA_DIR,
                "rk9",
                event.eventId,
                "teams.json"
              );
              const teamsRecord: Record<string, RK9Pokemon[]> = {};
              if (existsSync(teamsPath)) {
                const teams = await readTeams(event.eventId);
                for (const team of teams) {
                  teamsRecord[team.rosterEntryId] = team.pokemon;
                }
              }

              const speciesMap = await loadSpeciesMap(supabase);
              const result = await importEvent(
                supabase,
                event.eventId,
                roster,
                teamsRecord,
                speciesMap
              );
              console.log(
                `${tag} Players: ${result.playersUpserted}, Standings: ${result.standingsInserted}`
              );
              if (result.pokemonInserted > 0) {
                console.log(`${tag} Pokemon: ${result.pokemonInserted}`);
              }

              // Seed unmapped species
              const allSpecies = collectUniqueSpecies(teamsRecord);
              const newSpecies = new Map<string, string>();
              for (const [raw, slug] of allSpecies) {
                if (!speciesMap.has(raw)) newSpecies.set(raw, slug);
              }
              if (newSpecies.size > 0)
                await seedSpeciesMap(supabase, newSpecies);

              // Import matches
              const matchesPath = join(
                DATA_DIR,
                "rk9",
                event.eventId,
                "matches.json"
              );
              if (existsSync(matchesPath)) {
                const divisionPairings = await readMatches(event.eventId);
                const { matches, rounds } = await importMatchResults(
                  supabase,
                  event.eventId,
                  divisionPairings
                );
                console.log(
                  `${tag} Matches: ${matches} across ${rounds} rounds`
                );
              }

              console.log(`${tag} Done`);
            } catch (err) {
              console.error(
                `${tag} Failed: ${err instanceof Error ? err.message : err}`
              );
              // Continue to next event — don't abort the whole backfill
            }
          }
        }

        await Promise.all(
          Array.from(
            { length: Math.min(eventConcurrency, pending.length) },
            processEvent
          )
        );

        console.log("\nRK9 backfill complete");
      } catch (err) {
        console.error(
          "backfill failed:",
          err instanceof Error ? err.message : err
        );
        process.exit(1);
      }
    }
  );

rk9
  .command("backfill-matches")
  .description(
    "Scrape + import matches for all complete events that have no match_results"
  )
  .option("-f, --force", "Run even if rk9_backend_auto_import is enabled")
  .option("--event-id <id>", "Limit to a single event ID")
  .action(async (opts: { force?: boolean; eventId?: string }) => {
    try {
      const supabase = createAdminClient();
      await checkCronGuard(
        supabase,
        "rk9_backend_auto_import",
        opts.force ?? false
      );

      // Find complete events (or the one specified)
      let query = supabase
        .schema("rk9")
        .from("events")
        .select("event_id, name, date_start")
        .eq("import_status", "complete")
        .order("date_start", { ascending: true });

      if (opts.eventId) {
        query = query.eq("event_id", opts.eventId) as typeof query;
      }

      const { data: events, error: eventsErr } = await query;
      if (eventsErr)
        throw new Error(`Events query failed: ${eventsErr.message}`);
      if (!events || events.length === 0) {
        console.log("No complete events found.");
        return;
      }

      // Find which events already have match_results
      const { data: withMatches } = await supabase
        .schema("rk9")
        .from("match_results")
        .select("event_id")
        .in(
          "event_id",
          events.map((e) => e.event_id)
        );

      const hasMatches = new Set((withMatches ?? []).map((r) => r.event_id));
      const toProcess = events.filter((e) => !hasMatches.has(e.event_id));

      console.log(
        `\n${toProcess.length} events missing matches (${hasMatches.size} already have data)`
      );

      for (const event of toProcess) {
        console.log(`\n── ${event.name} (${event.event_id})`);
        try {
          const divisionPairings = await scrapeMatches(event.event_id);
          if (
            divisionPairings.length === 0 ||
            divisionPairings.every((d) => d.rounds.size === 0)
          ) {
            console.log("  No pairings found — skipping");
            continue;
          }
          const { matches, rounds } = await importMatchResults(
            supabase,
            event.event_id,
            divisionPairings
          );
          console.log(`  Imported: ${matches} matches across ${rounds} rounds`);
        } catch (err) {
          console.error(
            `  Failed: ${err instanceof Error ? err.message : err}`
          );
        }
      }

      console.log("\nMatch backfill complete");
    } catch (err) {
      console.error(
        "backfill-matches failed:",
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
  .command("formats")
  .description("List all known Limitless format codes and their Showdown IDs")
  .action(() => {
    console.log("\nLimitless format codes (use with --format):\n");
    const maxLen = Math.max(
      ...Object.keys(LIMITLESS_TO_FORMAT).map((k) => k.length)
    );
    for (const [code, showdownId] of Object.entries(LIMITLESS_TO_FORMAT)) {
      console.log(`  ${code.padEnd(maxLen + 2)}→  ${showdownId}`);
    }
    console.log();
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
  .option(
    "-e, --event-concurrency <n>",
    "Number of tournaments to process in parallel",
    "3"
  )
  .option(
    "--format <codes>",
    "Only process these formats, comma-separated. Accepts Limitless codes (SVG,SVH) or Showdown IDs (gen9vgc2024regg). List known codes with: limitless formats"
  )
  .action(
    async (opts: {
      force?: boolean;
      eventConcurrency: string;
      format?: string;
    }) => {
      try {
        const supabase = createAdminClient();
        await checkCronGuard(
          supabase,
          "limitless_backend_auto_import",
          opts.force ?? false
        );

        const apiKey = getLimitlessApiKey();

        // Parse --format into a set of Limitless codes (normalise Showdown IDs back)
        let formatFilter: Set<string> | null = null;
        if (opts.format) {
          const showdownToCode = new Map(
            Object.entries(LIMITLESS_TO_FORMAT).map(([k, v]) => [v, k])
          );
          formatFilter = new Set(
            opts.format.split(",").map((f) => {
              const trimmed = f.trim();
              // Accept either the raw Limitless code (SVG) or its Showdown ID
              return showdownToCode.get(trimmed) ?? trimmed;
            })
          );
          const unknown = [...formatFilter].filter(
            (c) => !(c in LIMITLESS_TO_FORMAT)
          );
          if (unknown.length > 0) {
            console.error(
              `Unknown format code(s): ${unknown.join(", ")}\nKnown codes: ${Object.keys(LIMITLESS_TO_FORMAT).join(", ")}`
            );
            process.exit(1);
          }
        }

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

        const toImport = tournaments.filter((t) => {
          if (LIMITLESS_TO_FORMAT[t.format] === undefined) return false;
          if (!opts.force && imported.has(t.id)) return false;
          if (formatFilter && !formatFilter.has(t.format)) return false;
          return true;
        });

        const filterDesc = formatFilter
          ? ` (format: ${[...formatFilter].join(",")})`
          : "";
        console.log(
          opts.force
            ? `\n${toImport.length} tournaments to process${filterDesc} (--force: includes already imported)`
            : `\n${toImport.length} tournaments to scrape+import${filterDesc} (${imported.size} already done)`
        );

        const eventConcurrency = parseInt(opts.eventConcurrency, 10);
        let nextIdx = 0;

        async function processTournament(): Promise<void> {
          while (true) {
            const i = nextIdx++;
            if (i >= toImport.length) break;
            const tournament = toImport[i]!;
            const tag = `[${tournament.name}]`;

            console.log(`\n── ${tournament.name} (${tournament.id})`);
            try {
              const data = await scrapeTournament(tournament.id, apiKey);
              const rawFormat = data.details.format ?? tournament.format ?? "";
              const result = await importTournament(supabase, data, rawFormat);
              console.log(
                `${tag} ${result.players} players, ${result.standings} standings, ${result.pokemon} pokemon, ${result.matches} matches`
              );
            } catch (err) {
              console.error(
                `${tag} Failed: ${err instanceof Error ? err.message : err}`
              );
              // Continue to next tournament — don't abort the whole backfill
            }
          }
        }

        await Promise.all(
          Array.from(
            { length: Math.min(eventConcurrency, toImport.length) },
            processTournament
          )
        );

        console.log("\nLimitless backfill complete");
      } catch (err) {
        console.error(
          "backfill failed:",
          err instanceof Error ? err.message : err
        );
        process.exit(1);
      }
    }
  );

// ===========================================================================
// crons subcommand group — toggle pg_cron auto-import flags in site_config
// ===========================================================================

const CRON_KEYS = [
  "rk9_backend_auto_import",
  "limitless_backend_auto_import",
] as const;

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
    if (error) {
      console.error(error.message);
      process.exit(1);
    }
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
      if (error) {
        console.error(`Failed to update ${key}: ${error.message}`);
        process.exit(1);
      }
      console.log(`  ${key} → false`);
    }
    console.log(
      "\nCrons disabled. Run `crons enable` when the CLI import finishes."
    );
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
      if (error) {
        console.error(`Failed to update ${key}: ${error.message}`);
        process.exit(1);
      }
      console.log(`  ${key} → true`);
    }
    console.log("\nCrons re-enabled.");
  });

program.parse(process.argv);
