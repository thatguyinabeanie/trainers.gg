#!/usr/bin/env node
/**
 * Setup Worktree Environment
 *
 * Allocates ports for the current worktree and updates .env.local
 * This script runs before `pnpm dev` to ensure each worktree has unique ports.
 */

import * as fs from "fs";
import * as path from "path";
import {
  loadRegistry,
  saveRegistry,
  getCurrentWorktreePath,
  allocateWorktreePorts,
  allocateSupabasePorts,
  cleanupStaleWorktrees,
  getSupabasePid,
  isSupabaseRunning,
} from "./worktree-registry";

// ANSI color codes
const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function log(message: string) {
  console.log(`${BLUE}[setup-worktree-env]${RESET} ${message}`);
}

function success(message: string) {
  console.log(`${GREEN}[setup-worktree-env]${RESET} ${message}`);
}

function warn(message: string) {
  console.log(`${YELLOW}[setup-worktree-env]${RESET} ${message}`);
}

async function main() {
  try {
    const worktreePath = getCurrentWorktreePath();
    log(`Current worktree: ${worktreePath}`);

    // Load and clean registry
    let registry = loadRegistry();
    const cleaned = cleanupStaleWorktrees(registry);
    if (cleaned) {
      saveRegistry(registry);
      log("Cleaned up stale worktree entries");
    }

    // Check if Supabase is running
    const supabasePid = getSupabasePid();
    const supabaseRunning = isSupabaseRunning(supabasePid);

    // Determine if this worktree should own Supabase
    let isSupabaseOwner = false;
    if (!supabaseRunning) {
      // No Supabase running, this worktree will start it
      isSupabaseOwner = true;
      log(
        "No running Supabase instance detected - this worktree will start it"
      );
    } else if (registry.supabase) {
      // Supabase running, check if we're already the owner
      isSupabaseOwner = registry.supabase.owner === worktreePath;
      if (isSupabaseOwner) {
        log("This worktree owns the running Supabase instance");
      } else {
        log(
          `Detected running Supabase instance (owner: ${registry.supabase.owner})`
        );
      }
    }

    // Allocate Supabase ports (shared across all worktrees)
    const supabasePorts = await allocateSupabasePorts(registry, worktreePath);
    if (supabaseRunning && supabasePid) {
      supabasePorts.pid = supabasePid;
      registry.supabase = supabasePorts;
    }

    // Allocate worktree-specific ports
    const worktreePorts = await allocateWorktreePorts(
      registry,
      worktreePath,
      isSupabaseOwner
    );

    // Save registry
    saveRegistry(registry);

    // Update .env.local
    const envPath = path.join(worktreePath, ".env.local");
    updateEnvFile(envPath, supabasePorts, worktreePorts);

    // Print allocated ports
    console.log("");
    success("Port allocation complete:");
    console.log(`  Next.js:      http://localhost:${worktreePorts.nextjs}`);
    console.log(`  PDS:          http://localhost:${worktreePorts.pds}`);
    console.log(`  Expo:         http://localhost:${worktreePorts.expo}`);
    console.log(
      `  Supabase:     http://localhost:${supabasePorts.ports.api} ${isSupabaseOwner ? "(owner)" : "(shared)"}`
    );
    console.log("");
  } catch (error) {
    console.error(
      `${YELLOW}[setup-worktree-env]${RESET} Error:`,
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

function updateEnvFile(
  envPath: string,
  supabasePorts: Awaited<ReturnType<typeof allocateSupabasePorts>>,
  worktreePorts: Awaited<ReturnType<typeof allocateWorktreePorts>>
) {
  let envContent = "";

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  } else {
    warn(`.env.local not found at ${envPath}, creating new one`);
  }

  // Update Supabase URLs
  const supabaseUrl = `http://127.0.0.1:${supabasePorts.ports.api}`;
  envContent = updateEnvVar(
    envContent,
    "NEXT_PUBLIC_SUPABASE_URL",
    supabaseUrl
  );

  // Update site URL with Next.js port
  const siteUrl = `http://localhost:${worktreePorts.nextjs}`;
  envContent = updateEnvVar(envContent, "NEXT_PUBLIC_SITE_URL", siteUrl);

  // Update PDS port
  const pdsHost = `http://host.docker.internal:${worktreePorts.pds}`;
  envContent = updateEnvVar(envContent, "PDS_HOST", pdsHost);

  // Add port variables for runtime use
  envContent = updateEnvVar(
    envContent,
    "PORT",
    worktreePorts.nextjs.toString()
  );
  envContent = updateEnvVar(
    envContent,
    "PDS_PORT",
    worktreePorts.pds.toString()
  );
  envContent = updateEnvVar(
    envContent,
    "EXPO_PORT",
    worktreePorts.expo.toString()
  );

  fs.writeFileSync(envPath, envContent, "utf8");
  log(`Updated ${envPath}`);
}

function updateEnvVar(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  } else {
    // Add to end of file
    return content.trim() + `\n${key}=${value}\n`;
  }
}

main();
