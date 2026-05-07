/**
 * Tournament Runner — Entry Point
 *
 * CLI runner for executing tournament scenarios against the web UI.
 * Uses Playwright with isolated browser contexts per player.
 *
 * Examples:
 *   npx tsx apps/web/e2e/tournament-runner/run.ts [options]
 *
 * Options:
 *   --scenario <name>    Scenario to run (default: swiss-8)
 *   --headed             Run in headed mode (visible browser)
 *   --slow-mo <ms>       Slow down actions for debugging
 *   --base-url <url>     Base URL (default: http://localhost:3000)
 *   --verbose            Enable verbose logging (default: true)
 *
 * Examples:
 *   pnpm test:tournament
 *   pnpm test:tournament -- --scenario swiss-8-drops --headed
 *   pnpm test:tournament -- --headed --slow-mo 500
 */

import { TournamentOrchestrator } from "./orchestrator";
import type { RunnerOptions, Scenario } from "./types";
import { swiss8 } from "./scenarios/swiss-8";
import { swiss8Drops } from "./scenarios/swiss-8-drops";

// -- Scenario Registry --

const SCENARIOS: Record<string, Scenario> = {
  "swiss-8": swiss8,
  "swiss-8-drops": swiss8Drops,
};

// -- CLI Argument Parsing --

function parseArgs(): { scenario: string; options: RunnerOptions } {
  const args = process.argv.slice(2);
  let scenario = "swiss-8";
  let headed = false;
  let slowMo: number | undefined;
  let baseUrl =
    process.env.PLAYWRIGHT_BASE_URL ??
    process.env.BASE_URL ??
    "http://localhost:3000";
  let verbose = true;
  let allowRemote = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--scenario": {
        const val = args[++i];
        if (!val || val.startsWith("--")) {
          console.error("ERROR: --scenario requires a value (e.g., --scenario swiss-8)");
          process.exit(1);
        }
        scenario = val;
        break;
      }
      case "--headed":
        headed = true;
        break;
      case "--slow-mo": {
        const raw = args[++i];
        if (!raw || raw.startsWith("--")) {
          console.error("ERROR: --slow-mo requires a value (e.g., --slow-mo 250)");
          process.exit(1);
        }
        const parsed = Number(raw);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed !== Math.floor(parsed)) {
          console.error(`Invalid --slow-mo value: "${raw}" (must be a non-negative integer)`);
          process.exit(1);
        }
        slowMo = parsed;
        break;
      }
      case "--base-url": {
        const val = args[++i];
        if (!val || val.startsWith("--")) {
          console.error("ERROR: --base-url requires a value (e.g., --base-url http://localhost:3000)");
          process.exit(1);
        }
        baseUrl = val;
        break;
      }
      case "--verbose":
        verbose = true;
        break;
      case "--quiet":
        verbose = false;
        break;
      case "--allow-remote":
        allowRemote = true;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${args[i]}`);
        printHelp();
        process.exit(1);
    }
  }

  // Safety guard: prevent accidental runs against production
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    console.error(
      `ERROR: Invalid base URL "${baseUrl}".\n` +
        `URL must include the scheme (e.g. http://localhost:3000, not just localhost:3000).`
    );
    process.exit(1);
  }
  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "0.0.0.0";
  if (!isLocal && !allowRemote) {
    console.error(
      `ERROR: Base URL "${baseUrl}" is not localhost.\n` +
        `The tournament runner mutates state (creates tournaments, submits results).\n` +
        `To run against a remote URL, pass --allow-remote explicitly.`
    );
    process.exit(1);
  }

  return {
    scenario,
    options: { headed, slowMo, baseUrl, verbose },
  };
}

function printHelp(): void {
  console.log(`
Tournament Runner — UI-driven tournament simulation

Usage:
  pnpm test:tournament -- [options]

Options:
  --scenario <name>    Scenario to run (default: swiss-8)
                       Available: ${Object.keys(SCENARIOS).join(", ")}
  --headed             Run in headed mode (visible browser)
  --slow-mo <ms>       Slow down each action by N milliseconds
  --base-url <url>     Base URL of the web app (default: http://localhost:3000)
  --allow-remote       Allow running against non-localhost URLs (safety guard)
  --verbose            Enable verbose logging (default)
  --quiet              Suppress log output
  --help, -h           Show this help message

Examples:
  pnpm test:tournament
  pnpm test:tournament -- --scenario swiss-8-drops --headed
  pnpm test:tournament -- --headed --slow-mo 500
  pnpm test:tournament -- --base-url http://localhost:3001
`);
}

// -- Main --

async function main(): Promise<void> {
  const { scenario: scenarioName, options } = parseArgs();

  const scenario = SCENARIOS[scenarioName];
  if (!scenario) {
    console.error(
      `Unknown scenario: "${scenarioName}". Available: ${Object.keys(SCENARIOS).join(", ")}`
    );
    process.exit(1);
  }

  console.log(`
╔════════════════════════════════════════════════╗
║         Tournament Runner                      ║
╠════════════════════════════════════════════════╣
║ Scenario:  ${scenarioName.padEnd(34)}║
║ Players:   ${String(scenario.players.length).padEnd(34)}║
║ Rounds:    ${String(scenario.config.rounds).padEnd(34)}║
║ Format:    ${scenario.config.format.padEnd(34)}║
║ Headed:    ${String(options.headed ?? false).padEnd(34)}║
║ Base URL:  ${options.baseUrl.padEnd(34)}║
╚════════════════════════════════════════════════╝
`);

  const orchestrator = new TournamentOrchestrator(scenario, options);

  const startTime = Date.now();
  try {
    await orchestrator.run();
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nCompleted in ${elapsed}s`);
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`\nFailed after ${elapsed}s:`);
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
