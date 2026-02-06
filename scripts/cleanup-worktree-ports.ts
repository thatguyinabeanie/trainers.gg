#!/usr/bin/env node
/**
 * Cleanup Worktree Ports
 *
 * Removes stale worktree entries from the port registry.
 * Run this periodically to clean up allocations for deleted worktrees.
 */

import {
  loadRegistry,
  saveRegistry,
  cleanupStaleWorktrees,
} from "./worktree-registry";

// ANSI color codes
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function main() {
  console.log(
    `${YELLOW}[cleanup-ports]${RESET} Cleaning up stale worktree allocations...`
  );

  const registry = loadRegistry();
  const initialCount = Object.keys(registry.worktrees).length;

  const changed = cleanupStaleWorktrees(registry);

  if (changed) {
    saveRegistry(registry);
    const finalCount = Object.keys(registry.worktrees).length;
    const removed = initialCount - finalCount;
    console.log(
      `${GREEN}[cleanup-ports]${RESET} Removed ${removed} stale worktree(s)`
    );

    if (registry.supabase && !registry.supabase.owner) {
      console.log(
        `${YELLOW}[cleanup-ports]${RESET} Supabase ownership cleared (owner worktree deleted)`
      );
      console.log(
        `${YELLOW}[cleanup-ports]${RESET} Next worktree to run 'pnpm dev' will claim ownership`
      );
    }
  } else {
    console.log(`${GREEN}[cleanup-ports]${RESET} No stale worktrees found`);
  }

  // Print current allocations
  const worktreeCount = Object.keys(registry.worktrees).length;
  if (worktreeCount > 0) {
    console.log(
      `\n${GREEN}[cleanup-ports]${RESET} Active worktrees (${worktreeCount}):`
    );
    for (const [path, allocation] of Object.entries(registry.worktrees)) {
      const owner = allocation.isSupabaseOwner ? " (Supabase owner)" : "";
      console.log(`  ${path}${owner}`);
      console.log(
        `    Next.js: ${allocation.nextjs}, PDS: ${allocation.pds}, Expo: ${allocation.expo}`
      );
    }
  }
}

main();
