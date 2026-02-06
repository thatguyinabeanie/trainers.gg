#!/usr/bin/env node
/**
 * Dev Server Wrapper with Port Injection
 *
 * Reads allocated ports from the worktree registry and spawns
 * the dev server with the correct PORT environment variable.
 */

import { spawn } from "child_process";
import { loadRegistry, getCurrentWorktreePath } from "./worktree-registry";

async function main() {
  try {
    const worktreePath = getCurrentWorktreePath();
    const registry = loadRegistry();
    const allocation = registry.worktrees[worktreePath];

    if (!allocation) {
      console.error(
        `[dev-with-ports] No port allocation found for worktree: ${worktreePath}`
      );
      console.error(
        `[dev-with-ports] Run 'pnpm dev:setup' to allocate ports first`
      );
      process.exit(1);
    }

    // Get command from args (everything after node script.js)
    const args = process.argv.slice(2);
    if (args.length === 0) {
      console.error("[dev-with-ports] No command specified");
      process.exit(1);
    }

    // Set PORT environment variable based on service type
    const env = { ...process.env };

    // Detect which service is being started
    if (args.includes("next")) {
      env.PORT = allocation.nextjs.toString();
      console.log(
        `[dev-with-ports] Starting Next.js on port ${allocation.nextjs}`
      );
    } else if (args.includes("expo")) {
      env.EXPO_PORT = allocation.expo.toString();
      console.log(`[dev-with-ports] Starting Expo on port ${allocation.expo}`);
    }

    // Spawn the command
    const child = spawn(args[0], args.slice(1), {
      stdio: "inherit",
      env,
    });

    child.on("exit", (code) => {
      process.exit(code || 0);
    });

    // Forward signals
    process.on("SIGINT", () => child.kill("SIGINT"));
    process.on("SIGTERM", () => child.kill("SIGTERM"));
  } catch (error) {
    console.error(
      "[dev-with-ports] Error:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

main();
