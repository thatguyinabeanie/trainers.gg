/**
 * Worktree Port Registry Management
 *
 * Manages port allocations across git worktrees to prevent conflicts
 * when running multiple instances of the application simultaneously.
 */

import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { findAvailablePort, findPortBlock } from "./ports.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SupabaseAllocation {
  owner: string;
  ports: {
    api: number;
    db: number;
    studio: number;
    inbucket: number;
    pooler: number;
    analytics: number;
    edge_functions: number;
    shadow_db: number;
  };
  pid?: number;
  lastStarted: string;
}

export interface WorktreeAllocation {
  nextjs: number;
  pds: number;
  expo: number;
  lastUsed: string;
  isSupabaseOwner: boolean;
}

export interface Registry {
  supabase?: SupabaseAllocation;
  worktrees: Record<string, WorktreeAllocation>;
}

const REGISTRY_PATH = path.join(
  __dirname,
  "..",
  "scripts",
  "worktree-ports.json"
);

/**
 * Load the port registry from disk
 */
export function loadRegistry(): Registry {
  if (!fs.existsSync(REGISTRY_PATH)) {
    return { worktrees: {} };
  }

  try {
    const content = fs.readFileSync(REGISTRY_PATH, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.warn(
      `[worktree-registry] Failed to parse registry, creating new one:`,
      error
    );
    return { worktrees: {} };
  }
}

/**
 * Save the port registry to disk
 */
export function saveRegistry(registry: Registry): void {
  const dir = path.dirname(REGISTRY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), "utf8");
}

/**
 * Get the absolute path to the current worktree
 */
export function getCurrentWorktreePath(): string {
  try {
    // Use git to get the absolute path to the worktree root
    const gitDir = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
    }).trim();
    return gitDir;
  } catch (error) {
    throw new Error(
      `Failed to determine current worktree path: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Check if current directory is a git worktree (not main worktree)
 */
export function isWorktree(): boolean {
  try {
    const gitDir = execFileSync("git", ["rev-parse", "--git-dir"], {
      encoding: "utf8",
    }).trim();
    // If .git is a file (not a directory), we're in a worktree
    const gitPath = path.resolve(gitDir);
    return fs.existsSync(gitPath) && fs.lstatSync(gitPath).isFile();
  } catch (error) {
    return false;
  }
}

/**
 * Check if a worktree path still exists
 */
export function worktreeExists(worktreePath: string): boolean {
  return (
    fs.existsSync(worktreePath) &&
    fs.existsSync(path.join(worktreePath, ".git"))
  );
}

/**
 * Check if Supabase process is still running
 */
export function isSupabaseRunning(pid?: number): boolean {
  if (!pid) return false;

  try {
    // Sending signal 0 checks if process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get the Supabase process PID if running
 */
export function getSupabasePid(): number | undefined {
  try {
    // Try to find Supabase CLI process using pgrep
    const output = execFileSync("pgrep", ["-f", "supabase start"], {
      encoding: "utf8",
    }).trim();
    const lines = output.split("\n").filter((line) => line.trim());
    return lines.length > 0 ? parseInt(lines[0], 10) : undefined;
  } catch (error) {
    // pgrep returns non-zero exit code when no processes found
    return undefined;
  }
}

/**
 * Clean up stale worktree entries from the registry
 */
export function cleanupStaleWorktrees(registry: Registry): boolean {
  let changed = false;
  const worktreePaths = Object.keys(registry.worktrees);

  for (const worktreePath of worktreePaths) {
    if (!worktreeExists(worktreePath)) {
      console.log(
        `[worktree-registry] Removing stale worktree: ${worktreePath}`
      );
      delete registry.worktrees[worktreePath];
      changed = true;

      // If this was the Supabase owner, clear ownership
      if (registry.supabase && registry.supabase.owner === worktreePath) {
        console.log(
          `[worktree-registry] Clearing Supabase ownership (owner worktree deleted)`
        );
        // Keep Supabase entry but clear owner if process is dead
        if (!isSupabaseRunning(registry.supabase.pid)) {
          delete registry.supabase;
          changed = true;
        } else {
          registry.supabase.owner = "";
          changed = true;
        }
      }
    }
  }

  return changed;
}

/**
 * Allocate ports for a new worktree using dynamic port detection
 */
export async function allocateWorktreePorts(
  registry: Registry,
  worktreePath: string,
  isSupabaseOwner: boolean
): Promise<WorktreeAllocation> {
  const existingAllocation = registry.worktrees[worktreePath];
  if (existingAllocation) {
    existingAllocation.lastUsed = new Date().toISOString();
    existingAllocation.isSupabaseOwner = isSupabaseOwner;
    return existingAllocation;
  }

  // Calculate preferred ports based on worktree count (for predictability)
  const worktreeCount = Object.keys(registry.worktrees).length;
  const preferredNextjs = 3000 + worktreeCount * 10;
  const preferredPds = 3100 + worktreeCount * 10;
  const preferredExpo = 8081 + worktreeCount * 10;

  // Find available ports with fallback to next available in range
  const nextjsPort = await findAvailablePort(preferredNextjs, [3000, 3099]);
  const pdsPort = await findAvailablePort(preferredPds, [3100, 3199]);
  const expoPort = await findAvailablePort(preferredExpo, [8080, 8179]);

  if (!nextjsPort || !pdsPort || !expoPort) {
    throw new Error(
      "Failed to allocate ports - no available ports in configured ranges. " +
        "Try running 'pnpm cleanup-ports' to free up stale allocations."
    );
  }

  const allocation: WorktreeAllocation = {
    nextjs: nextjsPort,
    pds: pdsPort,
    expo: expoPort,
    lastUsed: new Date().toISOString(),
    isSupabaseOwner,
  };

  registry.worktrees[worktreePath] = allocation;
  return allocation;
}

/**
 * Allocate Supabase ports (singleton across all worktrees)
 * Uses dynamic port detection with fallback to next available block
 */
export async function allocateSupabasePorts(
  registry: Registry,
  worktreePath: string
): Promise<SupabaseAllocation> {
  // If Supabase already allocated, return existing
  if (registry.supabase) {
    // Update owner if needed
    if (!registry.supabase.owner) {
      registry.supabase.owner = worktreePath;
    }
    return registry.supabase;
  }

  // Try to allocate Supabase ports block (need 8 contiguous ports)
  // Preferred: default Supabase ports starting at 54320
  let portBlock = await findPortBlock(8, 54320);

  if (!portBlock) {
    throw new Error(
      "Failed to allocate Supabase port block - no 8 contiguous ports available. " +
        "Check if Supabase is already running or other services are using these ports."
    );
  }

  // Map the allocated ports to Supabase services
  // Order: shadow_db, api, db, studio, inbucket, analytics, pooler, edge_functions
  const allocation: SupabaseAllocation = {
    owner: worktreePath,
    ports: {
      shadow_db: portBlock[0],
      api: portBlock[1],
      db: portBlock[2],
      studio: portBlock[3],
      inbucket: portBlock[4],
      analytics: portBlock[5],
      pooler: portBlock[6],
      edge_functions: portBlock[7],
    },
    lastStarted: new Date().toISOString(),
  };

  registry.supabase = allocation;
  return allocation;
}
